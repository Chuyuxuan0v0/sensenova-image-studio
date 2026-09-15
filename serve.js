// serve.js — 一体化本地服务
// ① 页面 (/)  ② 官方接口同源代理 (/v1/*)  ③ 本地归档 API (/api/*)
// 用法： npm start  或  node serve.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 9119;
const UPSTREAM_HOST = 'token.sensenova.cn';
const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const INDEX = path.join(DIST_DIR, 'index.html');
const OUT_DIR = path.join(ROOT, 'output');
const TREE_FILE = path.join(OUT_DIR, 'tree.json');

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

// ---- 归档目录与 manifest 初始化 ----
function ensureOutputDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(TREE_FILE)) fs.writeFileSync(TREE_FILE, '[]', 'utf8');
}
ensureOutputDir();

function readTree() {
  try { return JSON.parse(fs.readFileSync(TREE_FILE, 'utf8')) || []; }
  catch (e) { return []; }
}
function writeTree(t) { fs.writeFileSync(TREE_FILE, JSON.stringify(t, null, 2), 'utf8'); }

function nextId(tree) {
  let max = 0;
  for (const n of tree) {
    const m = /^n(\d+)$/.exec(n.id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'n' + (max + 1);
}

function extFromFormat(fmt) {
  if (fmt === 'jpeg' || fmt === 'jpg') return '.jpg';
  if (fmt === 'webp') return '.webp';
  return '.png';
}

// 把 base64（可带 data: 前缀）写成文件
function saveBase64(b64, file) {
  const comma = b64.indexOf(',');
  const data = comma >= 0 ? b64.slice(comma + 1) : b64;
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

// 服务端抓取 URL 落盘（绕过浏览器 CORS，CDN 24h 链接也能持久化）
function downloadToFile(urlStr, file) {
  return new Promise((resolve, reject) => {
    const req = https.get(urlStr, (res) => {
      if (res.statusCode !== 200) { reject(new Error('download HTTP ' + res.statusCode)); return; }
      const ws = fs.createWriteStream(file);
      res.pipe(ws);
      ws.on('finish', () => ws.close(() => resolve()));
      ws.on('error', reject);
    });
    req.on('error', reject);
  });
}

// ---- 读取 JSON 请求体 ----
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('error', reject);
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(e); }
    });
  });
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

// ---- 归档 API ----
async function handleApi(req, res, rawPath) {
  // POST /api/save
  if (rawPath === '/api/save' && req.method === 'POST') {
    let body;
    try { body = await readJsonBody(req); }
    catch (e) { return json(res, 400, { error: 'invalid json body' }); }

    const tree = readTree();
    const id = nextId(tree);
    const ext = extFromFormat((body.params && body.params.output_format) || 'png');
    const file = path.join(OUT_DIR, id + ext);

    try {
      if (body.imageBase64) {
        saveBase64(body.imageBase64, file);
      } else if (body.imageUrl) {
        await downloadToFile(body.imageUrl, file);
      } else {
        return json(res, 400, { error: 'need imageBase64 or imageUrl' });
      }
    } catch (e) {
      return json(res, 502, { error: 'save image failed: ' + e.message });
    }

    const node = {
      id,
      parentId: body.parentId || null,
      mode: body.mode || 'generate',
      prompt: body.prompt || '',
      params: body.params || {},
      file: id + ext,
      created: new Date().toISOString(),
      elapsedMs: body.elapsedMs || null,
      title: body.title || (body.prompt ? body.prompt.slice(0, 24) : id),
    };
    tree.push(node);
    writeTree(tree);
    return json(res, 200, { node });
  }

  // GET /api/tree
  if (rawPath === '/api/tree' && req.method === 'GET') {
    return json(res, 200, { tree: readTree() });
  }

  // GET /api/image/:id  —— 返回节点对应的图片文件
  const m = /^\/api\/image\/([\w-]+)(\.\w+)?$/.exec(rawPath);
  if (m && req.method === 'GET') {
    const id = m[1];
    const tree = readTree();
    const node = tree.find((n) => n.id === id);
    if (!node) return json(res, 404, { error: 'node not found' });
    const f = path.join(OUT_DIR, node.file);
    if (!fs.existsSync(f)) return json(res, 404, { error: 'file missing' });
    return serveFile(f, res);
  }

  // DELETE /api/node/:id  —— 删除节点（仅从 manifest 移除，保留磁盘文件以免破坏其它分支）
  const dm = /^\/api\/node\/([\w-]+)$/.exec(rawPath);
  if (dm && req.method === 'DELETE') {
    const id = dm[1];
    const tree = readTree();
    const idx = tree.findIndex((n) => n.id === id);
    if (idx < 0) return json(res, 404, { error: 'node not found' });
    tree.splice(idx, 1);
    writeTree(tree);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'unknown api path: ' + rawPath });
}

