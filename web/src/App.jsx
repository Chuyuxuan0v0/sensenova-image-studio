import { useEffect } from 'react';
import { CheckCircle, WarningCircle, FolderOpen } from '@phosphor-icons/react';
import { useStore } from './store.js';
import ControlPanel from './components/ControlPanel.jsx';
import TreeGraph from './components/TreeGraph.jsx';
import Inspector from './components/Inspector.jsx';

function TopBar() {
  const treeError = useStore((s) => s.treeError);
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-accent" aria-hidden>
        <span className="h-[11px] w-[11px] rounded-full bg-canvas" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-[13px] font-semibold leading-tight">SenseNova U1.5 Lite</h1>
        <p className="truncate text-[10.5px] leading-tight text-ink-3">图像创作台 · 本地归档与时间树</p>
      </div>
      <span className="ml-1 hidden shrink-0 rounded-chip border border-line-2 px-2 py-0.5 font-mono text-[10.5px] text-ink-2 sm:inline">
        sensenova-u1.5-lite
      </span>
      <span className="flex-1" />

      <span
        className={`hidden items-center gap-1.5 text-[11px] md:inline-flex ${
          treeError ? 'text-warn' : 'text-ink-3'
        }`}
      >
        {treeError ? (
          <>
            <WarningCircle size={13} weight="bold" />
            归档服务未连接
          </>
        ) : (
          <>
            <CheckCircle size={13} weight="bold" />
            归档服务已连接
          </>
        )}
      </span>

      <a
        href="/output/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-ctl border border-line-2 px-2.5 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
      >
        <FolderOpen size={13} weight="bold" />
        output/
      </a>
    </header>
  );
}

function Toast() {
  const toast = useStore((s) => s.toast);
  const setToast = useStore((s) => s.setToast);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed bottom-5 right-5 z-50 rounded-ctl border border-accent/40 bg-surface-3 px-3.5 py-2.5 text-[12px] font-medium text-ink shadow-lg transition-opacity duration-200 ${
        toast ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {toast || ''}
    </div>
  );
}

export default function App() {
  const loadTree = useStore((s) => s.loadTree);
  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)_330px] lg:overflow-hidden">
        <ControlPanel />
        <TreeGraph />
        <Inspector />
      </main>
      <Toast />
    </div>
  );
}
