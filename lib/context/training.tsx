import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { uniq } from 'lodash-es';
import pLimit from 'p-limit';
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import colors from 'tailwindcss/colors';
import { isPresent } from 'ts-is-present';

import {
  API_ERROR_ID_CONTENT_TOKEN_QUOTA_EXCEEDED,
  FileData,
  GitHubSourceDataType,
  MotifSourceDataType,
  Source,
  WebsiteSourceDataType,
} from '@/types/types';

import { processFile } from '../api';
import emitter, { EVENT_OPEN_PLAN_PICKER_DIALOG } from '../events';
import useProject from '../hooks/use-project';
import useSources from '../hooks/use-sources';
import useTeam from '../hooks/use-team';
import { getMarkpromptPathFromGitHubArchivePath } from '../integrations/github';
import { getGitHubFiles } from '../integrations/github.node';
import {
  getMotifFileContent,
  getMotifPublicFileMetadata,
} from '../integrations/motif';
import {
  extractLinksFromHtml,
  fetchPageContent,
  fetchSitemapUrls,
  isSitemapUrl,
} from '../integrations/website';
import { isCustomPageFetcherEnabled } from '../stripe/tiers';
import {
  completeHrefWithBaseUrl,
  createChecksum,
  getGitHubOwnerRepoString,
  getNameFromUrlOrPath,
  isHrefFromBaseUrl,
  pluralize,
  shouldIncludeFileWithPath,
  toNormalizedOrigin,
  toNormalizedUrl,
  truncate,
} from '../utils';

type IdleState = { state: 'idle' };
type FetchingDataState = { state: 'fetching_data' };
type LoadingState = {
  state: 'loading';
  progress?: number;
  total?: number;
  filename?: string;
  message?: string;
};
type CancelRequestsState = { state: 'cancel_requested' };
type CompleteState = { state: 'complete'; errors: string[] };

export type TrainingState =
  | IdleState
  | FetchingDataState
  | LoadingState
  | CancelRequestsState
  | CompleteState;

export type State = {
  state: TrainingState;
  errors: string[];
  generateEmbeddings: (
    sourceId: Source['id'],
    sourceType: Source['type'],
    numFiles: number,
    getFilePath: (index: number) => string,
    getFileNameContent: (
      index: number,
    ) => Promise<{ name: string; content: string }>,
    onFileProcessed?: () => void,
    forceRetrain?: boolean,
  ) => Promise<void>;
  stopGeneratingEmbeddings: () => void;
  trainAllSources: (
    onFileProcessed: () => void,
    onError: (message: string) => void,
  ) => void;
};

const initialState: State = {
  state: { state: 'idle' },
  errors: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  generateEmbeddings: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  stopGeneratingEmbeddings: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trainAllSources: () => {},
};

export const getTrainingStateMessage = (
  state: TrainingState,
  numFiles?: number,
) => {
  if (state.state === 'loading') {
    return `Processing file ${state.progress} of ${state.total}${
      state.filename ? ` (${truncate(state.filename, 20)})` : ''
    }`;
  } else if (state.state === 'complete') {
    return 'Done processing files';
  } else if (state.state === 'cancel_requested') {
    return 'Stopping processing...';
  }
  if (typeof numFiles !== 'undefined') {
    return `${pluralize(numFiles, 'file', 'files')} added`;
  }
  return '';
};

