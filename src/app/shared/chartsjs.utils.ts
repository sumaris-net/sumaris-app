import { ChartArea, ChartConfiguration, ChartData, ChartDataSets, ChartPoint, ChartScales, PluginServiceGlobalRegistration, PluginServiceRegistrationOptions } from "chart.js";
import { Color, ColorScale, ColorScaleOptions, rgbArrayToHex } from '@sumaris-net/ngx-components';


export interface ChartJsUtilsAutoCategItem {
  label: string,
  start: number,
  stop: number,
}

interface ChartJsUtilsItemHelper {
  label: string,
  color: Color,
  data: number[],
  stack?: string,
}

interface TresholdLineOptions {
  color?: string,
  style?: 'solid' | 'dashed',
  width?: number,
  value: number,
  orientation?: 'x' | 'y',
}
export interface ChartJsUtilsTresholdLineOptions {
  options?: {
    plugins?: {
      tresholdLine?: TresholdLineOptions,
    }
  }
}
export const ChartJsPluginTresholdLine: PluginServiceRegistrationOptions & PluginServiceGlobalRegistration = {
  id: 'thresholdline',
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

    const param: TresholdLineOptions = {
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
    var xStart = 0, xStop = 0, yStart = 0, yStop = 0;
    if (param.orientation === 'y') {
      yStart = yStop = chart.chartArea.bottom - stopVal;
      xStart = chart.chartArea.left;
      xStop = chart.chartArea.right;
    } else {
      yStart = chart.chartArea.top;
      yStop = chart.chartArea.bottom;
      xStart = xStop = chart.chartArea.left + stopVal;
    }

    for (let s in chart['scales']) {
      if (s[0] === param.orientation) scale = chart['scales'][s];
      if (scale) break;
    }
    if (!scale) {
      console.warn(`[${this.constructor.name}.genDummySamplesSets]: no scale found for orientation ${orientation}`)
      return;
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


interface MedianLineOptions {
  color?: string,
  style?: 'solid' | 'dashed',
  width?: number,
  orientation?: 'x' | 'y' | 'b',
}
export interface ChartJsUtilsMediandLineOptions {
  options?: {
    plugins?: {
      medianLine?: MedianLineOptions,
    }
  }
}
export const ChartJsPluginMedianLine: PluginServiceRegistrationOptions & PluginServiceGlobalRegistration = {
  id: 'medianline',
  afterDraw: function(chart: Chart) {

    function getStartSropFromOrientation(
      area: ChartArea,
      scales: { x: ChartScales, y: ChartScales },
      orientation: 'x' | 'y' | 'b'
    ): { start: { x: number, y: number }, stop: { x: number, y: number } } {
      var res = { start: { x: 0, y: 0 }, stop: { x: 0, y: 0 } };
      let median = 0;
      switch (orientation) {
        case 'x':
          median = scales.y['height'] / 2;
          res.start.x = area.left;
          res.start.y = area.top + median;
          res.stop.x = area.right;
          res.stop.y = area.top + median;
          break;
        case 'y':
          median = scales.x['width'] / 2;
          res.start.x = area.left + median;
          res.start.y = area.top;
          res.stop.x = area.left + median;
          res.stop.y = area.bottom;
          break;
        case 'b':
          res.start.x = area.left;
          res.start.y = area.bottom;
          res.stop.x = area.right;
          res.stop.y = area.top;
          break
      }
      return res;
    }

    console.debug(`[${this.constructor.name}.genDummySamplesSets]`, arguments);
    if (chart.options.plugins.medianLine === undefined) return;

    const param: MedianLineOptions = {
      color: chart.options.plugins.medianLine.color || '#000000',
      style: chart.options.plugins.medianLine.style || 'solid',
      width: chart.options.plugins.medianLine.width || 3,
      orientation: chart.options.plugins.medianLine.orientation || 'x',
    }

    // Get the first x and y scale on the chart
    const scales: { x: ChartScales, y: ChartScales } = ((chartScales: ChartScales[]) => {
      var res = { x: undefined, y: undefined };
      for (let scaleId in chartScales) {
        let idFirstChar = scaleId[0]; // be x or y
        if (['x', 'y'].includes(idFirstChar)) res[idFirstChar] = chartScales[scaleId];
        if (res.x && res.y) break;
      }
      return res;
    })(chart['scales'])
    if (Object.entries(scales).find(s => s === undefined)) {
      console.warn(`[${this.constructor.name}.getStartSropFromOrientation] least one scale is undefinded`, scales);
    }

    //Draw median
    const ctx = chart.ctx;
    const lineStartStop = getStartSropFromOrientation(chart.chartArea, scales, param.orientation);
    ctx.lineWidth = param.width;
    if (param.style === 'dashed') ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(lineStartStop.start.x, lineStartStop.start.y);
    ctx.lineTo(lineStartStop.stop.x, lineStartStop.stop.y);
    ctx.strokeStyle = param.color;
    ctx.stroke();
  },
}


export class ChartJsUtils {
  static genDummySamplesSets(nbSets: number, nbSamples: number, minVal: number, maxVal: number): number[][] {
    console.debug(`[${this.constructor.name}.genDummySamplesSets]`, arguments);
    return Array(nbSets).fill([]).map(_ => {
      return Array(nbSamples).fill(0).map((_) => {
        return Math.floor(minVal + (Math.random() * (maxVal - minVal + 1)));
      });
    });
  }

  static genDummySamples(nbSamples: number, minVal: number, maxVal: number): number[] {
    console.debug(`[${this.constructor.name}.genDummySamples]`, arguments);
    return Array(nbSamples).fill(0).map(_ => Math.floor(minVal + (Math.random() * (maxVal - minVal + 1))));
  }

  static genDummySampleFromLabels(labels: string[], min: number, max: number) {
    return labels.map((l,i) => Math.floor(min + (Math.random() * (max - min + 1))));
  }

  static genDummySampleFromLabelsWithWeight(
    labels: string[],
    max: number,
    variation: number,
    treshold: number,
    tresholdWeight: number
  ) {
    return labels.map((l,i) => {
      const factor = i < treshold
        ? (i+1) * (1/treshold) * tresholdWeight
        : (((labels.length-treshold)-(i-treshold)) * (1/(labels.length-treshold))) / tresholdWeight;
      const varFactor = (variation/100) * max;
      const res = (factor*max) + ((Math.random() * varFactor) - (varFactor/2))
      return res > 0 ? res : 0;
    });
  }

  static computeCategsFromMinMax(min: number, max: number, nb: number): ChartJsUtilsAutoCategItem[] {
    console.debug(`[${this.constructor.name}.computeCategsFromMinMax]`, arguments);
    const diff = max - min;
    const interval = Math.trunc(diff / nb);
    return Array(nb).fill(0).map((_, i) => {
      const next = (interval * (i + 1)) + min;
      const start = (next - interval);
      var stop = 0;
      var label = '';
      if ((i + 1) === nb) { // This is the last categorie
        stop = max + 1; // The last categorie must include the max value
        label = `>=${start} - <=${max}`;
      } else {
        stop = next;
        label = `>=${start} - <${stop}`;
      }
      return ({
        label: label,
        start: start,
        stop: stop,
      });
    });
  }

  static computeDataSetIntoCategs(dataset: number[], categories: ChartJsUtilsAutoCategItem[]): number[] {
    return categories.map(c => dataset.filter(d => d >= c.start && d < c.stop).length);
  }

  static computeChartPoints(values: number[][], radius: number = 6): ChartPoint[] {
    return values.map(s => {return {x: s[0], y: s[1], r: radius}});
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

  static getMinMaxOfSetsOfDataSets(setOfDataset: number[][]): { min, max } {
    const flatten = setOfDataset.flat();
    return { min: Math.min(...flatten), max: Math.max(...flatten) };
  }

  static pushLabels(chart: ChartConfiguration, labels: string[]) {
    console.debug(`[${this.constructor.name}.pushDataSetOnChart]`, arguments);
    if (chart.data === undefined) chart.data = {};
    if (chart.data.labels === undefined) chart.data.labels = [];
    chart.data.labels.push(...labels);
  }

  static pushDataSetOnChart(chart: ChartConfiguration, dataset: ChartDataSets) {
    console.debug(`[${this.constructor.name}.pushDataSetOnChart]`, arguments);
    if (chart.data === undefined) chart.data = {};
    if (chart.data.datasets === undefined) chart.data.datasets = [];
    chart.data.datasets.push(dataset);
  }

}

export class ChartJsUtilsColor {

  static getDerivativeColor(color: Color, count: number): Color[] {
    return ColorScale.custom(count, { mainColor: color.rgb })
      .legend.items
      .map(legendItem => legendItem.color);
  }

}


export class ChartJsUtilsBarWithAutoCategHelper {

  private _datasets: ChartJsUtilsItemHelper[] = [];

  constructor(public nbCategs: number) {
    console.debug(`[${this.constructor.name}]`, arguments);
  }

  public addSet(set: ChartJsUtilsItemHelper) {
    console.debug(`[${this.constructor.name}].addSet`, arguments);
    this._datasets.push(set);
  }

  computeDataSetsOnChart(chart: ChartConfiguration) {
    const computedData = this.computeDatasetsIntoCategs();
    if (chart.data === undefined) chart.data = {};
    if (chart.data.labels === undefined) chart.data.labels = [];
    if (chart.data.datasets === undefined) chart.data.datasets = [];
    chart.data.labels = chart.data.labels.concat(computedData.labels);
    chart.data.datasets = chart.data.datasets.concat(computedData.datasets);
  }

  computeDatasetsIntoCategs(): ChartData {
    console.debug(`[${this.constructor.name}].computeDatasetsIntoCategs`, arguments);
    const { min, max } = ChartJsUtils.getMinMaxOfSetsOfDataSets(this._datasets.map(ds => ds.data));
    const categs = ChartJsUtils.computeCategsFromMinMax(min, max, this.nbCategs);
    return {
      labels: categs.map(c => c.label),
      datasets: this._datasets.map(ds => {
        return {
          label: ds.label,
          backgroundColor: ds.color.rgba(1),
          data: ChartJsUtils.computeDataSetIntoCategs(ds.data, categs),
          stack: ds.stack,
        }
      })
    }
  }

}
