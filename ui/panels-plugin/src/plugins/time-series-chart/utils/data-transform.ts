// Copyright 2023 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { YAXisComponentOption } from 'echarts';
import { StepOptions, TimeScale, getCommonTimeScale } from '@perses-dev/core';
import { OPTIMIZED_MODE_SERIES_LIMIT, EChartsTimeSeries, EChartsValues } from '@perses-dev/components';
import { useTimeSeriesQueries, UseDataQueryResults } from '@perses-dev/plugin-system';
import {
  DEFAULT_AREA_OPACITY,
  DEFAULT_CONNECT_NULLS,
  DEFAULT_LINE_WIDTH,
  DEFAULT_POINT_RADIUS,
  DEFAULT_Y_AXIS,
  POSITIVE_MIN_VALUE_MULTIPLIER,
  NEGATIVE_MIN_VALUE_MULTIPLIER,
  VisualOptions,
  YAxisOptions,
} from '../time-series-chart-model';

export type RunningQueriesState = ReturnType<typeof useTimeSeriesQueries>;

export const EMPTY_GRAPH_DATA = {
  timeSeries: [],
  xAxis: [],
  legendItems: [],
};

export const HIDE_DATAPOINTS_LIMIT = 70;

/**
 * Given a list of running queries, calculates a common time scale for use on
 * the x axis (i.e. start/end dates and a step that is divisible into all of
 * the queries' steps).
 */
export function getCommonTimeScaleForQueries(queries: UseDataQueryResults['queryResults']): TimeScale | undefined {
  const seriesData = queries.map((query) => (query.isLoading ? undefined : query.data));
  return getCommonTimeScale(seriesData);
}

/**
 * Gets default ECharts line series option properties
 */
export function getLineSeries(
  formattedName: string,
  data: EChartsTimeSeries['data'],
  visual: VisualOptions,
  paletteColor?: string
): EChartsTimeSeries {
  const lineWidth = visual.line_width ?? DEFAULT_LINE_WIDTH;
  const pointRadius = visual.point_radius ?? DEFAULT_POINT_RADIUS;

  // Shows datapoint symbols when selected time range is roughly 15 minutes or less
  let showPoints = data.length <= HIDE_DATAPOINTS_LIMIT;
  // Allows overriding default behavior and opt-in to always show all symbols (can hurt performance)
  if (visual.show_points === 'Always') {
    showPoints = true;
  }

  return {
    type: 'line',
    name: formattedName,
    data: data,
    connectNulls: visual.connect_nulls ?? DEFAULT_CONNECT_NULLS,
    color: paletteColor,
    stack: visual.stack === 'All' ? visual.stack : undefined,
    sampling: 'lttb',
    progressiveThreshold: OPTIMIZED_MODE_SERIES_LIMIT, // https://echarts.apache.org/en/option.html#series-lines.progressiveThreshold
    showSymbol: showPoints,
    showAllSymbol: true,
    symbolSize: pointRadius,
    // selectedMode: false,
    // triggerLineEvent: true,
    lineStyle: {
      width: lineWidth,
      opacity: 0.9,
    },
    areaStyle: {
      opacity: visual.area_opacity ?? DEFAULT_AREA_OPACITY,
    },
    // https://echarts.apache.org/en/option.html#series-line.emphasis
    emphasis: {
      // focus: 'series',
      focus: 'self',
      blurScope: 'series',
      // disabled: true,
      // disabled: visual.area_opacity !== undefined && visual.area_opacity > 0, // prevents flicker when moving cursor between shaded regions
      lineStyle: {
        width: lineWidth + 10,
        opacity: 1,
      },
    },
    blur: {
      lineStyle: {
        width: 0,
        opacity: 0,
      },
    },
  };
}

/**
 * Gets threshold-specific line series styles
 * markLine cannot be used since it does not update yAxis max / min
 * and threshold data needs to show in the tooltip
 */
export function getThresholdSeries(
  name: string,
  data: EChartsTimeSeries['data'],
  threshold: StepOptions
): EChartsTimeSeries {
  return {
    type: 'line',
    name: name,
    data: data,
    color: threshold.color,
    label: {
      show: false,
    },
    lineStyle: {
      type: 'dashed',
      width: 2,
    },
    emphasis: {
      lineStyle: {
        width: 2.5,
      },
    },
  };
}

/**
 * Converts percent threshold into absolute step value
 * If max is undefined, use the max value from time series data as default
 */
export function convertPercentThreshold(percent: number, data: EChartsTimeSeries[], max?: number, min?: number) {
  const percentDecimal = percent / 100;
  const adjustedMax = max ?? findMax(data);
  const adjustedMin = min ?? 0;
  const total = adjustedMax - adjustedMin;
  return percentDecimal * total + adjustedMin;
}

function findMax(timeSeries: EChartsTimeSeries[]) {
  let max = 0;
  timeSeries.forEach((series) => {
    series.data.forEach((value: EChartsValues) => {
      if (typeof value === 'number' && value > max) {
        max = value;
      }
    });
  });
  return max;
}

/**
 * Converts Perses panel y_axis from dashboard spec to ECharts supported yAxis options
 */
export function convertPanelYAxis(inputAxis: YAxisOptions = {}): YAXisComponentOption {
  const yAxis: YAXisComponentOption = {
    show: inputAxis?.show ?? DEFAULT_Y_AXIS.show,
    min: inputAxis?.min,
    max: inputAxis?.max,
  };

  // Set the y-axis minimum relative to the data
  if (inputAxis?.min === undefined) {
    // https://echarts.apache.org/en/option.html#yAxis.min
    yAxis.min = (value) => {
      if (value.min >= 0 && value.min <= 1) {
        // Helps with PercentDecimal units, or datasets that return 0 or 1 booleans
        return 0;
      }

      // Note: We can tweak the MULTIPLIER constants if we want
      // TODO: Experiment with using a padding that is based on the difference between max value and min value
      if (value.min > 0) {
        return roundDown(value.min * POSITIVE_MIN_VALUE_MULTIPLIER);
      } else {
        return roundDown(value.min * NEGATIVE_MIN_VALUE_MULTIPLIER);
      }
    };
  }

  return yAxis;
}

/**
 * Rounds down to nearest number with one significant digit.
 *
 * Examples:
 * 1. 675 --> 600
 * 2. 0.567 --> 0.5
 * 3. -12 --> -20
 */
export function roundDown(num: number) {
  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const firstDigit = Math.floor(num / Math.pow(10, magnitude));
  return firstDigit * Math.pow(10, magnitude);
}
