const http = require('http');
const fs = require('fs');
const path = require('path');

const currentWorkingDirectory = process.cwd();
console.log('Current Working Directory:', currentWorkingDirectory);

let serverStartTime = null;
let firstRequestTime = null;

// Create server and start listening
const server = http.createServer(handleRequest);
server.listen(1337, '0.0.0.0', startServer);

// Handle server shutdown
process.on('SIGINT', stopServer);

function startServer() {
    console.log("Running node.js %s on %s-%s", process.version, process.platform, process.arch);
    console.log('Server running at http://localhost:1337/');
    serverStartTime = Date.now(); // Start the clock
}
 
 
function stopServer() {
    console.log('User typed: Ctrl + C or Ctrl + Χ. Closing server gracefully...\n');
    server.close(() => {
        const serverEndTime = Date.now(); // Stop the clock
        const serverRunTime = (serverEndTime - serverStartTime) / 1000; // Calculate the run time in seconds
        console.log('Server ran for ' + serverRunTime + ' seconds.');
        console.log('Server stopped.\n');
        cleanup();
        process.exit(0);
    });
}

function handleRequest(request, response) {

    // Ignore favicon.ico requests
    if (request.url === '/favicon.ico') {
        response.writeHead(204, {'Content-Type': 'image/x-icon'});
        response.end();
        return;
    }

    // If the root of the server is accessed, serve the index.html file
    if (request.url === '/') {
        const filePath = path.join(currentWorkingDirectory, 'server_over_network_aws', 'index.html');
        const contentType = 'text/html';
        serveFile(response, filePath, contentType);
        return;
    }

    if (firstRequestTime === null) {
        firstRequestTime = Date.now();
    }
    const filePath = './server_over_network_aws/videos' + request.url;
    console.log('filepath: ' + filePath + '\n');

    let resolution = null
    if (filePath.includes(".mpd")) {
        console.log('(manifest) : request starting... : ' + filePath + '\n');
    } else if (filePath.includes("bbb_sunflower_2160p_30fps_normal_audio")) {
        console.log('(audio) : request starting... : ' + filePath + '\n');
    } else if (filePath.includes("bbb_sunflower_2160p_30fps_normal_")) {
        console.log('(segment) : request starting... : ' + filePath + '\n');
        resolution = filePath.split('_')[5];
    }

    const extname = path.extname(filePath);
    const contentType = getContentType(extname);

    serveFile(response, filePath, contentType, resolution);

    // const stats = {
    //     time: getElapsedTimeSinceFirstRequest(),
    //     filePath: filePath,
    //     resolution: fullResolution(resolution),
    // };
    // fs.appendFile(statsFile, JSON.stringify(stats) + '\n', err => {
    //     if (err) {
    //         console.error('Error writing file:', err);
    //     } else {
    //         // Change the file permissions to 0666 (read and write access for all users)
    //         fs.chmod(statsFile, 0o666, err => {
    //             if (err) {
    //                 console.error('Error changing file permissions:', err);
    //             }
    //         });
    //     }
    // });
}


function getContentType(extname) {
    switch (extname) {
        case '.m4s':
            return 'dash/m4s';
        case '_dashinit.mp4':
            return 'dashinit/mp4';
        case '.mpd':
            return 'application/dash+xml';
        case '.mp4':
            return 'video/mp4';
        case '.m4a':
            return 'audio/m4a';
        case '.js':
            return 'application/javascript';
        default:
            return 'text/html';
    }
}

let openFileStreams = [];

function serveFile(response, filePath, contentType, resolution) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = response.headers && response.headers.range;

    let file;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        file = fs.createReadStream(filePath, { start, end });

        response.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
        });
    } else {
        response.setHeader('Set-Cookie', [`filePath=${filePath}`, `resolution=${fullResolution(resolution)}`]);
        response.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
        });

        file = fs.createReadStream(filePath);
    }

    file.on('error', (err) => {
        console.error('Error reading file:', err);
        file.close();
        removeFileStream(file);
    });

    file.pipe(response);
    openFileStreams.push(file);
}

function cleanup() {
    openFileStreams.forEach((stream) => {
        stream.close();
    });
    console.log('All file streams closed.');
}

function removeFileStream(fileStream) {
    const index = openFileStreams.indexOf(fileStream);
    if (index > -1) {
        openFileStreams.splice(index, 1);
    }
}

function myCurrentDate() {
    const date_ob = new Date();
    const date = ("0" + date_ob.getDate()).slice(-2);
    const month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    const year = date_ob.getFullYear();
    const hours = date_ob.getHours();
    const minutes = date_ob.getMinutes();
    const seconds = date_ob.getSeconds();
    return year + month + date + '_' + hours + ':' + minutes + ':' + seconds;
}

function fullResolution(resolution) {
    switch (resolution) {
        case '180':
            return '320x180';
        case '270':
            return '480x270';
        case '360':
            return '640x360';
        case '432':
            return '768x432';
        case '540':
            return '960x540';
        case '576':
            return '1024x576';
        case '720':
            return '1280x720';
        case '1080':
            return '1920x1080';
        case '1440':
            return '2560x1440';
        case '2160':
            return '3840x2160';
        default:
            return 'no_resolution';
    }
}

function getElapsedTimeSinceFirstRequest() {
    const elapsedTimeInSeconds = (Date.now() - firstRequestTime) / 1000;
    const minutes = Math.floor(elapsedTimeInSeconds / 60);
    const seconds = Math.floor(elapsedTimeInSeconds % 60);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}