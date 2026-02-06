const http = require('http');
const fs = require('fs');
const path = require('path');

const currentWorkingDirectory = process.cwd();
console.log(`Current Working Directory: ${currentWorkingDirectory}`);

let serverStartTime = null;

const server = http.createServer(handleRequest);
server.listen(1337, '0.0.0.0', startServer);

process.on('SIGINT', stopServer);

function startServer() {
    console.log(`Running node.js ${process.version} on ${process.platform}-${process.arch}`);
    console.log('Server running at http://0.0.0.0:1337/');
    serverStartTime = Date.now();
}

function stopServer() {
    console.log('User typed: Ctrl + C or Ctrl +   Χ. Closing server gracefully...\n');
    server.close(() => {
        const serverEndTime = Date.now();
        const serverRunTime = (serverEndTime - serverStartTime) /   1000;
        console.log(`Server ran for ${serverRunTime} seconds.`);
        console.log('Server stopped.\n');
        process.exit(0);
    });
}

function handleRequest(request, response) {
    if (request.url === '/favicon.ico') {
        response.writeHead(204, {'Content-Type': 'image/x-icon'});
        response.end();
        return;
    }

    if (request.url === '/') {
        serveFile(response, path.join(currentWorkingDirectory, 'server_mininet', 'index.html'), getContentType());
        return;
    }

    const filePath = path.join('./server_mininet/videos', request.url);
    console.log(`filepath: ${filePath}`);

    const extname = path.extname(filePath);

    const contentType = getContentType(path.extname(filePath));
    serveFile(response, filePath, contentType);
}

function getContentType(extname) {
    const contentTypes = {
        '.m4s': 'dash/m4s',
        '_dashinit.mp4': 'dashinit/mp4',
        '.mpd': 'application/dash+xml',
        '.mp4': 'video/mp4',
        '.m4a': 'audio/m4a',
        '.js': 'application/javascript',
    };
    return contentTypes[extname] || 'text/html';
}

let openFileStreams = [];

function serveFile(response, filePath, contentType) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = response.headers?.range;

    let file;
    if (range) {
        const [start, end] = getRange(range, fileSize);
        file = fs.createReadStream(filePath, { start, end });
        response.writeHead(206, getHeaders(start, end, fileSize, contentType));
    } else {
        console.log('Conrntent-Type:', contentType);
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

function getRange(range, fileSize) {
    const parts = range.slice(6).split('-');
    const start = parseInt(parts[0],  10);
    const end = parts[1] ? parseInt(parts[1],  10) : fileSize -  1;
    return [start, end];
}

function getHeaders(start, end, fileSize, contentType) {
    return {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start +  1,
        'Content-Type': contentType,
    };
}

function removeFileStream(fileStream) {
    const index = openFileStreams.indexOf(fileStream);
    if (index > -1) {
        openFileStreams.splice(index,  1);
    }
}