import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Typography, Tag, Space, Spin, Empty, Badge } from 'antd'
import { ontologyApi } from '@/api/ontology'
import type { OntEntityLink } from '@/types/ontology'

const { Text } = Typography

// ── 常量 ──────────────────────────────────────────────────────────────────────
const NODE_W = 150
const NODE_H = 38
const COL_GAP = 220
const ROW_GAP = 56
const PAD = 40

const TYPE_HEX: Record<string, string> = {
  Dataset: '#1677ff', Domain: '#52c41a', Container: '#13c2c2',
  Action: '#fa8c16', MarketEvent: '#faad14', Client: '#eb2f96',
  Strategy: '#722ed1', Instance: '#13c2c2',
}

const LINK_HEX: Record<string, string> = {
  DATASET_IN_CONTAINER:        '#13c2c2',
  CONTAINER_IN_INSTANCE:       '#13c2c2',
  DATASET_IN_DOMAIN:           '#52c41a',
  DOMAIN_IN_DOMAIN:            '#52c41a',
  DATASET_DERIVED_FROM:        '#1677ff',
  CLIENT_SUBSCRIBES_DATASET:   '#eb2f96',
  CLIENT_RUNS_STRATEGY:        '#eb2f96',
  STRATEGY_RUNS_ON_DATASET:    '#722ed1',
  STRATEGY_READS_DATASET:      '#9254de',
  STRATEGY_WRITES_DATASET:     '#531dab',
  STRATEGY_TRIGGERED_BY_EVENT: '#faad14',
  STRATEGY_HEDGES_STRATEGY:    '#722ed1',
  EVENT_AFFECTS_DATASET:       '#faad14',
  EVENT_TRIGGERS_ACTION:       '#fa8c16',
  ACTION_APPLIES_TO:           '#fa8c16',
}

const CATEGORY_SECTIONS = [
  {
    key: 'physical',
    label: '物理归属',
    color: '#13c2c2',
    names: ['DATASET_IN_CONTAINER', 'CONTAINER_IN_INSTANCE', 'DATASET_IN_DOMAIN', 'DOMAIN_IN_DOMAIN', 'DATASET_DERIVED_FROM'],
    // 列顺序：左→右
    colOrder: ['Dataset', 'Container', 'Domain', 'Instance'],
  },
  {
    key: 'client',
    label: '客户关系',
    color: '#eb2f96',
    names: ['CLIENT_SUBSCRIBES_DATASET', 'CLIENT_RUNS_STRATEGY'],
    colOrder: ['Client', 'Strategy', 'Dataset'],
  },
  {
    key: 'strategy',
    label: '策略关系',
    color: '#722ed1',
    names: ['STRATEGY_RUNS_ON_DATASET', 'STRATEGY_READS_DATASET', 'STRATEGY_WRITES_DATASET', 'STRATEGY_TRIGGERED_BY_EVENT', 'STRATEGY_HEDGES_STRATEGY'],
    colOrder: ['MarketEvent', 'Strategy', 'Dataset'],
  },
  {
    key: 'event',
    label: '事件分析',
    color: '#faad14',
    names: ['EVENT_AFFECTS_DATASET', 'EVENT_TRIGGERS_ACTION', 'ACTION_APPLIES_TO'],
    colOrder: ['MarketEvent', 'Dataset', 'Strategy', 'Action'],
  },
]

function typeFromUrn(urn: string) {
  return urn.match(/^urn:xs:(\w+):/)?.[1] ?? 'Entity'
}

// ── 图布局计算 ────────────────────────────────────────────────────────────────
interface GraphNode {
  id: string   // urn
  name: string
  type: string
  col: number
  row: number
  x: number
  y: number
}

interface GraphEdge {
  id: number
  source: string
  target: string
  linkTypeName: string
  linkTypeDisplayName: string
  isDirected: boolean
  qualifier?: string
}

