import { create } from 'zustand';
import { MODEL, DEFAULT_BASE, fetchTree, saveNode, removeNode, requestImage } from './api.js';

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage unavailable - non-fatal */
  }
};

const CONFIG_KEYS = [
  'apiKey',
  'baseUrl',
  'size',
  'outputFormat',
  'responseFormat',
  'watermark',
  'promptExtend',
];

export const useStore = create((set, get) => {
  const persist = () => {
    const s = get();
    CONFIG_KEYS.forEach((k) => write(`sn.${k}`, s[k]));
  };

  return {
    // ---- persisted config ----
    apiKey: read('sn.apiKey', ''),
    baseUrl: read('sn.baseUrl', DEFAULT_BASE),
    size: read('sn.size', 'auto'),
    outputFormat: read('sn.outputFormat', 'png'),
    responseFormat: read('sn.responseFormat', 'b64_json'),
    watermark: read('sn.watermark', true),
    promptExtend: read('sn.promptExtend', true),

    // ---- session state ----
    mode: 'generate', // 'generate' | 'edit'
    prompt: '',
    images: [], // edit refs: [{ image_url, thumb, sourceNodeId? }]
    tree: [],
    treeError: null,
    selectedId: null,
    running: false,
    error: null,
    result: null, // { src, nodeId, mode, params, prompt, elapsedMs }
    toast: null,

    setConfig: (patch) => {
      set(patch);
      persist();
    },
    setMode: (mode) => set({ mode }),
    setPrompt: (prompt) => set({ prompt }),
    setError: (error) => set({ error }),
    setToast: (toast) => set({ toast }),
    select: (selectedId) => set({ selectedId }),

    addImage: (img) => set((s) => ({ images: [...s.images, img] })),
    removeImage: (i) => set((s) => ({ images: s.images.filter((_, idx) => idx !== i) })),
    clearImages: () => set({ images: [] }),

    loadTree: async () => {
      try {
        set({ tree: await fetchTree(), treeError: null });
      } catch (e) {
        set({ treeError: e.message });
      }
    },

    /** 以某个历史节点为参考开分支：切到编辑模式 */
    branchFromNode: (node) =>
      set({
        mode: 'edit',
        prompt: node.prompt || '',
        images: [{ image_url: `/api/image/${node.id}`, thumb: `/api/image/${node.id}`, sourceNodeId: node.id }],
        size: node.params?.size || 'auto',
        outputFormat: node.params?.output_format || 'png',
        responseFormat: node.params?.response_format || get().responseFormat,
        watermark: node.params?.watermark ?? get().watermark,
        promptExtend: node.params?.prompt_extend ?? get().promptExtend,
        selectedId: node.id,
        error: null,
        toast: `已在节点 ${node.id} 上分支编辑`,
      }),

    /** 复用节点的 prompt 与参数，做一次新的文生图 */
    reuseNode: (node) =>
      set({
        mode: 'generate',
        prompt: node.prompt || '',
        size: node.params?.size || 'auto',
        outputFormat: node.params?.output_format || 'png',
        responseFormat: node.params?.response_format || get().responseFormat,
        watermark: node.params?.watermark ?? get().watermark,
        promptExtend: node.params?.prompt_extend ?? get().promptExtend,
        selectedId: node.id,
        error: null,
        toast: `已复用节点 ${node.id} 的参数`,
      }),

    deleteNode: async (node) => {
      try {
        await removeNode(node.id);
        set({ toast: `已移除节点 ${node.id}` });
        await get().loadTree();
      } catch (e) {
        set({ error: `删除失败：${e.message}` });
      }
    },

    run: async () => {
      const s = get();
      if (!s.apiKey.trim()) return set({ error: '请先填写 API Key。' });
      const prompt = s.prompt.trim();
      if (!prompt) return set({ error: s.mode === 'edit' ? '编辑指令不能为空。' : 'Prompt 不能为空。' });
      if (s.mode === 'edit' && s.images.length === 0)
        return set({ error: '图片编辑至少需要一张参考图，可上传或从时间树选节点。' });

      set({ running: true, error: null });
      const t0 = performance.now();
      try {
        const params = {
          size: s.size,
          output_format: s.outputFormat,
          response_format: s.responseFormat,
          watermark: s.watermark,
          prompt_extend: s.promptExtend,
        };
        const isEdit = s.mode === 'edit';
        const body = isEdit
          ? {
              model: MODEL,
              images: s.images.map((i) => ({ image_url: i.image_url })),
              prompt,
              n: 1,
              size: params.size,
              response_format: params.response_format,
              watermark: params.watermark,
              prompt_extend: params.prompt_extend,
            }
          : { model: MODEL, prompt, n: 1, ...params };

        const src = await requestImage({
          baseUrl: s.baseUrl,
          apiKey: s.apiKey,
          path: isEdit ? '/images/edits' : '/images/generations',
          body,
        });

        const elapsedMs = Math.round(performance.now() - t0);
        set({ result: { src, nodeId: null, mode: s.mode, params, prompt, elapsedMs } });

        // 归档到本地 output/
        const parentId = isEdit ? s.images[0]?.sourceNodeId || null : null;
        try {
          const node = await saveNode({
            mode: s.mode,
            prompt,
            parentId,
            elapsedMs,
            params,
            ...(src.startsWith('data:') ? { imageBase64: src } : { imageUrl: src }),
          });
          set((st) => ({ result: { ...st.result, nodeId: node.id }, selectedId: node.id }));
          await get().loadTree();
          set({ toast: `已归档节点 ${node.id}` });
        } catch (e) {
          set({ toast: `归档失败：${e.message}` });
        }
      } catch (err) {
        let m = err?.message || String(err);
        if (err instanceof TypeError && /Failed to fetch|NetworkError/i.test(m)) {
          m = `网络请求失败，确认服务已启动（npm start 或 npm run dev），或 Base URL 是否正确。原始错误：${m}`;
        }
        set({ error: m });
      } finally {
        set({ running: false });
      }
    },
  };
});
