import { ChartData, ChartScales, PluginServiceGlobalRegistration, PluginServiceRegistrationOptions } from "chart.js";
import { Color, ColorScale, ColorScaleOptions } from '@sumaris-net/ngx-components';
import { throws } from "assert";

export interface ChartJsUtilsTresholdLineOptions {
  options?: {
    plugins?: {
      tresholdLine?: TresholdLineOptions,
    }
  }
}

interface TresholdLineOptions {
  color?: string,
  style?: 'solid' | 'dashed',
  width?: number,
  value: number,
  orientation?: 'x' | 'y',
}

export const ChartJsStandardColors = {
  threshold: Color.get('red'),
}

export const ChartJsPluginTresholdLine: PluginServiceRegistrationOptions & PluginServiceGlobalRegistration = {
  id: 'thresholdLine',
  afterDraw: function(chart: Chart) {
    function computeStop(scale: ChartScales, value: number) {
      var res: number;
      var lengthType = scale['id'][0] === 'y' ? 'height' : 'width';
      switch (scale.type) {
        case 'category':
          res = (scale[lengthType] / (scale['maxIndex'] + 1)) * value;
          break;
        case 'linear':
          res = Math.round(scale[lengthType] * (value / scale['max']));
          break;
        default:
          throw new Error(`Scale type ${scale.type} not implemented`);
      }
      return res;
    }
    console.debug(`[${this.constructor.name}.genDummySamplesSets]`, arguments);
    if (chart.options.plugins.tresholdLine === undefined) return;
    if (chart.options.plugins.tresholdLine.value === undefined) {
      console.warn(`[${this.constructor.name}.genDummySamplesSets]: called without value`)
      return
    }

    // NOTE : This is the method parameters
    const param:TresholdLineOptions = {
      color: chart.options.plugins.tresholdLine.color || '#000000',
      style: chart.options.plugins.tresholdLine.style || 'solid',
      width: chart.options.plugins.tresholdLine.width || 3,
      value: chart.options.plugins.tresholdLine.value,
      orientation: chart.options.plugins.tresholdLine.orientation || 'x',
    }

    var scale: ChartScales;
    for (let i in chart['scales']) {
      if (i[0] === param.orientation) scale = chart['scales'][i];
      if (scale) break;
    }
    if (!scale) {
      console.warn(`[${this.constructor.name}.genDummySamplesSets]: no scale found for orientation ${orientation}`)
      return;
    }

    try {
      var stopVal = computeStop(scale, param.value);
    } catch (e) {
      console.warn(`[${this.constructor.name}.genDummySamplesSets]: `, e);
    }
    var xStart = 0;
    var xStop = 0;
    var yStart = 0;
    var yStop = 0;
    if (param.orientation === 'y') {
      yStart = chart.chartArea.bottom - stopVal;
      yStop = yStart;
      xStart = chart.chartArea.left;
      xStop = chart.chartArea.right;
    } else {
      yStart = chart.chartArea.top;
      yStop = chart.chartArea.bottom;
      xStart = chart.chartArea.left + stopVal;
      xStop = xStart;
    }

    // Draw tresholdline
    const ctx = chart.ctx;
    ctx.lineWidth = param.width;
    if (param.style === 'dashed') ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xStop, yStop);
    ctx.strokeStyle = param.color;
    ctx.stroke();
  },
}

export class ChartUtils {

  static genDummySamplesSets(nbSets: number, nbSamples: number, minVal: number, maxVal: number): number[][] {
    console.debug(`[${this.constructor.name}.genDummySamplesSets]`, arguments);
    return Array(nbSets).fill([]).map(_ => {
      return Array(nbSamples).fill(0).map((_) => {
        return Math.floor(minVal + (Math.random() * (maxVal - minVal + 1)));
      });
    });
  }

  static computeCategsFromValuesSet(nbCategs: number, values: number[]): { start: number, stop: number, label: string }[] {
    console.debug(`[${this.constructor.name}.computeCategsFromValuesSet]`, arguments);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diffMaxMin = (max - min);
    const interval = Math.trunc(diffMaxMin / nbCategs);
    return Array(nbCategs).fill(0).map((_, index) => {
      const next = (interval * (index + 1)) + min;
      const start = (next - interval);
      var stop = 0;
      var label = '';
      if ((index + 1) === nbCategs) { // This is the last categorie
        stop = max + 1; // The last categorie must include the max value
        label = `>=${start} - <=${max}`;
      } else {
        stop = next;
        label = `>=${start} - <${stop}`;
      }
      return ({
        start: start,
        stop: stop,
        label: label,
      });
    });
  }

  static computeDatasetForBar(
    labels: { label: string, color: Color }[],
    samples: number[][], nbCategs: number,
    stackMap: number[] = [],
  ): ChartData {
    console.debug(`[${this.constructor.name}.computeDatasetForBar]`, arguments);
    const categs = ChartUtils.computeCategsFromValuesSet(nbCategs, samples.flat());
    // Gen data for chart
    const dataForChart = Array(samples.length).fill({}).map((_, index) => {
      var res = new Map();
      // Gen the map first with categs to get ordered map (smallest to largest)
      categs.forEach(c => res.set(c.label, 0));
      // Count the nb of sample that fit into a given categorie
      samples[index].forEach(s => {
        //NOTE : For the last categ, stop is the max + 1
        const currentCateg = categs.find(c => (s >= c.start && s < c.stop)).label;
        res.set(currentCateg, res.get(currentCateg) + 1);
      });
      return Array.from(res.values());
    });
    return {
      labels: categs.map(c => c.label),
      datasets: dataForChart.map((_d, i) => {
        let res = {
          label: labels[i].label,
          data: dataForChart[i],
          backgroundColor: labels[i].color.rgba(1),
        }
        if (stackMap[i]) res['stack'] = `${stackMap[i]}`;
        return res;
      }),
    };
  }

  static computeDatasetForBubble(labels: { label: string, color: Color }[], samples: number[][][]): ChartData {
    console.debug(`[${this.constructor.name}.computeDatasetForBubble]`, arguments);
    const bubuleRadius = 6;
    return {
      datasets: labels.map((l, i) => {
        return {
          label: l.label,
          backgroundColor: l.color.rgba(1),
          data: samples[i].map(s => { return { x: s[0], y: s[1], r: bubuleRadius } }),
        };
      })
    };
  }

  static computeColorsScaleFromLabels(labels: string[], options?: ColorScaleOptions): { label: string, color: Color }[] {
    const count = labels.length;
    const colorScale = ColorScale.custom(count, { min: 1, max: labels.length, ...options });
    return labels.map((label, index) => {
      return {
        label: label,
        color: colorScale.getLegendAtIndex(index).color,
      }
    })
  }

}
