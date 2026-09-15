export const MODEL = 'sensenova-u1.5-lite';
export const DEFAULT_BASE = 'http://localhost:9119/v1';

/** 本地归档节点图片（永久有效，不随 CDN 链接过期） */
export const nodeImage = (id) => `/api/image/${id}`;

async function jsonOrThrow(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchTree() {
  const data = await jsonOrThrow(await fetch('/api/tree'));
  return data.tree || [];
}

export async function saveNode(payload) {
  const data = await jsonOrThrow(
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  );
  return data.node;
}

export async function removeNode(id) {
  await jsonOrThrow(await fetch(`/api/node/${id}`, { method: 'DELETE' }));
}

/**
 * 生成 / 编辑。
 * 文生图 -> POST {base}/images/generations
 * 图片编辑 -> POST {base}/images/edits   (独立接口，必须带参考图)
 */
export async function requestImage({ baseUrl, apiKey, path, body }) {
  const base = (baseUrl.trim() || DEFAULT_BASE).replace(/\/+$/, '');
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || data?.raw || `HTTP ${res.status}`);
  }
  const item = data?.data?.[0] || {};
  const src = item.b64_json
    ? `data:image/${body.output_format || 'png'};base64,${item.b64_json}`
    : item.url;
  if (!src) throw new Error(`响应中未找到图片数据：${text.slice(0, 300)}`);
  return src;
}