function buildGraph(links: OntEntityLink[], colOrder: string[]): {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
} {
  // 收集所有唯一节点
  const nodeMap = new Map<string, { name: string; type: string }>()
  for (const l of links) {
    nodeMap.set(l.sourceUrn, { name: l.sourceName, type: typeFromUrn(l.sourceUrn) })
    nodeMap.set(l.targetUrn, { name: l.targetName, type: typeFromUrn(l.targetUrn) })
  }

  // 按 colOrder 分列，同列内按出现顺序排行
  const colMap = new Map<string, string[]>() // type → urns
  for (const [urn, { type }] of nodeMap) {
    if (!colMap.has(type)) colMap.set(type, [])
    colMap.get(type)!.push(urn)
  }

  // 确定列索引（colOrder 里没有的类型追加到末尾）
  const allTypes = [...new Set([...colOrder, ...[...colMap.keys()].filter(t => !colOrder.includes(t))])]
  const colIndex = new Map(allTypes.map((t, i) => [t, i]))

  const nodes: GraphNode[] = []
  for (const [urn, { name, type }] of nodeMap) {
    const col = colIndex.get(type) ?? 0
    const row = (colMap.get(type) ?? []).indexOf(urn)
    nodes.push({ id: urn, name, type, col, row, x: 0, y: 0 })
  }

  // 计算坐标
  for (const n of nodes) {
    n.x = PAD + n.col * (NODE_W + COL_GAP)
    n.y = PAD + n.row * (NODE_H + ROW_GAP)
  }

  const usedCols = [...new Set(nodes.map(n => n.col))]
  const maxRow   = Math.max(...nodes.map(n => n.row))
  const width    = PAD * 2 + (usedCols.length - 1) * (NODE_W + COL_GAP) + NODE_W
  const height   = PAD * 2 + maxRow * (NODE_H + ROW_GAP) + NODE_H

  const edges: GraphEdge[] = links.map(l => ({
    id: l.id,
    source: l.sourceUrn,
    target: l.targetUrn,
    linkTypeName: l.linkTypeName,
    linkTypeDisplayName: l.linkTypeDisplayName,
    isDirected: true,
    qualifier: l.qualifier,
  }))

  return { nodes, edges, width, height }
}

