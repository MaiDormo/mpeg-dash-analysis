// client.js
const URL = 'http://10.0.0.1:1337/bbb_sunflower_2160p_30fps_normal.mpd';
const RESOLUTIONS = ['320x180', '480x270', '640x360', '768x432', '940x540', '1024x576', '1280x720', '1920x1080', '2560x1440', '3840x2160'];
const BITS_IN_MEGABIT =  1000000;

let downloadRates = [];
let actualResolutions = [];
let bufferLengths = [];
let bitrates = [];
let droppedFrames = [];
let effectiveBitrates = [];

let lastPackets = [];

let csvData = {
    'data.csv': '',
    'resolutionData.csv': '',
    'droppedFrames.csv': ''
};

let startTime = Date.now();

//-----------------CODE RELATED TO THE VIDEOPLAYER-----------------//

const player = createPlayer();
document.addEventListener('DOMContentLoaded', initializePlayerandCharts);
document.getElementById('downloadButton').addEventListener('click', downloadAllCSVs);

function createPlayer() {
    const player = dashjs.MediaPlayer().create();
    player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, logDownloadRate);   
    player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, logMoreData);
    player.on(dashjs.MediaPlayer.events["PLAYBACK_PAUSED"], stopEventPolling);
    return player;
}

function initializePlayerandCharts() {
    const video = document.querySelector('#videoPlayer');
    player.initialize(video, URL);
    video.muted = true;
    video.play();
    initCSVData();
}

function initCSVData() {
    csvData['data.csv'] = 'Time,Download Rate,Buffer Length,Bitrate,Effective Bitrate\n';
    csvData['resolutionData.csv'] = 'Time,Resolution\n';
    csvData['droppedFrames.csv'] = 'Time,Dropped Frames\n';
}

function stopEventPolling() {
    clearInterval(eventPoller);
    clearInterval(bitrateCalculator);
}

//-----------------CODE RELATED TO THE CHARTS-----------------//

const ctx = document.getElementById('myChart').getContext('2d');
const chart = createDataChart(ctx);
const resolutionCtx = document.getElementById('resolutionChart').getContext('2d');
const resolutionChart = createResolutionChart(resolutionCtx);
const droppedFramesCtx = document.getElementById('droppedFramesChart').getContext('2d');
const droppedFramesChart = createDroppedFramesChart(droppedFramesCtx);

function createChart(ctx, datasets, options) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: datasets,
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ...options
                }
            }
        }
    });
}

function createDataChart(ctx) {
    const datasets = [
        {
            label: 'Download Rate',
            data: [],
            borderColor: 'rgb(75,  192,  192)',
            fill: false,
            tension: 0.4
        },
        {
            label: 'Buffer Length',
            data: [],
            borderColor: 'rgb(0,  0,  255)',
            fill: false,
            tension: 0.4
        },
        {
            label: 'Bitrate',
            data: [],
            borderColor: 'rgb(0,  255,  0)',
            fill: false,
            tension: 0.4
        },
        {
            label: 'Effective Bitrate',
            data: [],
            borderColor: 'rgb(128,  0,  0)',
            fill: false,
            tension: 0.4
        }
    ];
    return createChart(ctx, datasets, {});
}

function createDroppedFramesChart(ctx) {
    const datasets = [
        {
            label: 'Dropped Frames',
            data: [],
            borderColor: 'rgb(236,  124,  32)',
            fill: false,
            tension: 0.4
        }
    ];
    return createChart(ctx, datasets, {});
}

function createResolutionChart(ctx) {
    const datasets = [
        {
            label: 'Actual Resolution',
            data: [],
            borderColor: 'rgb(255,  99,  132)',
            fill: false,
            tension: 0.4
        }
    ];
    const options = {
        ticks: {
            maxTicksLimit:  8,
            callback: (context) => {
                return RESOLUTIONS[context];
            }
        }
    };
    return createChart(ctx, datasets, options);
}

function updateChart() {
    const arrays = [downloadRates, bufferLengths, bitrates, effectiveBitrates];
    if (arrays.every(array => array.length > 0)) {
        const currentTime = player.convertToTimeCode(player.time());
        pushDataToChart(chart, currentTime, arrays);
        pushDataToResolutionChart(resolutionChart, currentTime, actualResolutions);
        pushDataToDroppedFramesChart(droppedFramesChart, currentTime, droppedFrames);
        writeDataToCSV(currentTime, arrays);
        writeResolutionDataToCSV(currentTime, actualResolutions);
        writeDroppedFramesToCSV(currentTime, droppedFrames);
    }
}

