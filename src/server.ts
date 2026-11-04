import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { runDownloads } from './downloader';
import { targetUrls } from './url';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1'; // lokal saja; ubah hanya jika memang perlu diakses dari luar
const INDEX_HTML = path.join(__dirname, '..', 'public', 'index.html');
const MAX_LOG_CHUNKS = 5000;

let running = false;
let logs: string[] = [];
const clients = new Set<http.ServerResponse>();

function send(res: http.ServerResponse, event: string, data: string) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event: string, data: string) {
  clients.forEach((res) => send(res, event, data));
}

function log(text: string) {
  logs.push(text);
  if (logs.length > MAX_LOG_CHUNKS) logs.shift();
  broadcast('log', text);
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 1_000_000) reject(new Error('Body terlalu besar'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function startDownload(req: http.IncomingMessage, res: http.ServerResponse) {
  if (running) return json(res, 409, { error: 'Proses masih berjalan' });

  let urls: string[];
  try {
    const parsed = JSON.parse(await readBody(req));
    urls = (Array.isArray(parsed.urls) ? parsed.urls : [])
      .map((u: unknown) => String(u).trim())
      .filter(Boolean);
  } catch {
    return json(res, 400, { error: 'Data tidak valid' });
  }

  if (urls.length === 0) return json(res, 400, { error: 'Isi minimal satu URL' });
  if (urls.some((u) => !/^https?:\/\//i.test(u))) {
    return json(res, 400, { error: 'Setiap URL harus diawali http:// atau https://' });
  }

  running = true;
  logs = [];
  broadcast('reset', '');
  broadcast('state', 'running');
  json(res, 202, { started: urls.length });

  runDownloads(urls, log)
    .then((summary) => log(`\n${summary}\n`))
    .catch((err: Error) => log(`[ERROR] ${err.message}\n`))
    .finally(() => {
      running = false;
      broadcast('state', 'idle');
    });
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(INDEX_HTML).pipe(res);
  }

  if (method === 'GET' && url === '/api/urls') return json(res, 200, targetUrls);

  if (method === 'GET' && url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    send(res, 'state', running ? 'running' : 'idle');
    logs.forEach((text) => send(res, 'log', text));
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (method === 'POST' && url === '/api/download') return void startDownload(req, res);

  json(res, 404, { error: 'Tidak ditemukan' });
});

server.listen(PORT, HOST, () => console.log(`Buka http://${HOST}:${PORT}`));