// ── SVG 图 ────────────────────────────────────────────────────────────────────
function EntityGraph({ links, colOrder }: { links: OntEntityLink[]; colOrder: string[] }) {
  const { nodes, edges, width, height } = useMemo(
    () => buildGraph(links, colOrder),
    [links, colOrder],
  )

  const nodePos = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  // 列标题（类型名）
  const colHeaders = useMemo(() => {
    const map = new Map<number, string>()
    for (const n of nodes) map.set(n.col, n.type)
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [nodes])

  const HEADER_H = 28

  return (
    <svg
      width={width}
      height={height + HEADER_H}
      style={{ display: 'block', minWidth: width }}
    >
      <defs>
        {Object.entries(LINK_HEX).map(([name, color]) => (
          <marker key={name} id={`arr-${name}`} markerWidth="8" markerHeight="8"
            refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* 列标题 */}
      {colHeaders.map(([col, type]) => (
        <g key={col}>
          <rect
            x={PAD + col * (NODE_W + COL_GAP) - 4}
            y={4}
            width={NODE_W + 8}
            height={HEADER_H - 6}
            rx={4}
            fill={TYPE_HEX[type] ?? '#8c8c8c'}
            opacity={0.12}
          />
          <text
            x={PAD + col * (NODE_W + COL_GAP) + NODE_W / 2}
            y={HEADER_H - 10}
            textAnchor="middle"
            fontSize={11}
            fontWeight="600"
            fill={TYPE_HEX[type] ?? '#8c8c8c'}
            fontFamily="system-ui,sans-serif"
          >
            {type}
          </text>
        </g>
      ))}

      <g transform={`translate(0,${HEADER_H})`}>
        {/* 边 */}
        {edges.map(edge => {
          const src = nodePos.get(edge.source)
          const tgt = nodePos.get(edge.target)
          if (!src || !tgt) return null
          const color = LINK_HEX[edge.linkTypeName] ?? '#8c8c8c'

          // 同列自环（如 STRATEGY_HEDGES_STRATEGY）
          const isSameCol = src.col === tgt.col
          let d: string
          if (isSameCol) {
            const x1 = src.x + NODE_W
            const y1 = src.y + NODE_H / 2
            const x2 = tgt.x + NODE_W
            const y2 = tgt.y + NODE_H / 2
            const cx = x1 + 60
            d = `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`
          } else {
            const x1 = src.col < tgt.col ? src.x + NODE_W : src.x
            const y1 = src.y + NODE_H / 2
            const x2 = src.col < tgt.col ? tgt.x : tgt.x + NODE_W
            const y2 = tgt.y + NODE_H / 2
            const mx = (x1 + x2) / 2
            d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
          }

          const midX = isSameCol
            ? src.x + NODE_W + 30
            : (src.x + NODE_W / 2 + tgt.x + NODE_W / 2) / 2
          const midY = (src.y + tgt.y) / 2 + NODE_H / 2 - 6

          return (
            <g key={edge.id}>
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.7}
                markerEnd={`url(#arr-${edge.linkTypeName})`}
              />
              {/* 关联类型标签 */}
              <text
                x={midX}
                y={midY}
                textAnchor="middle"
                fontSize={10}
                fill={color}
                fontFamily="system-ui,sans-serif"
                style={{ userSelect: 'none' }}
              >
                {edge.linkTypeDisplayName}
                {edge.qualifier ? ` [${edge.qualifier}]` : ''}
              </text>
            </g>
          )
        })}

        {/* 节点 */}
        {nodes.map(node => {
          const color = TYPE_HEX[node.type] ?? '#8c8c8c'
          return (
            <g key={node.id}>
              <rect
                x={node.x} y={node.y}
                width={NODE_W} height={NODE_H}
                rx={6}
                fill="#fff"
                stroke={color}
                strokeWidth={1.5}
              />
              {/* 左侧色条 */}
              <rect x={node.x} y={node.y} width={4} height={NODE_H} rx={3} fill={color} />
              <text
                x={node.x + 12}
                y={node.y + NODE_H / 2 + 4}
                fontSize={12}
                fontWeight="600"
                fill="#262626"
                fontFamily="system-ui,sans-serif"
                style={{ userSelect: 'none' }}
              >
                {node.name.length > 14 ? node.name.slice(0, 13) + '…' : node.name}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ── 左侧分组卡片 ──────────────────────────────────────────────────────────────
function CategoryCard({ section, linkCount, selected, onClick }: {
  section: typeof CATEGORY_SECTIONS[0]
  linkCount: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', cursor: 'pointer',
        background: selected ? '#f0f5ff' : '#fff',
        borderLeft: `3px solid ${selected ? section.color : 'transparent'}`,
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 13, color: selected ? section.color : undefined }}>
          {section.label}
        </Text>
        <Badge count={linkCount} color={section.color} style={{ fontSize: 10 }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {section.names.map(name => (
          <Tag key={name} style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>
            {name.replace(/_/g, ' ').toLowerCase()}
          </Tag>
        ))}
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function EntityLinksTab() {
  const [selectedKey, setSelectedKey] = useState<string>('strategy')

  const { data: entityLinks, isLoading } = useQuery({
    queryKey: ['entityLinks'],
    queryFn: () => ontologyApi.getEntityLinks(),
  })

  const countBySection = useMemo(() => {
    const result: Record<string, number> = {}
    for (const section of CATEGORY_SECTIONS) {
      result[section.key] = (entityLinks ?? []).filter(l => section.names.includes(l.linkTypeName)).length
    }
    return result
  }, [entityLinks])

  const selectedSection = CATEGORY_SECTIONS.find(s => s.key === selectedKey)!
  const sectionLinks = (entityLinks ?? []).filter(l => selectedSection.names.includes(l.linkTypeName))

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* 左侧：分组列表 */}
      <div style={{
        width: 200, flexShrink: 0,
        background: '#fafafa', borderRight: '1px solid #f0f0f0',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '10px 14px 6px' }}>
          <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            关联分组
          </Text>
        </div>
        {CATEGORY_SECTIONS.map(section => (
          <CategoryCard
            key={section.key}
            section={section}
            linkCount={countBySection[section.key] ?? 0}
            selected={section.key === selectedKey}
            onClick={() => setSelectedKey(section.key)}
          />
        ))}
      </div>

      {/* 右侧：图 */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#f0f2f5', position: 'relative' }}>
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin />
          </div>
        )}
        {!isLoading && sectionLinks.length === 0 && (
          <Empty description="暂无关联实例" style={{ marginTop: 80 }} />
        )}
        {!isLoading && sectionLinks.length > 0 && (
          <div style={{ padding: 24 }}>
            {/* 分组标题 */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 16, borderRadius: 2, background: selectedSection.color }} />
              <Text strong style={{ fontSize: 15, color: selectedSection.color }}>
                {selectedSection.label}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {sectionLinks.length} 条关联实例
              </Text>
            </div>
            <div style={{
              background: '#fff', borderRadius: 8,
              border: '1px solid #e8e8e8',
              padding: 20, overflowX: 'auto',
            }}>
              <EntityGraph links={sectionLinks} colOrder={selectedSection.colOrder} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
