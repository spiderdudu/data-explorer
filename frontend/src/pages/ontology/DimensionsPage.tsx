import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tag, Typography, Table, Empty, Badge, Collapse } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DatabaseOutlined, RobotOutlined, ApiOutlined,
  TagsOutlined, ContainerOutlined, RightOutlined, LockOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { OntAspect, OntClassifierValue, OntProperty, OntType } from '@/types/ontology'

const { Text } = Typography

// ── 颜色 ──────────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  database: 'blue', stream: 'purple', file: 'orange',
  api: 'magenta', internal: 'cyan', external: 'default',
  signal: 'green', spread: 'purple', quoting: 'geekblue',
  event: 'gold', algo: 'orange',
}

const DATA_TYPE_COLOR: Record<string, string> = {
  string: 'blue', integer: 'cyan', decimal: 'geekblue', boolean: 'green',
  date: 'orange', datetime: 'orange', enum: 'purple', ref: 'magenta', json: 'volcano',
}

// ── Entity Type 配置 ──────────────────────────────────────────────────────────

interface EntityTypeDef {
  typeId: number
  name: string
  label: string
  icon: React.ReactNode
  dimTypeName: string
}

const ENTITY_TYPES: EntityTypeDef[] = [
  { typeId: 11, name: 'Instance',  label: 'Instance',  icon: <DatabaseOutlined />,   dimTypeName: 'platform' },
  { typeId: 3,  name: 'Container', label: 'Container', icon: <ContainerOutlined />,  dimTypeName: 'container_type' },
  { typeId: 10, name: 'Strategy',  label: 'Strategy',  icon: <RobotOutlined />,      dimTypeName: 'strategy_type' },
  { typeId: 4,  name: 'Action',    label: 'Action',    icon: <ApiOutlined />,        dimTypeName: 'action_type' },
  { typeId: 5,  name: 'Event',     label: 'Event',     icon: <TagsOutlined />,       dimTypeName: 'event_type' },
]

// ── Property 表格列 ───────────────────────────────────────────────────────────

const PROP_COLUMNS: ColumnsType<OntProperty> = [
  {
    title: 'Name', dataIndex: 'name', key: 'name', width: 160,
    render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
  },
  {
    title: 'Display Name', dataIndex: 'displayName', key: 'displayName', width: 130,
    render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
  },
  {
    title: 'Type', dataIndex: 'dataType', key: 'dataType', width: 80,
    render: (t: string) => <Tag color={DATA_TYPE_COLOR[t] ?? 'default'} style={{ fontSize: 10 }}>{t}</Tag>,
  },
  {
    title: 'Req', dataIndex: 'isRequired', key: 'isRequired', width: 50, align: 'center' as const,
    render: (v: boolean) => v ? <Badge status="error" /> : <Badge status="default" />,
  },
  {
    title: 'Multi', dataIndex: 'isMulti', key: 'isMulti', width: 50, align: 'center' as const,
    render: (v: boolean) => v ? <Badge status="processing" /> : <Badge status="default" />,
  },
  {
    title: 'Description', dataIndex: 'description', key: 'description',
    render: (d: string) => d ? <Text type="secondary" style={{ fontSize: 11 }}>{d}</Text> : '—',
  },
]

// ── 右栏：Aspect + Property 展示 ──────────────────────────────────────────────

