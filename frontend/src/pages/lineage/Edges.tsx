import type { LineageEdge, FieldLineageEdge } from '@/types/ontology'
import type { LayoutNode } from './layout'
import { NODE_W, NODE_H, FIELD_ROW_H, EDGE_COLOR, bezier } from './layout'

type OffsetMap = Map<string, { x: number; y: number }>

function nodePos(node: LayoutNode, offsets: OffsetMap) {
  const off = offsets.get(node.id) ?? { x: 0, y: 0 }
  return { x: node.x + off.x, y: node.y + off.y }
}

// ── 节点级边 ──────────────────────────────────────────────────────────────────
interface NodeEdgeProps {
  edge: LineageEdge
  srcNode: LayoutNode
  tgtNode: LayoutNode
  offsets: OffsetMap
  isHovered: boolean
  showLabel: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function NodeEdge({
  edge, srcNode, tgtNode, offsets, isHovered, showLabel, onMouseEnter, onMouseLeave,
}: NodeEdgeProps) {
  const color = EDGE_COLOR[edge.lineageType] ?? '#999999'
  const src = nodePos(srcNode, offsets)
  const tgt = nodePos(tgtNode, offsets)

  const x1 = src.x + NODE_W
  const y1 = src.y + NODE_H / 2
  const x2 = tgt.x
  const y2 = tgt.y + NODE_H / 2
  const d  = bezier(x1, y1, x2, y2)

  const lx = x1 + (x2 - x1) * 0.5
  const ly = y1 + (y2 - y1) * 0.5 - 10

  return (
    <g>
      {/* 宽透明区域用于 hover */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
        style={{ cursor: 'default' }} />
      {/* 实际边 */}
      <path d={d} fill="none"
        stroke={isHovered ? '#1677ff' : color}
        strokeWidth={isHovered ? 2 : 1.5}
        strokeDasharray={edge.lineageType === 'COPY' ? '6 3' : undefined}
        markerEnd={`url(#arrow-${edge.lineageType})`}
        style={{ pointerEvents: 'none', transition: 'stroke 0.1s, stroke-width 0.1s' }} />
      {showLabel && isHovered && (
        <>
          <rect x={lx - 44} y={ly - 9} width={88} height={16} rx={3}
            fill="#fff" stroke={color} strokeWidth={0.8}
            style={{ pointerEvents: 'none' }} />
          <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10}
            fill={color} fontWeight={600}
            fontFamily="ui-monospace,SFMono-Regular,Consolas,monospace"
            style={{ pointerEvents: 'none' }}>
            {edge.lineageType}
          </text>
        </>
      )}
    </g>
  )
}

// ── 字段级边 ──────────────────────────────────────────────────────────────────
interface FieldEdgeProps {
  fe: FieldLineageEdge
  srcNode: LayoutNode
  tgtNode: LayoutNode
  offsets: OffsetMap
  srcExpanded: boolean
  tgtExpanded: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function fieldCenterY(node: LayoutNode, off: { x: number; y: number }, fieldName: string): number | null {
  if (!node.fields) return null
  const idx = node.fields.findIndex(f => f.name === fieldName)
  if (idx < 0) return null
  return node.y + off.y + NODE_H + idx * FIELD_ROW_H + FIELD_ROW_H / 2
}

export function FieldEdge({
  fe, srcNode, tgtNode, offsets, srcExpanded, tgtExpanded,
  isHovered, onMouseEnter, onMouseLeave,
}: FieldEdgeProps) {
  if (!srcExpanded || !tgtExpanded) return null

  const srcOff = offsets.get(srcNode.id) ?? { x: 0, y: 0 }
  const tgtOff = offsets.get(tgtNode.id) ?? { x: 0, y: 0 }

  const y1 = fieldCenterY(srcNode, srcOff, fe.sourceField)
  const y2 = fieldCenterY(tgtNode, tgtOff, fe.targetField)
  if (y1 === null || y2 === null) return null

  const x1 = srcNode.x + srcOff.x + NODE_W
  const x2 = tgtNode.x + tgtOff.x
  const d  = bezier(x1, y1, x2, y2)
  const midX = x1 + (x2 - x1) * 0.5
  const midY = y1 + (y2 - y1) * 0.5
  const strokeColor = isHovered ? '#2d7a2d' : 'rgba(90,158,90,0.5)'

  return (
    <g>
      <path d={d} fill="none" stroke="transparent" strokeWidth={10}
        onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
        style={{ cursor: 'default' }} />
      <path d={d} fill="none"
        stroke={strokeColor}
        strokeWidth={isHovered ? 1.5 : 1}
        markerEnd="url(#arrow-field)"
        style={{ pointerEvents: 'none', transition: 'stroke 0.1s, stroke-width 0.1s' }} />
      {fe.transformOp && isHovered && (
        <>
          <rect x={midX - 50} y={midY - 9} width={100} height={16} rx={3}
            fill="#fff" stroke="rgba(90,158,90,0.4)" strokeWidth={0.8}
            style={{ pointerEvents: 'none' }} />
          <text x={midX} y={midY + 3} textAnchor="middle" fontSize={9}
            fill="#2d7a2d"
            fontFamily="ui-monospace,SFMono-Regular,Consolas,monospace"
            style={{ pointerEvents: 'none' }}>
            {fe.transformOp}
          </text>
        </>
      )}
    </g>
  )
}

// ── SVG defs ──────────────────────────────────────────────────────────────────
export function EdgeDefs() {
  return (
    <defs>
      {Object.entries(EDGE_COLOR).map(([type, color]) => (
        <marker key={type} id={`arrow-${type}`}
          markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill={color} />
        </marker>
      ))}
      <marker id="arrow-field"
        markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M0,0 L0,6 L6,3 z" fill="rgba(90,158,90,0.7)" />
      </marker>
    </defs>
  )
}

export function getHighlightedFields(
  nodeId: string,
  hoveredFieldEdgeId: string | null,
  fieldEdges: FieldLineageEdge[],
): Set<string> {
  if (!hoveredFieldEdgeId) return new Set()
  const fe = fieldEdges.find(e => e.id === hoveredFieldEdgeId)
  if (!fe) return new Set()
  const fields = new Set<string>()
  if (fe.sourceNodeId === nodeId) fields.add(fe.sourceField)
  if (fe.targetNodeId === nodeId) fields.add(fe.targetField)
  return fields
}
