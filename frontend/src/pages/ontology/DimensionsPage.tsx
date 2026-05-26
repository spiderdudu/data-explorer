import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Tag, Typography, Space, Collapse, Table, Empty, Segmented, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ontologyApi } from '@/api/ontology'
import type { OntAspect, OntDimension, OntDimensionType, OntProperty, OntType } from '@/types/ontology'

const { Text, Title, Paragraph } = Typography

// category 颜色配置（platform 维度用）
const CATEGORY_COLOR: Record<string, string> = {
  database: 'blue',
  stream:   'purple',
  file:     'orange',
  api:      'magenta',
  external: 'default',
  // strategy_type 维度
  signal:   'green',
  spread:   'purple',
  quoting:  'geekblue',
  event:    'gold',
  algo:     'orange',
}

const DATA_TYPE_COLOR: Record<string, string> = {
  string: 'blue', integer: 'cyan', decimal: 'geekblue', boolean: 'green',
  date: 'orange', datetime: 'orange', enum: 'purple', ref: 'magenta', json: 'volcano',
}

const PROP_COLUMNS: ColumnsType<OntProperty> = [
  {
    title: '属性名',
    dataIndex: 'name',
    key: 'name',
    width: 160,
    render: (name: string) => <Text code style={{ fontSize: 12 }}>{name}</Text>,
  },
  {
    title: '显示名',
    dataIndex: 'displayName',
    key: 'displayName',
    width: 120,
    render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
  },
  {
    title: '类型',
    dataIndex: 'dataType',
    key: 'dataType',
    width: 90,
    render: (t: string) => <Tag color={DATA_TYPE_COLOR[t] ?? 'default'} style={{ fontSize: 11 }}>{t}</Tag>,
  },
  {
    title: '必填',
    dataIndex: 'isRequired',
    key: 'isRequired',
    width: 60,
    align: 'center' as const,
    render: (v: boolean) => v ? <Badge status="error" text="" /> : <Badge status="default" text="" />,
  },
  {
    title: '说明',
    dataIndex: 'description',
    key: 'description',
    render: (d: string) => d ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text> : '—',
  },
]

// ── 维度值卡片（通用） ─────────────────────────────────────────────────────────
function DimensionCard({ dimension, aspects, properties, types }: {
  dimension: OntDimension
  aspects: OntAspect[]
  properties: OntProperty[]
  types: OntType[]
}) {
  const color = CATEGORY_COLOR[dimension.category ?? ''] ?? 'default'
  const dimAspects = aspects.filter(a => a.dimensionId === dimension.id)

  const collapseItems = dimAspects.map(aspect => {
    const props = properties.filter(p => p.aspectId === aspect.id)
    const typeName = types.find(t => t.id === aspect.typeId)?.displayName ?? String(aspect.typeId)
    return {
      key: String(aspect.id),
      label: (
        <Space>
          <Tag color="blue" style={{ fontSize: 11 }}>{typeName}</Tag>
          <Text strong style={{ fontSize: 13 }}>{aspect.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({aspect.name})</Text>
          <Badge count={props.length} color="geekblue" style={{ fontSize: 10 }} />
          {aspect.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>— {aspect.description}</Text>
          )}
        </Space>
      ),
      children: (
        <Table
          columns={PROP_COLUMNS}
          dataSource={props}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ marginTop: 4 }}
        />
      ),
    }
  })

  return (
    <Card
      size="small"
      style={{ height: '100%', opacity: dimension.status === 0 ? 0.55 : 1 }}
      styles={{ header: { borderBottom: `2px solid var(--ant-color-${color === 'default' ? 'border' : color}, #d9d9d9)` } }}
      title={
        <Space>
          {dimension.category && (
            <Tag color={color} style={{ fontSize: 11 }}>{dimension.category}</Tag>
          )}
          <Text strong style={{ fontSize: 14 }}>{dimension.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({dimension.name})</Text>
        </Space>
      }
      extra={
        <Space size={6}>
          {dimension.isSystem && <Tag color="default" style={{ fontSize: 10 }}>系统内置</Tag>}
          {dimension.status === 0 && <Tag color="default" style={{ fontSize: 10 }}>停用</Tag>}
          <Tag color="geekblue" style={{ fontSize: 10 }}>{dimAspects.length} 个 Aspect</Tag>
        </Space>
      }
    >
      {dimension.description && (
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: dimAspects.length ? 12 : 0 }}>
          {dimension.description}
        </Paragraph>
      )}
      {dimAspects.length > 0
        ? <Collapse size="small" ghost items={collapseItems} />
        : <Empty description="暂无专属 Aspect" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      }
    </Card>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function DimensionsPage() {
  const [activeDimType, setActiveDimType] = useState<string>('platform')

  const { data: dimTypes                          } = useQuery({ queryKey: ['dimensionTypes'], queryFn: () => ontologyApi.getDimensionTypes() })
  const { data: dimensions, isLoading: dLoading   } = useQuery({ queryKey: ['dimensions'],     queryFn: () => ontologyApi.getDimensions() })
  const { data: aspects,    isLoading: aLoading   } = useQuery({ queryKey: ['aspects'],        queryFn: () => ontologyApi.getAspects() })
  const { data: properties                        } = useQuery({ queryKey: ['properties'],     queryFn: () => ontologyApi.getProperties() })
  const { data: types                             } = useQuery({ queryKey: ['types'],          queryFn: () => ontologyApi.getTypes() })

  const isLoading = dLoading || aLoading

  const displayed = (dimensions ?? []).filter(d => d.dimensionTypeName === activeDimType)
  const currentDimType = (dimTypes ?? []).find(dt => dt.name === activeDimType)

  const segmentedOptions = (dimTypes ?? []).map(dt => ({
    label: `${dt.displayName} (${(dimensions ?? []).filter(d => d.dimensionTypeName === dt.name).length})`,
    value: dt.name,
  }))

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>类型体系</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {currentDimType?.description ?? '定义实体的分类维度，决定适用哪些专属 Aspect'}
          </Text>
        </div>
        {segmentedOptions.length > 0 && (
          <Segmented
            value={activeDimType}
            onChange={v => setActiveDimType(v as string)}
            options={segmentedOptions}
          />
        )}
      </div>

      {!isLoading && (
        <Row gutter={[16, 16]}>
          {displayed.map(d => (
            <Col span={12} key={d.id}>
              <DimensionCard
                dimension={d}
                aspects={aspects ?? []}
                properties={properties ?? []}
                types={types ?? []}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
