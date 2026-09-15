// serve.js — 一体化本地服务
// 同时提供：① 页面（http://localhost:9119/）② 官方接口同源代理（/v1/* → token.sensenova.cn）
// 同源访问，无 CORS / 无 file:// 限制。
// 用法： npm start  或  node serve.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 9119;
const UPSTREAM_HOST = 'token.sensenova.cn';
const ROOT = __dirname;
const INDEX = path.join(ROOT, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // CORS（同源时其实用不到，保留以便外部直接调用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const rawPath = decodeURIComponent(req.url.split('?')[0]);

  // ① 首页
  if (rawPath === '/' || rawPath === '/index.html') {
    return serveFile(INDEX, res);
  }

  // ② 代理官方接口
  if (rawPath.startsWith('/v1/')) {
    return proxyToUpstream(req, res);
  }

  // ③ 其他静态文件（限制在项目目录内，防目录穿越）
  const file = path.normalize(path.join(ROOT, rawPath));
  if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    return serveFile(file, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found: ' + rawPath);
});

function serveFile(file, res) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(500, { 'Content-Type': 'text/plain' }); return res.end('read error: ' + err.message); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

function proxyToUpstream(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('error', () => { res.writeHead(400); res.end('bad request'); });
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers };
    headers['host'] = UPSTREAM_HOST;
    delete headers['content-length'];
    delete headers['connection'];
    if (body.length) headers['content-length'] = String(body.length);

    const proxyReq = https.request(
      { host: UPSTREAM_HOST, port: 443, path: req.url, method: req.method, headers },
      (proxyRes) => {
        const h = { ...proxyRes.headers };
        delete h['content-length'];
        delete h['transfer-encoding'];
        h['access-control-allow-origin'] = '*';
        res.writeHead(proxyRes.statusCode || 502, h);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: 'proxy upstream error: ' + e.message } }));
    });
    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
}

server.listen(PORT, () => {
  const addr = 'http://localhost:' + PORT + '/';
  console.log('\n  SenseNova U1.5 Lite · 图像创作台');
  console.log('  ------------------------------------');
  console.log('  页面地址: ' + addr);
  console.log('  代理上游: https://' + UPSTREAM_HOST + '/v1');
  console.log('  页面与代理同源，无需额外配置 CORS');
  console.log('  按 Ctrl+C 停止\n');

  // 自动打开默认浏览器
  const cmd =
    process.platform === 'win32' ? `start "" "${addr}"` :
    process.platform === 'darwin' ? `open "${addr}"` :
    `xdg-open "${addr}"`;
  exec(cmd, () => {});
});
