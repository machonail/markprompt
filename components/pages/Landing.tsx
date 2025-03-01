import * as Slider from '@radix-ui/react-slider';
import { Application } from '@splinetool/runtime';
import cn from 'classnames';
import Link from 'next/link';
import { FC, useEffect, useState } from 'react';
import Balancer from 'react-wrap-balancer';

import { AngeListIcon } from '@/components/icons/AngelList';
import { CalIcon } from '@/components/icons/Cal';
import { GitHubIcon } from '@/components/icons/GitHub';
import { MarkpromptIcon } from '@/components/icons/Markprompt';
import { ReploIcon } from '@/components/icons/Replo';
import { TwitterIcon } from '@/components/icons/Twitter';
import LandingNavbar from '@/components/layouts/LandingNavbar';
import { Blurs } from '@/components/ui/Blurs';
import Button from '@/components/ui/Button';
import { Pattern } from '@/components/ui/Pattern';
import emitter, { EVENT_OPEN_CONTACT } from '@/lib/events';
import {
  DEFAULT_TIERS,
  PLACEHOLDER_ENTERPRISE_TIER,
  Tier,
} from '@/lib/stripe/tiers';
import { SystemStatus } from '@/types/types';

import StepsSection from './sections/Steps';
import VideoSection from './sections/Video';
import { SharedHead } from './SharedHead';
import { AnalyticsExample } from '../examples/analytics';
import { CernIcon } from '../icons/Cern';
import { DiscordIcon } from '../icons/Discord';
import { ListItem } from '../ui/ListItem';
import { Segment } from '../ui/Segment';
import { SystemStatusButton } from '../ui/SystemStatusButton';
import { Tag } from '../ui/Tag';