function AspectPanel({ aspects, properties, types, commonAspects }: {
  aspects: OntAspect[]
  properties: OntProperty[]
  types: OntType[]
  commonAspects: OntAspect[]
}) {
  const makeItems = (list: OntAspect[], isCommon: boolean) =>
    list.map(aspect => {
      const props = properties.filter(p => p.aspectId === aspect.id)
      const typeName = types.find(t => t.id === aspect.typeId)?.displayName ?? ''
      return {
        key: String(aspect.id),
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isCommon && <LockOutlined style={{ color: '#8c8c8c', fontSize: 11 }} />}
            <Text strong style={{ fontSize: 13 }}>{aspect.displayName}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>({aspect.name})</Text>
            <Badge count={props.length} color="geekblue" style={{ fontSize: 10 }} />
            {aspect.description && (
              <Text type="secondary" style={{ fontSize: 11 }}>— {aspect.description}</Text>
            )}
          </div>
        ),
        children: props.length > 0 ? (
          <Table
            columns={PROP_COLUMNS}
            dataSource={props}
            rowKey="id"
            size="small"
            pagination={false}
          />
        ) : (
          <Empty description="No properties" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ),
      }
    })

  const specificItems = makeItems(aspects, false)
  const commonItems   = makeItems(commonAspects, true)

  if (specificItems.length === 0 && commonItems.length === 0) {
    return <Empty description="No aspects defined" style={{ marginTop: 40 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {specificItems.length > 0 && (
        <div>
          <Text style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Specific Aspects
          </Text>
          <Collapse size="small" defaultActiveKey={specificItems.map(i => i.key)} items={specificItems} />
        </div>
      )}
      {commonItems.length > 0 && (
        <div>
          <Text style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            <LockOutlined style={{ marginRight: 4 }} />Common Aspects (all {aspects[0] ? '' : ''})
          </Text>
          <Collapse size="small" defaultActiveKey={commonItems.map(i => i.key)} items={commonItems} />
        </div>
      )}
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function MetaModelPage() {
  const [selectedTypeIdx, setSelectedTypeIdx] = useState(0)
  const [selectedDimId,   setSelectedDimId]   = useState<number | null>(null)

  const { data: classifierValues } = useQuery({ queryKey: ['classifierValues'], queryFn: () => ontologyApi.getClassifierValues() })
  const { data: aspects    } = useQuery({ queryKey: ['aspects'],        queryFn: () => ontologyApi.getAspects() })
  const { data: properties } = useQuery({ queryKey: ['properties'],     queryFn: () => ontologyApi.getProperties() })
  const { data: types      } = useQuery({ queryKey: ['types'],          queryFn: () => ontologyApi.getTypes() })

  const selectedEntityType = ENTITY_TYPES[selectedTypeIdx]

  // 当前 Entity Type 下的 Classifier Values
  const dimValues = useMemo(() => {
    return (classifierValues ?? []).filter(d => d.classifierName === selectedEntityType.dimTypeName)
  }, [classifierValues, selectedEntityType])

  // 默认选中第一个 dim
  const effectiveDimId = selectedDimId ?? dimValues[0]?.id ?? null
  const selectedDim    = dimValues.find(d => d.id === effectiveDimId) ?? null

  // 切换 Entity Type 时重置 dim 选择
  function handleSelectType(idx: number) {
    setSelectedTypeIdx(idx)
    setSelectedDimId(null)
  }

  // 右栏：该 classifier value 的专属 aspects + 该 type 的通用 aspects
  const specificAspects = (aspects ?? []).filter(a =>
    a.typeId === selectedEntityType.typeId && a.classifierValueId === effectiveDimId
  )
  const commonAspects = (aspects ?? []).filter(a =>
    a.typeId === selectedEntityType.typeId && a.classifierValueId == null
  )

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>

      {/* ── 左栏：Entity Types ── */}
      <div style={{
        width: 160, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 13 }}>Entity Types</Text>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {ENTITY_TYPES.map((et, idx) => {
            const isSelected = idx === selectedTypeIdx
            const dimCount = (classifierValues ?? []).filter(d => d.classifierName === et.dimTypeName).length
            return (
              <div
                key={et.typeId}
                onClick={() => handleSelectType(idx)}
                style={{
                  padding: '8px 16px', cursor: 'pointer',
                  background: isSelected ? '#e6f4ff' : undefined,
                  borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.15s', userSelect: 'none',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '' }}
              >
                <span style={{ color: isSelected ? '#1677ff' : '#8c8c8c', fontSize: 14 }}>{et.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, color: isSelected ? '#1677ff' : undefined }}>{et.label}</Text>
                </div>
                <Badge count={dimCount} color={isSelected ? '#1677ff' : '#d9d9d9'} style={{ fontSize: 10 }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 中栏：Dimension Values ── */}
      <div style={{
        width: 200, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 13 }}>{selectedEntityType.dimTypeName}</Text>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {dimValues.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>No dimension</Text>
            </div>
          ) : dimValues.map(dim => {
            const isSelected  = dim.id === effectiveDimId
            const color       = CATEGORY_COLOR[dim.category ?? ''] ?? 'default'
            return (
              <div
                key={dim.id}
                onClick={() => setSelectedDimId(dim.id)}
                style={{
                  padding: '8px 14px', cursor: 'pointer',
                  background: isSelected ? '#e6f4ff' : undefined,
                  borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.15s', userSelect: 'none',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, color: isSelected ? '#1677ff' : undefined, display: 'block' }}>
                    {dim.displayName}
                  </Text>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    {dim.category && (
                      <Tag color={color} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{dim.category}</Tag>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <RightOutlined style={{ fontSize: 10, color: isSelected ? '#1677ff' : '#d9d9d9' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 右栏：Aspects + Properties ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 20 }}>
        {!selectedDim ? (
          <Empty description="Select a dimension value" style={{ marginTop: 60 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ color: '#8c8c8c', fontSize: 14 }}>{selectedEntityType.icon}</span>
              <Text strong style={{ fontSize: 15 }}>{selectedEntityType.label}</Text>
              <RightOutlined style={{ fontSize: 11, color: '#d9d9d9' }} />
              <Tag color={CATEGORY_COLOR[selectedDim.category ?? ''] ?? 'default'} style={{ fontSize: 12 }}>
                {selectedDim.displayName}
              </Tag>
              {selectedDim.description && (
                <Text type="secondary" style={{ fontSize: 12 }}>{selectedDim.description}</Text>
              )}
            </div>
            <AspectPanel
              aspects={specificAspects}
              properties={properties ?? []}
              types={types ?? []}
              commonAspects={commonAspects}
            />
          </>
        )}
      </div>
    </div>
  )
}
