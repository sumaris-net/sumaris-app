import { BarController, BarElement, CategoryScale, Chart, DoughnutController, LinearScale, LineController, LineElement, LogarithmicScale, PointElement, Title, } from 'chart.js';
import { ColorScale, isNil } from '@sumaris-net/ngx-components';
import chartTrendline from 'chartjs-plugin-trendline';
import { BoxAndWiskers, BoxPlotController } from '@sgratzl/chartjs-chart-boxplot';
export const ChartJsPluginThresholdLine = {
    id: 'thresholdline',
    afterDraw(chart) {
        function computeStop(scale, value) {
            var _a;
            if (!scale || isNil(value))
                throw new Error(`Missing required argument 'scale' or 'value'`);
            const lengthType = ((_a = scale['id']) === null || _a === void 0 ? void 0 : _a[0]) === 'y' ? 'height' : 'width';
            if (isNil(scale[lengthType]))
                throw new Error(`Missing 'scale.${lengthType}'!`);
            switch (scale.type) {
                case 'category':
                    if (isNil(scale['maxIndex']))
                        throw new Error(`Missing 'scale.maxIndex'!`);
                    return (scale[lengthType] / (scale['maxIndex'] + 1)) * value;
                case 'linear':
                    if (isNil(scale['max']))
                        throw new Error(`Missing 'scale.max'!`);
                    return Math.round(scale[lengthType] * (value / scale['max']));
                default:
                    throw new Error(`Scale type ${scale.type} not implemented`);
            }
        }
        // DEBUG
        //console.debug(`[ChartJsPluginTresholdLine]`, arguments);
        if (chart.options.plugins.thresholdLine === undefined)
            return;
        if (chart.options.plugins.thresholdLine.value === undefined) {
            console.warn(`[ChartJsPluginThresholdLine] called without value`);
            return;
        }
        const param = {
            color: chart.options.plugins.thresholdLine.color || '#000000',
            style: chart.options.plugins.thresholdLine.style || 'solid',
            width: chart.options.plugins.thresholdLine.width || 3,
            value: chart.options.plugins.thresholdLine.value,
            orientation: chart.options.plugins.thresholdLine.orientation || 'x',
        };
        let scale;
        for (const i in chart['scales']) {
            if (i[0] === param.orientation)
                scale = chart['scales'][i];
            if (scale)
                break;
        }
        if (!scale) {
            console.warn(`[ChartJsPluginThresholdLine] no scale found for orientation ${orientation}`);
            return;
        }
        let stopVal;
        try {
            stopVal = computeStop(scale, param.value);
        }
        catch (e) {
            console.error('Error while trying to compute the stopVal: ' + (e === null || e === void 0 ? void 0 : e.message), e);
            return;
        }
        let xStart = 0;
        let xStop = 0;
        let yStart = 0;
        let yStop = 0;
        if (param.orientation === 'y') {
            yStart = yStop = chart.chartArea.bottom - stopVal;
            xStart = chart.chartArea.left;
            xStop = chart.chartArea.right;
        }
        else {
            yStart = chart.chartArea.top;
            yStop = chart.chartArea.bottom;
            xStart = xStop = chart.chartArea.left + stopVal;
        }
        for (const s in chart['scales']) {
            if (s[0] === param.orientation)
                scale = chart['scales'][s];
            if (scale)
                break;
        }
        if (!scale) {
            console.warn(`[ChartJsPluginThresholdLine] no scale found for orientation ${orientation}`);
            return;
        }
        // Draw thresholdLine
        const ctx = chart.ctx;
        ctx.lineWidth = param.width;
        if (param.style === 'dashed')
            ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xStop, yStop);
        ctx.strokeStyle = param.color;
        ctx.stroke();
    },
};
export const ChartJsPluginMedianLine = {
    id: 'medianline',
    afterDraw(chart) {
        function getStartStopFromOrientation(area, scales, orientation) {
            const res = { start: { x: 0, y: 0 }, stop: { x: 0, y: 0 } };
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
                    break;
            }
            return res;
        }
        // DEBUG
        //console.debug(`[ChartJsPluginMedianLine.getStartSropFromOrientation]`, arguments);
        if (chart.options.plugins.medianLine === undefined)
            return;
        const param = {
            color: chart.options.plugins.medianLine.color || '#000000',
            style: chart.options.plugins.medianLine.style || 'solid',
            width: chart.options.plugins.medianLine.width || 3,
            orientation: chart.options.plugins.medianLine.orientation || 'x',
        };
        // Get the first x and y scale on the chart
        const scales = ((scales) => {
            const { x, y } = scales;
            return { x, y };
        })(chart['scales']);
        if (Object.entries(scales).find(s => s === undefined)) {
            console.warn(`[ChartJsPluginMedianLine.getStartStopFromOrientation] least one scale (x,y) is undefined`, scales);
        }
        // Draw median
        const ctx = chart.ctx;
        const lineStartStop = getStartStopFromOrientation(chart.chartArea, scales, param.orientation);
        ctx.lineWidth = param.width;
        if (param.style === 'dashed')
            ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(lineStartStop.start.x, lineStartStop.start.y);
        ctx.lineTo(lineStartStop.stop.x, lineStartStop.stop.y);
        ctx.strokeStyle = param.color;
        ctx.stroke();
    },
};
export class ChartJsUtils {
    static register() {
        this.registerCommons();
        this.registerPlugins();
    }
    static registerCommons() {
        if (this._commonsRegistered)
            return; // Skip
        Chart.register(LineController, LineElement, PointElement, BarElement, BarController, DoughnutController, Title, LinearScale, LogarithmicScale, CategoryScale);
        this._commonsRegistered = true;
    }
    static registerPlugins() {
        if (this._pluginsRegistered)
            return; // Skip
        Chart.register(chartTrendline);
        Chart.register(ChartJsPluginThresholdLine);
        Chart.register(ChartJsPluginMedianLine);
        // Box plot (see https://github.com/sgratzl/chartjs-chart-boxplot)
        Chart.register(BoxPlotController, BoxAndWiskers);
        this._pluginsRegistered = true;
    }
    static computeChartPoints(values, radius = 6) {
        return values.map(s => ({ x: s[0], y: s[1], r: radius }));
    }
    static computeColorsScaleFromLabels(labels, options) {
        const count = labels.length;
        const colorScale = ColorScale.custom(count, Object.assign({ min: 1, max: labels.length }, options));
        return labels.map((label, index) => ({
            label,
            color: colorScale.getLegendAtIndex(index).color,
        }));
    }
    static getMinMaxOfSetsOfDataSets(setOfDataset) {
        const flatten = setOfDataset.flat();
        return { min: Math.min(...flatten), max: Math.max(...flatten) };
    }
    static pushLabels(chart, labels) {
        chart.data = chart.data || { datasets: [] };
        if (isNil(chart.data.labels)) {
            chart.data.labels = labels;
        }
        else {
            chart.data.labels.push(...labels);
        }
    }
    static setLabels(chart, labels) {
        chart.data = chart.data || { datasets: undefined };
        chart.data.labels = labels;
    }
    static pushDataSet(chart, dataset) {
        chart.data = chart.data || { datasets: [] };
        if (isNil(chart.data.datasets))
            chart.data.datasets = [dataset];
        else
            chart.data.datasets.push(dataset);
    }
    static setSingleDataSet(chart, dataset) {
        chart.data = chart.data || { datasets: undefined };
        chart.data.datasets = [dataset];
    }
}
ChartJsUtils._commonsRegistered = false;
ChartJsUtils._pluginsRegistered = false;
export class ChartJsUtilsColor {
    static getDerivativeColor(color, count) {
        return ColorScale.custom(count, { mainColor: color.rgb })
            .legend.items
            .map(legendItem => legendItem.color);
    }
}
//# sourceMappingURL=chartsjs.utils.js.map