const PricingCard = ({
  tier,
  highlight,
  cta,
  ctaHref,
  onCtaClick,
  priceLabel,
}: {
  tier: Tier;
  highlight?: boolean;
  cta: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  priceLabel?: string;
}) => {
  const [showAnnual, setShowAnnual] = useState(true);
  const hasMonthlyOption = !!tier.price?.monthly;

  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center gap-4 rounded-lg bg-neutral-1100 py-12 backdrop-blur',
        {
          'border border-neutral-900 shadow-2xl': !highlight,
          'shadow-box': highlight,
        },
      )}
    >
      {highlight && (
        <div className="absolute inset-0 z-[-1]">
          <div className="glow-border glow-border-fuchsia glow-border-founded-lg absolute inset-0 z-0 rounded-lg" />
        </div>
      )}
      <div className="absolute inset-0 rounded-lg bg-neutral-1100" />
      <h2 className="z-10 flex-none px-4 text-2xl font-semibold text-neutral-300 md:px-6">
        {tier.name}
      </h2>
      <div className="relative z-10 flex h-16 w-full flex-col items-center px-4 md:px-6">
        <p className="mt-0 text-center text-base text-neutral-500">
          {tier.description}
        </p>
        {hasMonthlyOption && (
          <div className="absolute -bottom-2 flex items-center">
            <div>
              <Segment
                size="sm"
                items={['Monthly', 'Yearly']}
                selected={showAnnual ? 1 : 0}
                id="billing-period"
                onChange={(i) => setShowAnnual(i === 1)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="z-10 flex h-20 w-full items-center justify-center bg-neutral-900/0 px-4 sm:h-24 md:px-6">
        <div className="relative -mt-4 flex w-full flex-col items-center">
          <p className="text-[36px] font-semibold text-neutral-300 sm:text-[28px] md:text-[36px]">
            {priceLabel ?? (
              <>
                $
                {tier.price?.[
                  showAnnual || !hasMonthlyOption ? 'yearly' : 'monthly'
                ]?.amount || 0}
                <span className="text-base font-normal text-neutral-500">
                  /month
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="z-10 flex w-full flex-grow flex-col gap-1">
        <ul className="flex w-full flex-col gap-1 px-4 md:px-6">
          {tier.items?.map((item, i) => {
            return (
              <ListItem
                size="sm"
                variant="discreet"
                key={`pricing-${tier.name}-${i}`}
              >
                {item}
              </ListItem>
            );
          })}
        </ul>
      </div>
      <div className="z-10 mt-4 w-full px-4 md:px-6">
        <Button
          className="w-full"
          variant={highlight ? 'fuchsia' : 'plain'}
          href={ctaHref ?? (!onCtaClick ? '/signup' : undefined)}
          onClick={() => {
            onCtaClick?.();
          }}
        >
          {cta}
        </Button>
      </div>
    </div>
  );
};

type LandingPageProps = {
  stars: number;
  status: SystemStatus;
};

const formatNumStars = (stars: number) => {
  if (stars > 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars;
};

const LandingPage: FC<LandingPageProps> = ({ stars, status }) => {
  useEffect(() => {
    const canvas: any = document.getElementById('animation-canvas');
    if (canvas) {
      const app = new Application(canvas);
      app.load('https://prod.spline.design/JjuAUS8iM07Bemju/scene.splinecode');
    }
  }, []);

  return (
    <>
      <SharedHead title="Markprompt | Enterprise-grade ChatGPT for your website and docs" />
      {/* <div className="z-40 bg-fuchsia-700 py-1.5 px-6 sm:px-8">
        <Link
          href="/blog/markprompt-qa"
          className="mx-auto block max-w-screen-xl text-center text-xs font-medium transition hover:opacity-80"
        >
          Read our Q&A with Tom Johnson on the future of docs and how Markprompt
          fits in →
        </Link>
      </div> */}
      <div className="relative z-0 mx-auto min-h-screen max-w-screen-xl px-6 sm:px-8">
        <Pattern />
        <LandingNavbar />
        <div className="animate-slide-up">
          <div className="grid grid-cols-1 gap-8 pb-24 sm:min-h-[calc(100vh-100px)] sm:grid-cols-5">
            <div className="col-span-3 mt-12 flex flex-col justify-center 2xl:mt-0">
              <Link href="/blog/introducing-website-sources">
                <Tag size="base" color="sky">
                  Introducing website sources →
                </Tag>
              </Link>
              <h1 className="gradient-heading mt-6 text-left text-4xl leading-[36px] tracking-[-0.6px] sm:mr-[-50px] sm:text-6xl sm:leading-[64px]">
                <Balancer>
                  Enterprise-grade ChatGPT for your website and docs
                </Balancer>
              </h1>
              <p className="z-20 mt-8 mr-[40px] max-w-screen-md text-left text-base text-neutral-500 sm:mt-4 sm:text-lg">
                <Balancer ratio={0.5}>
                  Connect any source of content, from public websites to private
                  GitHub repos, configure the design and tone, and paste the
                  code to your website. In minutes, you have a chatbot that
                  answers all your customers&apos; questions. If not, you will
                  get notified and can take action.
                </Balancer>
              </p>
              <div className="flex flex-col items-start justify-start gap-4 pt-8 sm:flex-row sm:items-center">
                <Button variant="cta" buttonSize="lg" href="/signup">
                  Start for free
                </Button>
                <div className="hidden sm:block">
                  <Button
                    variant="plain"
                    buttonSize="lg"
                    href="https://github.com/motifland/markprompt"
                    Icon={GitHubIcon}
                  >
                    Star on GitHub
                    <span className="ml-2 text-neutral-600">
                      {formatNumStars(stars)}
                    </span>
                  </Button>
                </div>
              </div>
              <p className="pt-8 text-left text-sm text-neutral-700 sm:pt-8 sm:text-base">
                Live with
              </p>
              <div className="flex flex-row items-center justify-start gap-8 overflow-x-auto pt-4 sm:items-center sm:gap-12 sm:pt-4">
                <AngeListIcon className="mt-1 w-[76px] text-neutral-500 sm:w-[92px]" />
                <CernIcon className="w-[60px] text-neutral-500 sm:w-[72px]" />
                <CalIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
                <ReploIcon className="w-[72px] text-neutral-500 sm:w-[90px]" />
              </div>
            </div>
            <div className="z-0 col-span-2 hidden h-full sm:block">
              <div className="animate-scale-bounce relative ml-[-100px] mt-[5%] block h-[90%] w-[calc(100%+200px)] transform-gpu">
                <canvas id="animation-canvas" />
              </div>
            </div>
          </div>
          {/* <a
            href="https://twitter.com/markprompt"
            className="mx-auto mt-20 flex w-min flex-row items-center gap-2 whitespace-nowrap rounded-full bg-primary-900/20 px-4 py-1 text-sm font-medium text-primary-400 transition hover:bg-primary-900/30"
          >
            <TwitterIcon className="h-4 w-4" />
            Introducing Markprompt
          </a> */}
        </div>
      </div>
      <VideoSection />
      <StepsSection />
      <div className="relative z-0 mx-auto min-h-screen max-w-screen-xl px-6 pt-24 sm:px-8">
        <h2 className="gradient-heading mt-64 text-center text-4xl">
          <Balancer>Track usage, get feedback, improve content</Balancer>
        </h2>
        <p className="mx-auto mt-4 max-w-screen-sm text-center text-lg text-neutral-500">
          Your users will be asking lots of questions, and will be expecting
          quality answers. Use Markprompt&apos;s feedback and analytics features
          to pinpoint shortcomings in your content, and improve your content.
        </p>
        <div className="relative mt-20 h-[600px] w-full overflow-hidden rounded-lg border border-neutral-900">
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-8">
            <p className="flex flex-row items-center whitespace-nowrap rounded-full border border-neutral-800 bg-black/80 px-4 py-2 text-lg font-medium text-neutral-300">
              Coming soon!
            </p>
          </div>
          <div className="sticky inset-x-0 top-0 z-10 flex h-12 flex-none flex-row items-center gap-4 border-b border-neutral-900 px-4 py-2">
            <MarkpromptIcon className="ml-1 h-6 w-6 text-neutral-300" />
            <p className="text-sm text-neutral-500">Acme Inc</p>
          </div>
          <div className="absolute inset-x-0 top-12 bottom-0 z-0 grid w-full flex-grow grid-cols-4">
            <div className="hidden h-full flex-col gap-1 border-r border-neutral-900 px-3 py-3 text-sm text-neutral-500 sm:flex">
              <p className="rounded bg-neutral-900/50 px-2 py-1.5 text-white">
                Home
              </p>
              <p className="px-2 py-1.5">API Keys</p>
              <p className="px-2 py-1.5">Usage</p>
              <p className="px-2 py-1.5">Settings</p>
            </div>
            <div className="z-20 col-span-4 flex flex-col gap-6 p-8 sm:col-span-3">
              <AnalyticsExample />
            </div>
          </div>
        </div>
        <div className="relative flex flex-col items-center">
          <h2
            id="pricing"
            className="gradient-heading mt-40 pt-8 text-center text-4xl"
          >
            <Balancer>Simple pricing that scales as you grow</Balancer>
          </h2>
          <p className="mx-auto mt-4 max-w-screen-sm text-center text-lg text-neutral-500">
            Start for free, no credit card required.
          </p>
          {/* <div className="relative mt-8">
            <Segment
              items={modelNames}
              selected={model === 'gpt-4' ? 1 : model === 'byo' ? 2 : 0}
              id="billing-period"
              onChange={(i) =>
                setModel(i === 0 ? 'gpt-3.5-turbo' : i === 1 ? 'gpt-4' : 'byo')
              }
            />
            <p
              className={cn(
                'absolute inset-x-0 -bottom-8 mt-4 transform text-center text-xs text-neutral-600 transition duration-500',
                {
                  'translate-y-0 opacity-100': model === 'byo',
                  'translate-y-1 opacity-0': model !== 'byo',
                },
              )}
            >
              * BYO: Bring your own API key
            </p>
          </div> */}
          <div className="relative mt-16 grid w-full max-w-screen-xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            <Blurs />
            <PricingCard
              tier={DEFAULT_TIERS.find((t) => t.id === 'hobby')!}
              cta="Get started with Hobby"
              priceLabel="Free"
            />
            <PricingCard
              tier={DEFAULT_TIERS.find((t) => t.id === 'starter')!}
              cta="Get started with Starter"
            />
            <PricingCard
              tier={DEFAULT_TIERS.find((t) => t.id === 'pro')!}
              highlight
              cta="Get started with Pro"
            />
            <PricingCard
              tier={PLACEHOLDER_ENTERPRISE_TIER}
              cta="Contact Sales"
              onCtaClick={() => {
                emitter.emit(EVENT_OPEN_CONTACT);
              }}
              priceLabel="Custom"
            />
          </div>
          <p className="mt-12 rounded-lg border border-neutral-900 px-6 py-4 text-center text-sm text-neutral-500">
            * 1 token ≈ ¾ words. 1 document ≈ 1200 tokens.{' '}
            <Link className="subtle-underline" href="/docs#what-are-tokens">
              Learn more
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="gradient-heading mt-40 text-center text-4xl">
            Open source
          </h2>
          <p className="mx-auto mt-4 max-w-md text-center text-lg text-neutral-500">
            <Balancer>
              The source code is on GitHub, for you to review, run, and
              contribute to if you like!
            </Balancer>
          </p>
          <div className="mt-12">
            <Button
              variant="plain"
              buttonSize="lg"
              href="https://github.com/motifland/markprompt"
              Icon={GitHubIcon}
            >
              Star on GitHub
              <span className="ml-2 text-neutral-600">
                {formatNumStars(stars)}
              </span>
            </Button>
          </div>
        </div>
        <div className="mt-48 grid grid-cols-1 items-center gap-8 border-t border-neutral-900/50 px-6 pt-12 pb-20 sm:grid-cols-2 sm:py-12 sm:px-8 lg:grid-cols-3">
          <div className="flex flex-row items-center justify-center gap-6 text-sm text-neutral-500 md:justify-start">
            <SystemStatusButton status={status} />
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
          </div>
          <div className="hidden flex-row items-baseline justify-center gap-1 text-center text-sm text-neutral-500 lg:flex"></div>
          <div className="mr-0 flex flex-row items-center justify-center gap-4 text-neutral-700 sm:mr-8 sm:justify-end md:mr-12 xl:mr-0">
            <a
              className="transition hover:text-neutral-500"
              href="https://github.com/motifland/markprompt"
              aria-label="Markprompt on GitHub"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
            <a
              className="transition hover:text-neutral-500"
              href="https://twitter.com/markprompt"
              aria-label="Markprompt on Twitter"
            >
              <TwitterIcon className="h-5 w-5" />
            </a>
            <a
              className="transition hover:text-neutral-500"
              href="https://discord.gg/MBMh4apz6X"
              aria-label="Markprompt on Discord"
            >
              <DiscordIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;