// ---- 前端页面（构建产物 dist/）----
function serveApp(res) {
  if (!fs.existsSync(INDEX)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(
      '<!doctype html><meta charset="utf-8"><body style="background:#0b0b0e;color:#edeef2;font:14px/1.7 system-ui;padding:48px;max-width:640px;margin:auto">' +
        '<h2 style="font-weight:600">前端尚未构建</h2>' +
        '<p style="color:#a2a3b0">先执行 <code style="background:#17171d;padding:2px 6px;border-radius:4px">npm run build</code> 生成 dist/，' +
        '或者用 <code style="background:#17171d;padding:2px 6px;border-radius:4px">npm run dev</code> 打开开发服务器（http://localhost:5173，自带热更新与 /api /v1 代理）。</p>' +
        '<p style="color:#6d6e7e">当前地址 /api/tree 与 /v1/* 代理仍可正常使用。</p></body>'
    );
  }
  return serveFile(INDEX, res);
}

// ---- output/ 目录浏览 ----
function serveOutput(res, rawPath) {
  const rel = rawPath.replace(/^\/output\/?/, '');
  if (rel) {
    const f = path.normalize(path.join(OUT_DIR, rel));
    if (f.startsWith(OUT_DIR) && fs.existsSync(f) && fs.statSync(f).isFile()) return serveFile(f, res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found: ' + rawPath);
  }
  const tree = readTree();
  const files = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR).filter((f) => f !== 'tree.json') : [];
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const cards = tree
    .slice()
    .reverse()
    .map(
      (n) =>
        `<figure style="margin:0"><a href="/output/${esc(n.file)}" target="_blank">` +
        `<img src="/api/image/${esc(n.id)}" alt="${esc(n.id)}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #26262f;display:block"></a>` +
        `<figcaption style="font:11px/1.5 ui-monospace,monospace;color:#a2a3b0;margin-top:6px">` +
        `<b style="color:#cfe0ff">${esc(n.id)}</b> · ${n.mode === 'edit' ? '编辑' : '生成'} · ${esc(n.params && n.params.size)}<br>` +
        `<span style="color:#6d6e7e">${esc((n.prompt || '').slice(0, 40))}</span></figcaption></figure>`
    )
    .join('');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<!doctype html><meta charset="utf-8"><title>output/ · 本地归档</title>' +
      '<body style="background:#0b0b0e;color:#edeef2;font:14px/1.6 system-ui;padding:32px;margin:0">' +
      `<h1 style="font-size:16px;font-weight:600;margin:0 0 4px">本地归档 output/</h1>` +
      `<p style="color:#6d6e7e;font-size:12px;margin:0 0 20px">${tree.length} 个节点 · ${files.length} 个文件 · ${esc(OUT_DIR)}</p>` +
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;max-width:1200px">${cards}</div>` +
      (tree.length ? '' : '<p style="color:#6d6e7e">还没有归档图片。</p>') +
      '</body>'
  );
}

// ---- 静态文件 ----
function serveFile(file, res) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(500, { 'Content-Type': 'text/plain' }); return res.end('read error: ' + err.message); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---- 官方接口代理 ----
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

// ---- 主服务 ----
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const rawPath = decodeURIComponent(req.url.split('?')[0]);

  if (rawPath === '/' || rawPath === '/index.html') return serveApp(res);
  if (rawPath.startsWith('/v1/')) return proxyToUpstream(req, res);
  if (rawPath.startsWith('/api/')) return handleApi(req, res, rawPath);
  if (rawPath === '/output' || rawPath.startsWith('/output/')) return serveOutput(res, rawPath);

  // 静态资源：优先 dist/ 构建产物，其次项目目录
  for (const base of [DIST_DIR, ROOT]) {
    const f = path.normalize(path.join(base, rawPath));
    if (f.startsWith(base) && fs.existsSync(f) && fs.statSync(f).isFile()) return serveFile(f, res);
  }

  // SPA 回退
  if (fs.existsSync(INDEX)) return serveFile(INDEX, res);

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found: ' + rawPath);
});

server.listen(PORT, () => {
  const addr = 'http://localhost:' + PORT + '/';
  console.log('\n  SenseNova U1.5 Lite · 图像创作台 + 时间树归档');
  console.log('  ----------------------------------------------');
  console.log('  页面:     ' + addr);
  console.log('  代理上游: https://' + UPSTREAM_HOST + '/v1');
  console.log('  归档目录: ' + OUT_DIR);
  console.log('  按 Ctrl+C 停止\n');
  const cmd =
    process.platform === 'win32' ? `start "" "${addr}"` :
    process.platform === 'darwin' ? `open "${addr}"` :
    `xdg-open "${addr}"`;
  exec(cmd, () => {});
});
