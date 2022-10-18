import { ChartData } from "chart.js";
import { Color, ColorScale, ColorScaleOptions } from '@sumaris-net/ngx-components';

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
