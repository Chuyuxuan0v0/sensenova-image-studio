import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkle, PaintBrush } from '@phosphor-icons/react';
import { nodeImage } from '../api.js';

/**
 * 时间树上的一个节点卡片。
 * 文生图 = 根节点（虚线边），图片编辑 = 子节点。
 */
function ImageNode({ data, selected }) {
  const { node } = data;
  const isEdit = node.mode === 'edit';

  return (
    <div
      className={[
        'w-[196px] overflow-hidden rounded-[10px] border bg-surface-2 transition-colors',
        selected ? 'border-accent ring-2 ring-accent/25' : 'border-line-2 hover:border-ink-3',
        node.parentId ? '' : 'border-dashed',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left} />
      <div className="h-[104px] bg-black">
        <img
          src={nodeImage(node.id)}
          alt={`节点 ${node.id}`}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="space-y-1.5 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-accent-ink tnum">{node.id}</span>
          <span
            className={[
              'inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-px text-[9.5px] font-medium',
              isEdit ? 'border-warn/30 text-warn' : 'border-line-2 text-ink-3',
            ].join(' ')}
          >
            {isEdit ? <PaintBrush size={9} weight="bold" /> : <Sparkle size={9} weight="bold" />}
            {isEdit ? '编辑' : '生成'}
          </span>
          <span className="ml-auto font-mono text-[9.5px] text-ink-3 tnum">
            {node.params?.size || 'auto'}
          </span>
        </div>
        <p className="line-clamp-2 h-[26px] text-[10.5px] leading-[13px] text-ink-2">
          {node.prompt || '无 prompt'}
        </p>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(ImageNode);
