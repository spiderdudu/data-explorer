import type { LineageField } from '@/types/ontology'
import type { LayoutNode } from './layout'
import { NODE_W, NODE_H, FIELD_ROW_H, nodeHeight, nodeHeaderColor } from './layout'

interface NodeCardProps {
  node: LayoutNode
  expanded: boolean
  highlightedFields: Set<string>
  offsetX: number
  offsetY: number
  onToggleExpand: (id: string) => void
  onNavigate: (urn: string) => void
  onFieldMouseEnter: (nodeId: string, field: string) => void
  onFieldMouseLeave: () => void
  onDragStart: (id: string, e: React.MouseEvent) => void
}

export function NodeCard({
  node, expanded, highlightedFields,
  offsetX, offsetY,
  onToggleExpand, onNavigate,
  onFieldMouseEnter, onFieldMouseLeave,
  onDragStart,
}: NodeCardProps) {
  const isFocus   = node.isFocus ?? false
  const h         = nodeHeight(node, expanded)
  const hasFields = (node.fields?.length ?? 0) > 0
  const x         = node.x + offsetX
  const y         = node.y + offsetY
  const headerColor = nodeHeaderColor(node.col, isFocus)

  // 截断表名
  const label = (node.displayName ?? node.name).length > 22
    ? (node.displayName ?? node.name).slice(0, 20) + '…'
    : (node.displayName ?? node.name)

  const totalH = h

  return (
    <g transform={`translate(${x}, ${y})`} data-interactive="true">
      {/* 外边框 */}
      <rect
        width={NODE_W} height={totalH}
        rx={2} ry={2}
        fill="#ffffff"
        stroke={isFocus ? headerColor : '#cccccc'}
        strokeWidth={isFocus ? 1.5 : 1}
      />

      {/* Header 色块 */}
      <rect
        width={NODE_W} height={NODE_H}
        rx={2} ry={2}
        fill={headerColor}
      />
      {/* 遮住 header 底部圆角 */}
      <rect
        y={NODE_H - 2} width={NODE_W} height={2}
        fill={headerColor}
      />

      {/* 整个 header 可拖拽 + 点击跳转（展开按钮区域除外） */}
      <rect
        width={NODE_W} height={NODE_H}
        fill="transparent"
        style={{ cursor: 'move' }}
        onMouseDown={e => onDragStart(node.id, e)}
        onClick={() => onNavigate(node.urn)}
      />

      {/* 表名 */}
      <text
        x={NODE_W / 2} y={NODE_H / 2 + 5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill="#ffffff"
        fontFamily="ui-monospace,SFMono-Regular,Consolas,monospace"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>

      {/* platform · env 小字 */}
      <text
        x={NODE_W / 2} y={NODE_H / 2 - 8}
        textAnchor="middle"
        fontSize={9}
        fill="rgba(255,255,255,0.65)"
        fontFamily="system-ui,sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {node.platform} · {node.env}
      </text>

      {/* 展开/折叠按钮 */}
      {hasFields && (
        <g
          transform={`translate(${NODE_W - 22}, ${NODE_H / 2 - 7})`}
          style={{ cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); onToggleExpand(node.id) }}
        >
          <rect width={16} height={14} rx={2}
            fill="rgba(255,255,255,0.2)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.8}
          />
          {expanded
            ? <path d="M3 9 L8 4 L13 9"  fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M3 5 L8 10 L13 5" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          }
        </g>
      )}

      {/* 字段列表 */}
      {expanded && node.fields?.map((field: LineageField, i: number) => {
        const fy   = NODE_H + i * FIELD_ROW_H
        const isHl = highlightedFields.has(field.name)
        return (
          <g
            key={field.name}
            onMouseEnter={() => onFieldMouseEnter(node.id, field.name)}
            onMouseLeave={onFieldMouseLeave}
          >
            {/* 高亮背景 */}
            {isHl && (
              <rect x={1} y={fy} width={NODE_W - 2} height={FIELD_ROW_H}
                fill="#e8f4e8" />
            )}
            {/* 分隔线（除最后一行） */}
            {i > 0 && (
              <line x1={0} y1={fy} x2={NODE_W} y2={fy}
                stroke="#eeeeee" strokeWidth={0.5} />
            )}
            {/* PK 标记 */}
            {field.isPk && (
              <text x={8} y={fy + 15} fontSize={9} fill="#e6a817"
                fontWeight={700} fontFamily="ui-monospace,SFMono-Regular,Consolas,monospace"
                style={{ userSelect: 'none' }}>
                PK
              </text>
            )}
            {/* 字段名 */}
            <text
              x={field.isPk ? 26 : 8} y={fy + 15}
              fontSize={11}
              fill={isHl ? '#2d7a2d' : '#333333'}
              fontFamily="ui-monospace,SFMono-Regular,Consolas,monospace"
              style={{ userSelect: 'none' }}
            >
              {field.name}
            </text>
            {/* 数据类型 */}
            <text
              x={NODE_W - 6} y={fy + 15}
              fontSize={10} textAnchor="end"
              fill="#999999"
              fontFamily="ui-monospace,SFMono-Regular,Consolas,monospace"
              style={{ userSelect: 'none' }}
            >
              {field.dataType}
            </text>
            {/* 连接点（右侧） */}
            <circle
              cx={NODE_W} cy={fy + FIELD_ROW_H / 2}
              r={3} fill="#cccccc" stroke="#ffffff" strokeWidth={1}
              style={{ pointerEvents: 'none' }}
            />
            {/* 连接点（左侧） */}
            <circle
              cx={0} cy={fy + FIELD_ROW_H / 2}
              r={3} fill="#cccccc" stroke="#ffffff" strokeWidth={1}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      })}

      {/* 节点右侧连接点（未展开时） */}
      {!expanded && (
        <circle cx={NODE_W} cy={NODE_H / 2} r={3}
          fill="#aaaaaa" stroke="#ffffff" strokeWidth={1}
          style={{ pointerEvents: 'none' }} />
      )}
      {/* 节点左侧连接点（未展开时） */}
      {!expanded && (
        <circle cx={0} cy={NODE_H / 2} r={3}
          fill="#aaaaaa" stroke="#ffffff" strokeWidth={1}
          style={{ pointerEvents: 'none' }} />
      )}
    </g>
  )
}
