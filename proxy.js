// proxy.js — 最小无依赖 CORS 代理（仅用 Node 内置模块）
// 用法： node proxy.js
// 然后在网页「Base URL」填： http://localhost:9119/v1
//
// 原理：浏览器直接请求 https://token.sensenova.cn 会被 CORS 拦截。
// 本服务把请求转发到官方接口，并加上允许跨域的响应头，透传 Authorization。

const http = require('http');
const https = require('https');

const PORT = process.env.PROXY_PORT || 9119;
const UPSTREAM_HOST = 'token.sensenova.cn'; // 官方 base host

const server = http.createServer((req, res) => {
  // ---- CORS：允许任意来源调用 ----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  // 预检请求直接放行
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 读取请求体
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('error', () => { res.writeHead(400); res.end('bad request'); });

  req.on('end', () => {
    const body = Buffer.concat(chunks);
    // 组装转发 header：复制原 header，覆盖 host，重算 content-length
    const headers = { ...req.headers };
    headers['host'] = UPSTREAM_HOST;
    delete headers['content-length'];
    delete headers['connection'];
    if (body.length) headers['content-length'] = String(body.length);

    const proxyReq = https.request(
      {
        host: UPSTREAM_HOST,
        port: 443,
        path: req.url,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        // 透传上游状态码与响应头（剔除可能引发问题的逐跳头）
        const respHeaders = { ...proxyRes.headers };
        delete respHeaders['content-length']; // 由 pipe 自动处理，避免错配
        delete respHeaders['transfer-encoding'];
        // 保留我们自己设的 CORS 头（覆盖上游的同名头）
        respHeaders['access-control-allow-origin'] = '*';
        res.writeHead(proxyRes.statusCode || 502, respHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: 'proxy upstream error: ' + e.message } }));
    });

    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log('\n  SenseNova CORS 代理已启动');
  console.log('  --------------------------------');
  console.log('  代理地址: http://localhost:' + PORT);
  console.log('  在网页 Base URL 填: http://localhost:' + PORT + '/v1');
  console.log('  按 Ctrl+C 停止\n');
});
