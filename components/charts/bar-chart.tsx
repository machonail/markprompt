import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { ParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import type { FC } from 'react';
import { useMemo } from 'react';
import colors from 'tailwindcss/colors';

import { formatNumber, intervalData, sampleVisitsData } from '@/lib/utils';
import type { TimeInterval } from '@/types/types';

const LEFT_AXIS_WIDTH = 30;
const BOTTOM_AXIS_HEIGHT = 30;

export type BarChartData = {
  start: number;
  end: number;
  value: number;
};

type FixedBarChartProps = {
  data: BarChartData[];
  isLoading: boolean;
  interval: TimeInterval;
  width?: number;
  height?: number;
  padding?: number;
  noDecorations?: boolean;
  showZero?: boolean;
  countLabel?: string;
};

type ResponsiveBarChartProps = {
  parentWidth: number;
};

type TooltipData = {
  start: number;
  end: number;
  value: number;
};

const FixedBarChart: FC<FixedBarChartProps & ResponsiveBarChartProps> = ({
  data: _data,
  isLoading,
  height,
  interval,
  parentWidth,
  noDecorations,
  showZero,
  padding,
  countLabel,
}) => {
  const leftAxisWidth = noDecorations ? 0 : LEFT_AXIS_WIDTH;
  const bottomAxisHeight = noDecorations ? 0 : BOTTOM_AXIS_HEIGHT;
  const chartWidth = parentWidth - leftAxisWidth;
  const computedHeight = height || parentWidth * 0.5;

  const data = useMemo(() => {
    if (isLoading) {
      return sampleVisitsData;
    }
    return _data;
  }, [_data, isLoading]);

  const xScale = useMemo(() => {
    return scaleBand({
      range: [0, chartWidth],
      domain: data.map((d) => d.start),
      padding: padding || 0.4,
    });
  }, [data, chartWidth, padding]);

  const yScale = useMemo(() => {
    return scaleLinear({
      range: [computedHeight, 0],
      domain: [0, Math.max(...data.map((d) => d.value))],
      nice: true,
      round: true,
    });
  }, [data, computedHeight]);

  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<TooltipData>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    debounce: 100,
  });

  let tooltipTimeout: number | undefined;

  return (
    <figure className="flex" style={{ width: parentWidth }}>
      {!noDecorations && (
        <svg ref={containerRef} height={computedHeight} width={leftAxisWidth}>
          <AxisLeft
            hideAxisLine
            hideTicks
            left={8}
            numTicks={4}
            scale={yScale}
            tickFormat={(d) => formatNumber(d as number)}
            tickLabelProps={() => ({
              fill: colors.neutral['600'],
              fontSize: 12,
              textAnchor: 'start',
              transition: 'all 0.4s ease-in-out',
            })}
          />
        </svg>
      )}
      <svg height={computedHeight + bottomAxisHeight} width="100%">
        {!noDecorations && (
          <>
            <AxisBottom
              hideAxisLine
              hideTicks
              scale={xScale}
              tickFormat={intervalData[interval].format}
              tickLabelProps={() => ({
                fill: colors.neutral['600'],
                fontSize: 12,
                textAnchor: 'middle',
                transition: 'all 0.4s ease-in-out',
              })}
              numTicks={intervalData[interval].numTicks}
              top={computedHeight}
            />
            <GridRows
              numTicks={5}
              scale={yScale}
              stroke={colors.neutral['900']}
              width={chartWidth}
            />
          </>
        )}
        {data.map(({ start, end, value }) => {
          const barWidth = xScale.bandwidth();
          const barHeight =
            computedHeight - (yScale(value || (showZero ? 0.1 : 0)) ?? 0);
          const barX = xScale(start) ?? 0;
          const barY = computedHeight - barHeight;
          return (
            <Bar
              key={`bar-${start}`}
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              className={isLoading ? 'animate-pulse opacity-30' : ''}
              fill={isLoading ? colors.neutral['900'] : colors.sky['400']}
              onMouseLeave={() => {
                tooltipTimeout = window.setTimeout(() => {
                  hideTooltip();
                }, 300);
              }}
              onMouseMove={(event) => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                const eventSvgCoords = localPoint(event) ?? { x: 0, y: 0 };
                const left = barX + barWidth / 2 - 81;
                showTooltip({
                  tooltipData: {
                    start,
                    end,
                    value,
                  },
                  tooltipTop: eventSvgCoords.y - 100,
                  tooltipLeft: left,
                });
              }}
            />
          );
        })}
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          unstyled
          applyPositionStyle
          className="z-50 m-0 rounded-md bg-black px-3 pt-2 pb-3 shadow-2xl"
        >
          <div className="m-0 p-0">
            <h3 className="text-sm text-white">
              <span className="text-lg font-semibold">
                {formatNumber(tooltipData.value)}
              </span>{' '}
              {countLabel}
            </h3>
            <p className="text-xs text-white/50">
              {intervalData[interval].format(tooltipData.start)} -{' '}
              {intervalData[interval].format(tooltipData.end)}
            </p>
          </div>
        </TooltipInPortal>
      )}
    </figure>
  );
};

const BarChart: FC<FixedBarChartProps> = (props) => {
  return (
    <ParentSize debounceTime={20}>
      {(parent) => <FixedBarChart {...props} parentWidth={parent.width} />}
    </ParentSize>
  );
};

export default BarChart;
