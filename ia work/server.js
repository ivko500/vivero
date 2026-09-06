const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'entries.json');
const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function readEntries() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  if (request.url === '/api/entries') {
    if (request.method === 'GET') return send(response, 200, readEntries());
    if (request.method === 'PUT') {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        try {
          const entries = JSON.parse(body);
          if (!Array.isArray(entries)) throw new Error('Entries must be an array');
          fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
          send(response, 200, entries);
        } catch { send(response, 400, { error: 'Invalid entries payload' }); }
      });
      return;
    }
  }

  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.join(__dirname, requestedPath);
  if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, { error: 'Not found' });
  send(response, 200, fs.readFileSync(filePath), MIME_TYPES[path.extname(filePath)] || 'application/octet-stream');
});

server.listen(PORT, '0.0.0.0', () => console.log(`Vivero disponible en http://localhost:${PORT}`));
