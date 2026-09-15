import { useMemo } from 'react';
import {
  DownloadSimple,
  ArrowSquareOut,
  PaintBrush,
  Copy,
  Trash,
  Selection,
  Sparkle,
} from '@phosphor-icons/react';
import { useStore } from '../store.js';
import { nodeImage } from '../api.js';

const fmtTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function Row({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-0">
      <dt className="font-mono text-[10.5px] text-ink-3">{k}</dt>
      <dd className="font-mono text-[11px] text-ink-2 tnum">{String(v)}</dd>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, primary, danger, href }) {
  const cls = [
    'inline-flex items-center gap-1.5 rounded-ctl border px-2.5 py-2 text-[11.5px] font-medium transition-colors active:translate-y-px',
    primary
      ? 'border-transparent bg-accent text-white hover:bg-[#3f74ec]'
      : danger
        ? 'border-line-2 text-ink-2 hover:border-err hover:text-err'
        : 'border-line-2 text-ink-2 hover:border-accent hover:text-accent-ink',
  ].join(' ');
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={13} weight="bold" />
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Icon size={13} weight="bold" />
      {label}
    </button>
  );
}

export default function Inspector() {
  const tree = useStore((s) => s.tree);
  const selectedId = useStore((s) => s.selectedId);
  const result = useStore((s) => s.result);
  const running = useStore((s) => s.running);
  const branchFromNode = useStore((s) => s.branchFromNode);
  const reuseNode = useStore((s) => s.reuseNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const setToast = useStore((s) => s.setToast);

  const selected = useMemo(() => tree.find((n) => n.id === selectedId) || null, [tree, selectedId]);

  const view = useMemo(() => {
    if (selected) {
      return {
        kind: 'node',
        id: selected.id,
        node: selected,
        src: nodeImage(selected.id),
        mode: selected.mode,
        prompt: selected.prompt,
        params: selected.params || {},
        elapsedMs: selected.elapsedMs,
        created: selected.created,
      };
    }
    if (result) {
      return {
        kind: 'result',
        id: result.nodeId,
        node: result.nodeId ? tree.find((n) => n.id === result.nodeId) || null : null,
        src: result.src,
        mode: result.mode,
        prompt: result.prompt,
        params: result.params || {},
        elapsedMs: result.elapsedMs,
        created: null,
      };
    }
    return null;
  }, [selected, result, tree]);

  const canOpen = view && /^https?:/.test(view.src);

  const download = () => {
    const a = document.createElement('a');
    a.href = view.src;
    if (!view.src.startsWith('data:')) a.target = '_blank';
    a.download = `sensenova-${view.id || 'result'}.${view.params.output_format || 'png'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copySrc = async () => {
    try {
      await navigator.clipboard.writeText(view.src);
      setToast('图片地址已复制');
    } catch {
      setToast('复制失败');
    }
  };

  return (
    <section className="flex min-h-0 flex-col bg-surface">
      <header className="flex h-[46px] shrink-0 items-center gap-2 border-b border-line px-3.5">
        <Selection size={14} weight="bold" className="text-ink-2" />
        <h2 className="text-[12.5px] font-semibold tracking-[0.01em]">节点检查器</h2>
        <span className="flex-1" />
        {view?.id && (
          <span className="rounded-chip border border-accent/30 bg-accent-soft px-1.5 py-px font-mono text-[10.5px] font-semibold text-accent-ink">
            {view.id}
          </span>
        )}
      </header>

      {!view ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-7 text-center">
          <Sparkle size={26} weight="light" className="text-ink-3" />
          <p className="text-[12.5px] font-medium text-ink-2">未选择节点</p>
          <p className="max-w-[30ch] text-[11.5px] leading-relaxed text-ink-3">
            在时间树上点一个节点查看大图与参数，或直接生成一张新图。生成结果会自动归档并选中。
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-panel border border-line bg-canvas"
              style={{ minHeight: 200 }}
            >
              {running && (
                <span className="absolute inset-x-0 top-0 h-px animate-pulse bg-accent" aria-hidden />
              )}
              <img
                src={view.src}
                alt={view.prompt || view.id || '作品'}
                className="max-h-[38vh] w-full object-contain"
              />
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-ink-2">
              {view.prompt || <span className="text-ink-3">无 prompt</span>}
            </p>

            <dl className="mt-3">
              <Row k="mode" v={view.mode === 'edit' ? '图片编辑' : '文生图'} />
              <Row k="size" v={view.params.size || 'auto'} />
              <Row k="output_format" v={view.params.output_format} />
              <Row k="response_format" v={view.params.response_format} />
              <Row k="watermark" v={view.params.watermark == null ? null : String(view.params.watermark)} />
              <Row
                k="prompt_extend"
                v={view.params.prompt_extend == null ? null : String(view.params.prompt_extend)}
              />
              <Row k="elapsed" v={view.elapsedMs ? `${(view.elapsedMs / 1000).toFixed(1)}s` : null} />
              <Row k="created" v={fmtTime(view.created)} />
            </dl>
          </div>

          <div className="shrink-0 space-y-2 border-t border-line p-3">
            <div className="flex flex-wrap gap-1.5">
              {view.node && (
                <>
                  <ActionButton
                    icon={PaintBrush}
                    label="基于此编辑"
                    primary
                    onClick={() => branchFromNode(view.node)}
                  />
                  <ActionButton icon={Sparkle} label="复用参数" onClick={() => reuseNode(view.node)} />
                </>
              )}
              <ActionButton icon={DownloadSimple} label="下载" onClick={download} />
              {canOpen && <ActionButton icon={ArrowSquareOut} label="打开" href={view.src} />}
              <ActionButton icon={Copy} label="复制地址" onClick={copySrc} />
              {view.node && (
                <ActionButton
                  icon={Trash}
                  label="移除"
                  danger
                  onClick={() => {
                    if (confirm(`从时间树移除节点 ${view.node.id}？磁盘文件会保留，不影响其它分支。`))
                      deleteNode(view.node);
                  }}
                />
              )}
            </div>
            <p className="text-[10.5px] leading-relaxed text-ink-3">
              {view.kind === 'node'
                ? '该节点已归档到 output/，图片走本地 /api/image 提供，不随 CDN 链接过期。'
                : '本次结果尚未归档完成，或归档失败；可重试生成。'}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
