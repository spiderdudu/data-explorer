import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Spin, Empty, Select, Button, Space, Typography, Tag, Tooltip } from 'antd'
import {
  ArrowLeftOutlined, ReloadOutlined, DatabaseOutlined,
  FullscreenOutlined, PlusOutlined, MinusOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ontologyApi } from '@/api/ontology'
import { computeLayout, EDGE_COLOR } from '../../lineage/layout'
import { NodeCard } from '../../lineage/NodeCard'
import { NodeEdge, FieldEdge, EdgeDefs, getHighlightedFields } from '../../lineage/Edges'
import { useMemo, useRef, useCallback, useEffect } from 'react'
import type { LineageEdge, FieldLineageEdge } from '@/types/ontology'

const { Text } = Typography
type OffsetMap = Map<string, { x: number; y: number }>

function LineageCanvas({
  lineage, showEdgeLabel, onNavigate,
}: {
  lineage: NonNullable<Awaited<ReturnType<typeof ontologyApi.getLineage>>>
  showEdgeLabel: boolean
  onNavigate: (urn: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [expandedIds, setExpandedIds]           = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded]           = useState(false)
  const [transform, setTransform]               = useState({ x: 60, y: 60, scale: 1 })
  const [hoveredEdge, setHoveredEdge]           = useState<string | null>(null)
  const [hoveredFieldEdge, setHoveredFieldEdge] = useState<string | null>(null)
  const [nodeOffsets, setNodeOffsets]           = useState<OffsetMap>(new Map())
  const [cursor, setCursor]                     = useState<'grab' | 'grabbing'>('grab')

  const draggingNode  = useRef<string | null>(null)
  const dragStartPos  = useRef({ x: 0, y: 0 })
  const dragStartOff  = useRef({ x: 0, y: 0 })
  const isPanning     = useRef(false)
  const lastPos       = useRef({ x: 0, y: 0 })
  const scaleRef       = useRef(1)
  const nodeOffsetsRef = useRef<OffsetMap>(new Map())
  const didDragRef     = useRef(false)

  useEffect(() => { nodeOffsetsRef.current = nodeOffsets }, [nodeOffsets])
  useEffect(() => { scaleRef.current = transform.scale }, [transform.scale])

  const { nodes: layoutNodes, canvasW, canvasH } = useMemo(
    () => computeLayout(lineage, expandedIds),
    [lineage, expandedIds],
  )
  const nodeMap = useMemo(() => new Map(layoutNodes.map(n => [n.id, n])), [layoutNodes])

  const fitView = useCallback(() => {
    if (!svgRef.current || canvasW === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const scale = Math.min(1, (rect.width - 80) / canvasW, (rect.height - 80) / canvasH)
    setTransform({
      x: (rect.width  - canvasW * scale) / 2,
      y: (rect.height - canvasH * scale) / 2,
      scale,
    })
  }, [canvasW, canvasH])

  useEffect(() => {
    fitView()
    setNodeOffsets(new Map())
  }, [lineage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingNode.current) {
        const dx = (e.clientX - dragStartPos.current.x) / scaleRef.current
        const dy = (e.clientY - dragStartPos.current.y) / scaleRef.current
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true
        setNodeOffsets(prev => {
          const next = new Map(prev)
          next.set(draggingNode.current!, {
            x: dragStartOff.current.x + dx,
            y: dragStartOff.current.y + dy,
          })
          return next
        })
        return
      }
      if (!isPanning.current) return
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      lastPos.current = { x: e.clientX, y: e.clientY }
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
    }
    const onUp = () => {
      draggingNode.current = null
      isPanning.current = false
      setCursor('grab')
      setTimeout(() => { didDragRef.current = false }, 0)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allExpanded) { setExpandedIds(new Set()); setAllExpanded(false) }
    else { setExpandedIds(new Set(lineage.nodes.map(n => n.id))); setAllExpanded(true) }
  }, [allExpanded, lineage.nodes])

  const zoom = useCallback((delta: number) => {
    setTransform(t => ({ ...t, scale: Math.min(2.5, Math.max(0.2, t.scale * delta)) }))
  }, [])

  const onNodeDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    didDragRef.current = false
    draggingNode.current = id
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    const cur = nodeOffsetsRef.current.get(id) ?? { x: 0, y: 0 }
    dragStartOff.current = { ...cur }
    setCursor('grabbing')
  }, [])

  const onSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return
    e.preventDefault()
    isPanning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    setCursor('grabbing')
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => {
      const newScale = Math.min(2.5, Math.max(0.2, t.scale * delta))
      const ratio = newScale / t.scale
      return { scale: newScale, x: mx - ratio * (mx - t.x), y: my - ratio * (my - t.y) }
    })
  }, [])

  const fieldEdges: FieldLineageEdge[] = lineage.fieldEdges ?? []

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', userSelect: 'none' }}>
      {/* 右上角控制条 */}
      <div style={{
        position: 'absolute', top: 12, right: 14, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(255,255,255,0.95)', border: '1px solid #d9d9d9',
        borderRadius: 6, padding: '4px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Button size="small" type={allExpanded ? 'primary' : 'default'}
          onClick={toggleAll} style={{ fontSize: 12 }}>
          {allExpanded ? '收起' : '展开'}
        </Button>
        <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 2px' }} />
        <Button size="small" icon={<MinusOutlined />} onClick={() => zoom(0.85)}
          style={{ width: 26, height: 26, padding: 0 }} />
        <Text style={{ fontSize: 11, color: '#8c8c8c', minWidth: 34, textAlign: 'center' }}>
          {Math.round(transform.scale * 100)}%
        </Text>
        <Button size="small" icon={<PlusOutlined />} onClick={() => zoom(1.15)}
          style={{ width: 26, height: 26, padding: 0 }} />
        <div style={{ width: 1, height: 16, background: '#e8e8e8', margin: '0 2px' }} />
        <Tooltip title="适应视图">
          <Button size="small" icon={<FullscreenOutlined />} onClick={fitView}
            style={{ width: 26, height: 26, padding: 0 }} />
        </Tooltip>
      </div>

      {/* 左下角图例 */}
      <div style={{
        position: 'absolute', bottom: 14, left: 14, zIndex: 10,
        background: 'rgba(255,255,255,0.92)', border: '1px solid #e8e8e8',
        borderRadius: 6, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {Object.entries(EDGE_COLOR).map(([type, color]) => (
          <Space key={type} size={6}>
            <svg width={32} height={12} style={{ display: 'block' }}>
              <line x1={0} y1={6} x2={22} y2={6} stroke={color} strokeWidth={1.5}
                strokeDasharray={type === 'COPY' ? '5 3' : undefined} />
              <polygon points="22,3 30,6 22,9" fill={color} />
            </svg>
            <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{type}</Text>
          </Space>
        ))}
        <Space size={6}>
          <svg width={32} height={12} style={{ display: 'block' }}>
            <line x1={0} y1={6} x2={22} y2={6} stroke="rgba(90,158,90,0.6)" strokeWidth={1} />
            <polygon points="22,4 30,6 22,8" fill="rgba(90,158,90,0.6)" />
          </svg>
          <Text style={{ fontSize: 11, color: '#8c8c8c' }}>字段级</Text>
        </Space>
      </div>

      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', background: '#e8e8e8', cursor, display: 'block' }}
        onMouseDown={onSvgMouseDown}
        onWheel={onWheel}
      >
        <EdgeDefs />
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {lineage.edges.map((edge: LineageEdge) => {
            const src = nodeMap.get(edge.source)
            const tgt = nodeMap.get(edge.target)
            if (!src || !tgt) return null
            return (
              <NodeEdge key={edge.id} edge={edge} srcNode={src} tgtNode={tgt}
                offsets={nodeOffsets} showLabel={showEdgeLabel}
                isHovered={hoveredEdge === edge.id}
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)} />
            )
          })}
          {fieldEdges.map((fe: FieldLineageEdge) => {
            const src = nodeMap.get(fe.sourceNodeId)
            const tgt = nodeMap.get(fe.targetNodeId)
            if (!src || !tgt) return null
            return (
              <FieldEdge key={fe.id} fe={fe} srcNode={src} tgtNode={tgt}
                offsets={nodeOffsets}
                srcExpanded={expandedIds.has(fe.sourceNodeId)}
                tgtExpanded={expandedIds.has(fe.targetNodeId)}
                isHovered={hoveredFieldEdge === fe.id}
                onMouseEnter={() => setHoveredFieldEdge(fe.id)}
                onMouseLeave={() => setHoveredFieldEdge(null)} />
            )
          })}
          {layoutNodes.map(node => (
            <NodeCard key={node.id} node={node}
              expanded={expandedIds.has(node.id)}
              highlightedFields={getHighlightedFields(node.id, hoveredFieldEdge, fieldEdges)}
              offsetX={nodeOffsets.get(node.id)?.x ?? 0}
              offsetY={nodeOffsets.get(node.id)?.y ?? 0}
              onToggleExpand={toggleExpand}
              onNavigate={urn => { if (!didDragRef.current) onNavigate(urn) }}
              onFieldMouseEnter={() => {}}
              onFieldMouseLeave={() => {}}
              onDragStart={onNodeDragStart}
            />
          ))}
        </g>
        <text x={10} y={20} fontSize={10} fill="#aaaaaa" fontFamily="system-ui,sans-serif"
          style={{ userSelect: 'none' }}>
          滚轮缩放 · 拖拽画布平移 · 拖拽卡片移动 · 点击表名跳转
        </text>
      </svg>
    </div>
  )
}