const TrainingContextProvider = (props: PropsWithChildren) => {
  const supabase = useSupabaseClient();
  const { project, config } = useProject();
  const { sources } = useSources();
  const { team } = useTeam();
  const [state, setState] = useState<TrainingState>({ state: 'idle' });
  const [errors, setErrors] = useState<string[]>([]);
  const stopFlag = useRef(false);
  const useCustomPageFetcher = !!(team && isCustomPageFetcherEnabled(team));

  const _generateEmbeddingForFile = useCallback(
    async (
      index: number,
      checksums: { path: any; checksum: any }[],
      sourceId: Source['id'],
      sourceType: Source['type'],
      numFiles: number,
      getFilePath: (index: number) => string,
      getFileNameContent: (
        index: number,
      ) => Promise<{ name: string; content: string } | undefined>,
      onFileProcessed?: () => void,
    ) => {
      if (stopFlag.current) {
        return;
      }

      // Only pick the metadata, not the full file content, since this
      // could be an expensive operation (GitHub) that might not be
      // needed if the checksums match.
      const path = getFilePath(index);

      if (
        !shouldIncludeFileWithPath(
          path,
          config.include || [],
          config.exclude || [],
          sourceType === 'website',
        )
      ) {
        return;
      }

      setState({
        state: 'loading',
        progress: index + 1,
        total: numFiles,
        filename: path.split('/').slice(-1)[0],
      });

      const prevChecksum = checksums?.find((c) => c.path === path)?.checksum;

      const nameAndContent = await getFileNameContent(index);
      if (!nameAndContent) {
        return;
      }

      const currentChecksum = createChecksum(nameAndContent.content);

      // Check the checksum (or SHA if GitHub file), and skip if equals.
      if (prevChecksum === currentChecksum) {
        console.info('Skipping', path, '(already processed)');
        return;
      }

      console.info('Processing', path);

      const file: FileData = {
        path,
        name: nameAndContent.name,
        content: nameAndContent.content,
      };

      try {
        await processFile(sourceId, file);
      } catch (e: any) {
        if (
          e.status === 403 &&
          e.name === API_ERROR_ID_CONTENT_TOKEN_QUOTA_EXCEEDED
        ) {
          // If this is a quota exceeded error, throw anew in order to
          // stop the batch processing
          toast(
            (t) => (
              <div className="flex w-full flex-row items-center gap-4">
                <p className="p-2">
                  You have reached the quota of indexed content on this plan.
                </p>
                <button
                  className="whitespace-nowrap font-medium"
                  onClick={() => {
                    emitter.emit(EVENT_OPEN_PLAN_PICKER_DIALOG);
                    toast.dismiss(t.id);
                  }}
                  style={{
                    // The .toast class needs to use the "!important"
                    // flag, so we can only overwrite the text color
                    // using a style prop.
                    color: colors.sky['500'],
                  }}
                >
                  Upgrade plan
                </button>
              </div>
            ),
            {
              id: 'training-limit-reached',
              duration: Infinity,
              style: {
                maxWidth: '400px',
                width: '100%',
              },
            },
          );
          onFileProcessed?.();
          setState({ state: 'idle' });
          throw e;
        } else {
          // Otherwise, just show a notification and continue
          console.error(`Error processing ${file.name}: ${JSON.stringify(e)}`);
          toast.error(
            `Error processing file ${nameAndContent.name}: ${JSON.stringify(
              e,
            )}`,
          );
          setErrors((errors) => [
            ...errors,
            `Error processing ${file.name}: ${JSON.stringify(e)}`,
          ]);
        }
      }

      onFileProcessed?.();
    },
    [config.exclude, config.include],
  );

  const generateEmbeddings = useCallback(
    async (
      sourceId: Source['id'],
      sourceType: Source['type'],
      numFiles: number,
      getFilePath: (index: number) => string,
      getFileNameContent: (
        index: number,
      ) => Promise<{ name: string; content: string } | undefined>,
      onFileProcessed?: () => void,
    ) => {
      if (!project?.id) {
        return;
      }

      setErrors([]);
      stopFlag.current = false;

      const { data: checksums } = await supabase
        .from('files')
        .select('path,checksum')
        .eq('source_id', sourceId);

      // TODO: check how much we can do concurrently without hitting
      // rate limitations, in particular the OpenAI limits for
      // training.
      const limit = pLimit(5);

      try {
        await Promise.all(
          Array.from(Array(numFiles).keys()).map((index) => {
            return limit(() =>
              _generateEmbeddingForFile(
                index,
                checksums || [],
                sourceId,
                sourceType,
                numFiles,
                getFilePath,
                getFileNameContent,
                onFileProcessed,
              ),
            );
          }),
        );
      } catch (e) {
        console.error(e);
      }

      setState({ state: 'idle' });
    },
    [project?.id, supabase, _generateEmbeddingForFile],
  );

  const _trainSource = useCallback(
    async (
      source: Source,
      onFileProcessed: () => void,
      onError: (message: string) => void,
    ) => {
      switch (source.type) {
        case 'github': {
          const data = source.data as GitHubSourceDataType;
          try {
            console.info('Fetching GitHub archive for', data.url);
            const fileData = await getGitHubFiles(
              data.url,
              data.branch,
              config.include || [],
              config.exclude || [],
            );
            console.info(
              `Done fetching GitHub archive. Now processing ${fileData.length} files...`,
            );

            await generateEmbeddings(
              source.id,
              'github',
              fileData.length,
              (i) => getMarkpromptPathFromGitHubArchivePath(fileData[i].path),
              async (i) => {
                const name = fileData[i].name;
                const content = fileData[i].content;
                return { name, content };
              },
              () => {
                onFileProcessed();
              },
            );
          } catch (e) {
            const ownerAndRepo = getGitHubOwnerRepoString(data.url);
            onError(`Error processing repo ${ownerAndRepo}: ${e}`);
            break;
          }
          break;
        }
        case 'motif': {
          const data = source.data as MotifSourceDataType;

          try {
            const filesMetadata = await getMotifPublicFileMetadata(
              data.projectDomain,
              config.include || [],
              config.exclude || [],
            );

            await generateEmbeddings(
              source.id,
              'motif',
              filesMetadata.length,
              (i) => filesMetadata[i].path,
              async (i) => {
                const name = filesMetadata[i].name;
                const content = await getMotifFileContent(filesMetadata[i].id);
                return { name, content };
              },
              () => {
                onFileProcessed();
              },
            );
          } catch (e) {
            onError(
              `Error processing Motif project ${data.projectDomain}: ${e}`,
            );
            break;
          }
          break;
        }
        case 'website': {
          const data = source.data as WebsiteSourceDataType;
          const baseUrl = toNormalizedUrl(data.url);
          const origin = toNormalizedOrigin(baseUrl);

          try {
            const generateEmbeddingsForUrls = async (urls: string[]) => {
              const processedContent: string[] = [];
              await generateEmbeddings(
                source.id,
                'website',
                urls.length,
                (i) => urls[i],
                async (i) => {
                  const url = urls[i];
                  const name = getNameFromUrlOrPath(url);
                  const content = await fetchPageContent(
                    url,
                    false,
                    useCustomPageFetcher,
                  );
                  if (!content) {
                    return undefined;
                  }
                  processedContent.push(content);
                  return { name, content };
                },
                () => {
                  onFileProcessed();
                },
              );
              return processedContent;
            };

            if (isSitemapUrl(baseUrl)) {
              const sitemapUrls = await fetchSitemapUrls(
                baseUrl,
                useCustomPageFetcher,
              );
              await generateEmbeddingsForUrls(sitemapUrls.slice(0, 10));
            } else {
              // Otherwise, we discover links starting with the root page
              let processedLinks: string[] = [];
              let linksToProcess = [data.url];

              while (linksToProcess.length > 0) {
                try {
                  const processedContent = await generateEmbeddingsForUrls(
                    linksToProcess,
                  );

                  const discoveredLinks = !processedContent
                    ? []
                    : uniq(
                        processedContent.flatMap((html) =>
                          extractLinksFromHtml(html),
                        ),
                      )
                        .filter((href) => isHrefFromBaseUrl(baseUrl, href))
                        .map((href) => {
                          return completeHrefWithBaseUrl(baseUrl, href);
                        })
                        .filter(isPresent);
                  processedLinks = [...processedLinks, ...linksToProcess];
                  linksToProcess = discoveredLinks.filter(
                    (link) => !processedLinks.includes(link),
                  );
                } catch (e) {
                  break;
                }
              }
            }
          } catch (e) {
            onError(`Error processing website ${origin}: ${e}`);
          }
          break;
        }
        default: {
          // Skip. Note that file sources are trained at upload
          // time, and file content is not stored, so there's nothing
          // to train here in this situation.
          break;
        }
      }
    },
    [config.exclude, config.include, generateEmbeddings, useCustomPageFetcher],
  );

  const trainAllSources = useCallback(
    async (onFileProcessed: () => void, onError: (message: string) => void) => {
      setState({ state: 'fetching_data' });
      for (const source of sources) {
        await _trainSource(source, onFileProcessed, onError);
      }
      setState({ state: 'idle' });
    },
    [sources, _trainSource],
  );

  const stopGeneratingEmbeddings = useCallback(() => {
    stopFlag.current = true;
    setState({ state: 'cancel_requested' });
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        state,
        errors,
        generateEmbeddings,
        stopGeneratingEmbeddings,
        trainAllSources,
      }}
      {...props}
    />
  );
};

export const useTrainingContext = (): State => {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error(
      `useTrainingContext must be used within a TrainingContextProvider`,
    );
  }
  return context;
};

export const TrainingContext = createContext<State>(initialState);

TrainingContext.displayName = 'TrainingContext';

export const ManagedTrainingContext: FC<PropsWithChildren> = ({ children }) => (
  <TrainingContextProvider>{children}</TrainingContextProvider>
);
