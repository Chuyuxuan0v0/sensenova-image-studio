import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { TreeStructure, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import ImageNode from './ImageNode.jsx';
import { useStore } from '../store.js';

const NODE_W = 196;
const NODE_H = 172;
const nodeTypes = { image: ImageNode };

function computeLayout(tree) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 26, ranksep: 86, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  tree.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  tree.forEach((n) => {
    if (n.parentId) g.setEdge(n.parentId, n.id);
  });
  dagre.layout(g);
  const pos = {};
  tree.forEach((n) => {
    const p = g.node(n.id);
    if (p) pos[n.id] = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
  });
  return pos;
}

/** 选中节点到根的路径边，用于高亮 */
function pathEdgeIds(tree, selectedId) {
  const byId = new Map(tree.map((n) => [n.id, n]));
  const ids = new Set();
  let cur = byId.get(selectedId);
  while (cur?.parentId) {
    ids.add(`${cur.parentId}->${cur.id}`);
    cur = byId.get(cur.parentId);
  }
  return ids;
}

export default function TreeGraph() {
  const tree = useStore((s) => s.tree);
  const treeError = useStore((s) => s.treeError);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [fitNonce, setFitNonce] = useState(0);

  useEffect(() => {
    const hot = pathEdgeIds(tree, selectedId);
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      const layout = computeLayout(tree);
      return tree.map((n) => {
        const existing = prevMap.get(n.id);
        return {
          id: n.id,
          type: 'image',
          position: existing ? existing.position : layout[n.id] || { x: 0, y: 0 },
          data: { node: n },
          selected: n.id === selectedId,
        };
      });
    });
    setEdges(
      tree
        .filter((n) => n.parentId)
        .map((n) => {
          const id = `${n.parentId}->${n.id}`;
          return {
            id,
            source: n.parentId,
            target: n.id,
            type: 'smoothstep',
            className: hot.has(id) ? 'hot' : '',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: hot.has(id) ? '#4c82fb' : '#3a3a48',
            },
          };
        })
    );
  }, [tree, selectedId, setNodes, setEdges]);

  const relayout = useCallback(() => {
    const layout = computeLayout(useStore.getState().tree);
    setNodes((ns) => ns.map((n) => ({ ...n, position: layout[n.id] || n.position })));
    setFitNonce((v) => v + 1);
  }, [setNodes]);

  const nodeColor = useCallback(
    (n) => (n.data?.node?.mode === 'edit' ? '#fbbf24' : '#4c82fb'),
    []
  );

  const isEmpty = tree.length === 0;

  return (
    <section className="relative flex min-h-0 flex-col border-line bg-canvas lg:border-r">
      <header className="flex h-[46px] shrink-0 items-center gap-2 border-b border-line px-3.5">
        <TreeStructure size={15} weight="bold" className="text-ink-2" />
        <h2 className="text-[12.5px] font-semibold tracking-[0.01em]">历史时间树</h2>
        <span className="rounded-full border border-line-2 px-2 py-px font-mono text-[10.5px] text-ink-2 tnum">
          {tree.length}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={relayout}
          disabled={isEmpty}
          className="inline-flex items-center gap-1.5 rounded-ctl border border-line-2 px-2.5 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-ink disabled:opacity-40 disabled:hover:border-line-2 disabled:hover:text-ink-2"
        >
          <ArrowsClockwise size={12} weight="bold" />
          重新布局
        </button>
      </header>

      <div className="relative min-h-[340px] flex-1">
        {treeError && (
          <div className="absolute inset-x-3 top-3 z-10 flex items-start gap-2 rounded-ctl border border-err/30 bg-err/10 px-3 py-2 text-[11.5px] text-err">
            <WarningCircle size={14} weight="bold" className="mt-px shrink-0" />
            <span>读取归档失败：{treeError}</span>
          </div>
        )}

        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <TreeStructure size={30} weight="light" className="text-ink-3" />
            <p className="text-[13px] font-medium text-ink-2">时间树还是空的</p>
            <p className="max-w-[34ch] text-[11.5px] leading-relaxed text-ink-3">
              生成或编辑一张图后，这里会长出第一个节点。每个节点都能拖动摆放，也能「基于此编辑」开出新分支。
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, n) => select(n.id)}
            onPaneClick={() => select(null)}
            fitView
            fitViewOptions={{ padding: 0.28, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable
            proOptions={{ hideAttribution: false }}
            key={`fit-${fitNonce}`}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#22222b" />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap position="top-right" pannable zoomable nodeColor={nodeColor} maskColor="rgba(11,11,14,0.75)" />
            <Panel position="bottom-center">
              <p className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10.5px] text-ink-3">
                拖动节点可自由摆放，点击查看详情
              </p>
            </Panel>
          </ReactFlow>
        )}
      </div>
    </section>
  );
}