export default function LineageTab({ focusUrn, onNavigate }: {
  focusUrn?: string
  onNavigate: (urn: string) => void
}) {
  const navigate = useNavigate()

  const { data: lineage, isLoading, refetch } = useQuery({
    queryKey: ['lineage', focusUrn],
    queryFn: () => ontologyApi.getLineage(focusUrn ?? ''),
  })
  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => ontologyApi.getDatasets(),
  })

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* 精简工具栏 */}
      <div style={{
        padding: '6px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        {focusUrn && (
          <Button size="small" icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/graph')}>
            全局视图
          </Button>
        )}
        <DatabaseOutlined style={{ color: '#5a9e5a' }} />
        <Select
          placeholder="跳转到数据集..."
          style={{ width: 280 }}
          showSearch allowClear
          value={focusUrn}
          onChange={val => val
            ? navigate(`/graph/${encodeURIComponent(val)}`)
            : navigate('/graph')}
          options={datasets?.items.map(d => ({ label: d.name, value: d.urn }))}
          filterOption={(input, opt) =>
            (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
        />
        <Tooltip title="刷新">
          <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()} />
        </Tooltip>
        {focusUrn && (
          <Tag color="green" style={{ fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 'auto' }}>
            {focusUrn.replace(/^urn:xs:\w+:\([\w]+,/, '').replace(/,\w+\)$/, '')}
          </Tag>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" />
          </div>
        )}
        {!isLoading && lineage && lineage.nodes.length > 0 && (
          <LineageCanvas lineage={lineage} showEdgeLabel={true} onNavigate={onNavigate} />
        )}
        {!isLoading && (!lineage || lineage.nodes.length === 0) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Empty description="暂无血缘数据" />
          </div>
        )}
      </div>
    </div>
  )
}
