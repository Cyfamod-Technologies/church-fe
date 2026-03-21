function buildHeatmapSeries(labelPrefix, values) {
    return values.map(function (row, index) {
        return {
            name: labelPrefix + ' ' + (index + 1),
            data: row.map(function (value, pointIndex) {
                return {
                    x: 'W' + (pointIndex + 1),
                    y: value
                };
            })
        };
    });
}

function renderHeatmap(selector, options) {
    const node = document.querySelector(selector);

    if (!node) {
        return;
    }

    const chart = new ApexCharts(node, options);
    chart.render();
}

const heatmapBaseOptions = {
    chart: {
        fontFamily: 'Rubik, serif',
        height: 350,
        type: 'heatmap',
        toolbar: {
            show: false
        }
    },
    dataLabels: {
        enabled: false
    },
    stroke: {
        width: 0
    },
    legend: {
        show: false
    }
};

renderHeatmap('#heatma1', {
    ...heatmapBaseOptions,
    series: buildHeatmapSeries('Metric', [
        [14, 10, 9, 18, 21, 22, 25]
    ]),
    colors: ['rgba(var(--primary),1)']
});

renderHeatmap('#heatma2', {
    ...heatmapBaseOptions,
    series: buildHeatmapSeries('Team', [
        [12, 16, 9, 14, 18, 21, 13],
        [8, 11, 15, 20, 16, 12, 10],
        [18, 14, 19, 11, 9, 13, 17],
        [10, 7, 12, 15, 20, 18, 14]
    ]),
    colors: ['rgba(var(--secondary),1)']
});

renderHeatmap('#heatma3', {
    ...heatmapBaseOptions,
    series: buildHeatmapSeries('Sales', [
        [5, 8, 11, 14, 18, 22, 26],
        [7, 10, 13, 16, 19, 23, 27],
        [4, 6, 9, 12, 15, 20, 24]
    ]),
    plotOptions: {
        heatmap: {
            shadeIntensity: 0.5,
            colorScale: {
                ranges: [
                    { from: 0, to: 9, color: '#0AB964', name: 'Low' },
                    { from: 10, to: 18, color: '#F9C123', name: 'Medium' },
                    { from: 19, to: 30, color: '#E14E5A', name: 'High' }
                ]
            }
        }
    }
});

renderHeatmap('#heatma4', {
    ...heatmapBaseOptions,
    series: buildHeatmapSeries('Load', [
        [-20, -10, -5, 0, 5, 10, 20],
        [-15, -7, -2, 3, 9, 14, 18],
        [-12, -6, 0, 6, 11, 17, 21]
    ]),
    plotOptions: {
        heatmap: {
            enableShades: false,
            colorScale: {
                ranges: [
                    { from: -30, to: -1, color: '#5B8DEF', name: 'Below Target' },
                    { from: 0, to: 10, color: '#0AB964', name: 'On Target' },
                    { from: 11, to: 30, color: '#E14E5A', name: 'Above Target' }
                ]
            }
        }
    }
});
