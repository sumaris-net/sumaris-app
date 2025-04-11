import { Component, Input, OnChanges, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartType, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

export type AllowedChartTypes = 'line' | 'bar' | 'radar' | 'doughnut' | 'pie';

export interface DynamicChartConfig<T extends ChartType = ChartType> {
  datasetLabel?: string;
  chartType?: T;
  backgroundColor?: string;
  borderColor?: string;
  fillArea?: boolean;
  tensionValue?: number;
  borderWidthValue?: number;
  showLegend?: boolean;
  tooltipXUnit?: string | null;
  integerAxisX?: boolean;
  integerAxisY?: boolean;
}

export interface DynamicChartData {
  xData?: string[] | number[];
  yData?: number[];
  xLabel?: string;
  yLabel?: string;
}

@Component({
  selector: 'app-dynamic-chart',
  templateUrl: './dynamic-chart.component.html',
  styleUrls: ['./dynamic-chart.component.css'],
})
export class DynamicChartComponent implements OnChanges {
  @Input() chartData: DynamicChartData = null;
  @Input() chartConfig: DynamicChartConfig = null;

  public data: ChartData<AllowedChartTypes> = {
    labels: [],
    datasets: [],
  };

  public options: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
    },
    scales: {
      x: { title: { display: true, text: '' } },
      y: { title: { display: true, text: '' } },
    },
  };

  @ViewChild(BaseChartDirective) chartRef?: BaseChartDirective;

  ngOnChanges(): void {
    this.updateChart();
  }

  updateChart() {
    if (!this.chartData) return;

    const { xData = [], yData = [], xLabel = 'X Axis', yLabel = 'Y Axis' } = this.chartData;

    const {
      datasetLabel = 'Dataset',
      chartType = 'line',
      backgroundColor = 'rgba(66,165,245,0.2)',
      borderColor = 'rgba(66,165,245,1)',
      fillArea = false,
      tensionValue = 0.4,
      borderWidthValue = 2,
      showLegend = true,
      tooltipXUnit = null,
      integerAxisX = true,
      integerAxisY = true,
    } = this.chartConfig || {};

    this.data = {
      labels: xData,
      datasets: [
        {
          data: yData,
          label: datasetLabel,
          backgroundColor: chartType === 'bar' ? backgroundColor : 'rgba(66,165,245,0.2)',
          borderColor,
          borderWidth: borderWidthValue,
          fill: fillArea,
          tension: tensionValue,
        },
      ],
    };

    // Configure X axis as integer if integerAxisX is true
    const xTicks: ChartConfiguration['options']['scales']['x']['ticks'] = {};
    if (integerAxisX) {
      (xTicks as any).stepSize = 1;
      (xTicks as any).callback = (value) => value; // force integer display
    }

    // Configure Y axis as integer if integerAxisY is true
    const yTicks: ChartConfiguration['options']['scales']['y']['ticks'] = {};
    if (integerAxisY) {
      (yTicks as any).stepSize = 1;
      yTicks.callback = (value) => value; // force integer display
    }

    this.options = {
      responsive: true,
      plugins: {
        legend: {
          display: showLegend,
        },
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              if (!tooltipItems || tooltipItems.length === 0) return '';
              const xValue = tooltipItems[0].label;
              return xValue + ' ' + tooltipXUnit;
            },
          },
        },
      },
      scales: ['bar', 'line'].includes(chartType)
        ? {
            x: {
              type: 'linear', // important pour que stepSize fonctionne
              title: { display: true, text: xLabel },
              ticks: xTicks,
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: yLabel },
              ticks: yTicks,
            },
          }
        : {},
    };

    this.chartRef?.update();
  }
}
