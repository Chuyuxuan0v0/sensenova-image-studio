import { useRef, useState } from 'react';
import {
  Sparkle,
  PaintBrush,
  UploadSimple,
  LinkSimple,
  X,
  CircleNotch,
  WarningCircle,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import { useStore } from '../store.js';

const SIZE_OPTIONS = [
  ['auto', 'auto'],
  ['2048x2048', '2048x2048  1:1'],
  ['2720x1536', '2720x1536  16:9'],
  ['1536x2720', '1536x2720  9:16'],
  ['1664x2496', '1664x2496  2:3'],
  ['2496x1664', '2496x1664  3:2'],
  ['4096x4096', '4096x4096  1:1'],
];

function Label({ children, hint }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-medium tracking-[0.01em] text-ink-2">{children}</span>
      {hint && <span className="font-mono text-[10px] text-ink-3">{hint}</span>}
    </div>
  );
}

const inputCls =
  'w-full rounded-ctl border border-line-2 bg-surface px-2.5 py-2 text-[12.5px] text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-accent';

function Toggle({ label, desc, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 rounded-ctl border border-line-2 bg-surface px-2.5 py-2 text-left transition-colors hover:border-ink-3"
    >
      <span className="min-w-0">
        <span className="block truncate font-mono text-[11px] text-ink-2">{label}</span>
        <span className="block text-[10px] text-ink-3">{desc}</span>
      </span>
      <span
        className={`relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-line-2'
        }`}
      >
        <span
          className={`absolute top-[3px] h-3 w-3 rounded-full bg-white transition-[left] ${
            checked ? 'left-[17px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  );
}

export default function ControlPanel() {
  const st = useStore();
  const [showKey, setShowKey] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const readFiles = (fileList) => {
    Array.from(fileList || []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        useStore.getState().addImage({ image_url: reader.result, thumb: reader.result });
      reader.readAsDataURL(file);
    });
  };

  return (
    <section className="flex min-h-0 flex-col border-line bg-surface lg:border-r">
      <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-line px-3.5">
        <h2 className="text-[12.5px] font-semibold tracking-[0.01em]">创作台</h2>
        <span className="font-mono text-[10.5px] text-ink-3">{st.mode === 'edit' ? '图片编辑' : '文生图'}</span>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3.5 py-3.5">
        {/* 接入 */}
        <div className="space-y-3">
          <div>
            <Label hint="仅存本地">API Key</Label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={st.apiKey}
                onChange={(e) => st.setConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
                className={`${inputCls} pr-9 font-mono`}
              />
              <button
                type="button"
                aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-chip p-1 text-ink-3 transition-colors hover:text-ink-2"
              >
                {showKey ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <Label hint="可填代理">Base URL</Label>
            <input
              type="text"
              value={st.baseUrl}
              onChange={(e) => st.setConfig({ baseUrl: e.target.value })}
              placeholder="http://localhost:9119/v1"
              spellCheck={false}
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>

        {/* 模式 */}
        <div className="grid grid-cols-2 gap-1.5 rounded-ctl border border-line bg-canvas p-1">
          {[
            ['generate', '文生图', Sparkle],
            ['edit', '图片编辑', PaintBrush],
          ].map(([value, label, Icon]) => {
            const active = st.mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => st.setMode(value)}
                aria-pressed={active}
                className={`inline-flex items-center justify-center gap-1.5 rounded-chip px-2 py-1.5 text-[12px] font-medium transition-colors ${
                  active ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon size={13} weight={active ? 'fill' : 'regular'} />
                {label}
              </button>
            );
          })}
        </div>

        {/* 参考图（仅编辑模式） */}
        {st.mode === 'edit' && (
          <div className="space-y-2">
            <Label hint="第一张为主编辑图">参考图</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                readFiles(e.dataTransfer.files);
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-ctl border border-dashed px-3 py-3.5 text-center transition-colors ${
                dragging ? 'border-accent bg-accent-soft' : 'border-line-2 bg-surface hover:border-ink-3'
              }`}
            >
              <UploadSimple size={17} weight="bold" className="text-ink-3" />
              <span className="text-[11.5px] font-medium text-ink-2">点击或拖拽上传</span>
              <span className="font-mono text-[10px] text-ink-3">PNG / JPG / WEBP</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  readFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && urlDraft.trim()) {
                    st.addImage({ image_url: urlDraft.trim(), thumb: urlDraft.trim() });
                    setUrlDraft('');
                  }
                }}
                placeholder="或粘贴图片 URL"
                spellCheck={false}
                className={`${inputCls} font-mono`}
              />
              <button
                type="button"
                aria-label="添加图片 URL"
                onClick={() => {
                  if (!urlDraft.trim()) return;
                  st.addImage({ image_url: urlDraft.trim(), thumb: urlDraft.trim() });
                  setUrlDraft('');
                }}
                className="shrink-0 rounded-ctl border border-line-2 bg-surface-2 px-2.5 text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
              >
                <LinkSimple size={14} weight="bold" />
              </button>
            </div>

            {st.images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {st.images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative h-16 w-16 overflow-hidden rounded-ctl border border-line-2 bg-black"
                  >
                    <img src={img.thumb || img.image_url} alt={`参考图 ${i + 1}`} className="h-full w-full object-cover" />
                    {img.sourceNodeId && (
                      <span className="absolute left-1 top-1 rounded-chip bg-accent px-1 font-mono text-[9px] font-semibold text-white">
                        {img.sourceNodeId}
                      </span>
                    )}
                    <span className="absolute bottom-1 left-1 rounded-chip bg-black/70 px-1 font-mono text-[9px] text-white tnum">
                      {i === 0 ? '主' : i + 1}
                    </span>
                    <button
                      type="button"
                      aria-label={`移除参考图 ${i + 1}`}
                      onClick={() => st.removeImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X size={11} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 提示词 */}
        <div>
          <Label hint="Ctrl+Enter 提交">{st.mode === 'edit' ? '编辑指令' : 'Prompt'}</Label>
          <textarea
            value={st.prompt}
            onChange={(e) => st.setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                st.run();
              }
            }}
            rows={4}
            placeholder={
              st.mode === 'edit'
                ? '把背景改成雪山，人物保持不变'
                : '一只海獭宝宝漂浮在平静海面上，柔和晨光，写实摄影风格'
            }
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </div>

        {/* 输出参数 */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <Label>size</Label>
              <select
                value={st.size}
                onChange={(e) => st.setConfig({ size: e.target.value })}
                className={`${inputCls} px-2 font-mono`}
              >
                {SIZE_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>output</Label>
              <select
                value={st.outputFormat}
                onChange={(e) => st.setConfig({ outputFormat: e.target.value })}
                className={`${inputCls} px-2 font-mono`}
              >
                <option value="png">png</option>
                <option value="jpeg">jpeg</option>
                <option value="webp">webp</option>
              </select>
            </div>
            <div>
              <Label>response</Label>
              <select
                value={st.responseFormat}
                onChange={(e) => st.setConfig({ responseFormat: e.target.value })}
                className={`${inputCls} px-2 font-mono`}
              >
                <option value="b64_json">b64</option>
                <option value="url">url</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Toggle
              label="watermark"
              desc="官方水印"
              checked={st.watermark}
              onChange={(v) => st.setConfig({ watermark: v })}
            />
            <Toggle
              label="prompt_extend"
              desc="自动润色"
              checked={st.promptExtend}
              onChange={(v) => st.setConfig({ promptExtend: v })}
            />
          </div>
        </div>

        {st.mode === 'edit' && st.images.length > 0 && st.images[0].sourceNodeId && (
          <p className="rounded-ctl border border-accent/25 bg-accent-soft px-2.5 py-1.5 text-[10.5px] leading-relaxed text-accent-ink">
            本次编辑将挂在节点 <span className="font-mono">{st.images[0].sourceNodeId}</span> 之下，生成一个新分支。
          </p>
        )}

        {st.error && (
          <div className="flex items-start gap-2 rounded-ctl border border-err/30 bg-err/10 px-2.5 py-2 text-[11.5px] leading-relaxed text-err">
            <WarningCircle size={14} weight="bold" className="mt-px shrink-0" />
            <span className="break-all">{st.error}</span>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        <button
          type="button"
          disabled={st.running}
          onClick={() => st.run()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-ctl bg-accent px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#3f74ec] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
        >
          {st.running ? (
            <>
              <CircleNotch size={15} weight="bold" className="animate-spin" />
              创作中
            </>
          ) : (
            <>
              {st.mode === 'edit' ? <PaintBrush size={15} weight="bold" /> : <Sparkle size={15} weight="bold" />}
              {st.mode === 'edit' ? '开始编辑' : '开始创作'}
            </>
          )}
        </button>
      </div>
    </section>
  );
}