function pushDataToChart(chart, currentTime, dataArrays) {
    chart.data.labels.push(currentTime);
    dataArrays.forEach((dataArray, index) => {
        chart.data.datasets[index].data.push(getLastElement(dataArray));
    });
    chart.update();
}

function pushDataToResolutionChart(chart, currentTime, actualResolutions) {
    chart.data.labels.push(currentTime);
    chart.data.datasets[0].data.push(getLastElement(actualResolutions));
    chart.update();
}

function pushDataToDroppedFramesChart(chart, currentTime, droppedFrames) {
    chart.data.labels.push(currentTime);
    chart.data.datasets[0].data.push(getLastElement(droppedFrames));
    chart.update();
}

function getLastElement(array) {
    return array[array.length - 1];
}

//-----------------CODE RELATED TO LOGGING RELEVANT DATA-----------------//


const video = document.querySelector('#videoPlayer');

if (video.webkitVideoDecodedByteCount !== undefined) {
    var lastDecodedByteCount = 0;
    const bitrateInterval = 1;
    var bitrateCalculator    = setInterval(() => {
        var calculatedBitrate = ((video.webkitVideoDecodedByteCount - lastDecodedByteCount) / Math.pow(1000,  2)) *  8 / bitrateInterval;
        effectiveBitrates.push(calculatedBitrate);
        lastDecodedByteCount = video.webkitVideoDecodedByteCount;
    }, bitrateInterval *  1000);
} else {
    const bitrateInterval = 1;
    var bitrateCalculator = setInterval(() => {
        effectiveBitrates.push(0);
    }, bitrateInterval * 1000);
}

function logDownloadRate(e) {
    if (e.request.type === 'MediaSegment') {
        const elapsedTime = (Date.now() - startTime) / 1000; 
        const downloadRate = (e.request.bytesTotal * 8) / (elapsedTime * BITS_IN_MEGABIT); 
        downloadRates.push(downloadRate);
        startTime = Date.now();
    }
}


var eventPoller = setInterval(function () { 
    var streamInfo = player.getActiveStream().getStreamInfo();
    var dashMetrics = player.getDashMetrics();

    if (dashMetrics && streamInfo) {
        var bufferLevel = dashMetrics.getCurrentBufferLevel('video', true);
        bufferLengths.push(bufferLevel);
        updateChart();
    }
}, 1000);

function logMoreData(e) {
    
    const actualResolution = player.getQualityFor(e.mediaType);
    if (actualResolution === null) {
        console.error('Could not get actual resolution');
        return;
    }

    actualResolutions.push(actualResolution);

    const bitrateInfoList = player.getBitrateInfoListFor('video');
    if (bitrateInfoList) {
        const currentBitrate = bitrateInfoList.find(b => b.qualityIndex === actualResolution)?.bitrate;
        if (currentBitrate !== null) {
            bitrates.push(currentBitrate / BITS_IN_MEGABIT);
        } else {
            console.error('Could not get bitrate for quality index ' + actualResolution);
            return;
        }
    }

    const video = document.querySelector('#videoPlayer');
    const droppedFrameCount = player.getDashMetrics().getCurrentDroppedFrames(video);
    if (droppedFrameCount !== null) {
        droppedFrames.push(droppedFrameCount.droppedFrames);
    }
}

//-----------------CODE RELATED USED TO WRITING AND DOWNLOADING CSV FILES-----------------//


function writeDataToCSV(currentTime, arrays) {
    csvData['data.csv'] += `${currentTime},${arrays[0][arrays[0].length - 1]},${arrays[1][arrays[1].length - 1]},${arrays[2][arrays[2].length - 1]},${arrays[3][arrays[3].length - 1]}\n`;
}

function writeResolutionDataToCSV(currentTime, actualResolutions) {
    csvData['resolutionData.csv'] += `${currentTime},${RESOLUTIONS[actualResolutions[actualResolutions.length - 1]]}\n`;
}

function writeDroppedFramesToCSV(currentTime, droppedFrames) {
    csvData['droppedFrames.csv'] += `${currentTime},${droppedFrames[droppedFrames.length - 1]}\n`;
}

function downloadCSV(filename) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csvData[filename]));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}


function downloadAllCSVs() {
    downloadCSV('data.csv');
    downloadCSV('resolutionData.csv');
    downloadCSV('droppedFrames.csv');
}