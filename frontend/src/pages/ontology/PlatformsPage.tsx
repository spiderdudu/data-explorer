import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Tag, Typography, Space, Tooltip, Collapse, Table, Empty, Segmented, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ontologyApi } from '@/api/ontology'
import type { OntAspect, OntClassifierValue, OntProperty, OntType } from '@/types/ontology'

const { Text, Title, Paragraph } = Typography

const PLATFORM_TYPE_CONFIG: Record<string, { color: string; label: string; desc: string }> = {
  database: { color: 'blue',    label: 'database', desc: '关系型数据库 / 时序数据库' },
  stream:   { color: 'purple',  label: 'stream',   desc: '消息流 / 队列' },
  file:     { color: 'orange',  label: 'file',     desc: '文件系统 / 对象存储' },
  api:      { color: 'magenta', label: 'api',      desc: '外部 HTTP / gRPC API' },
  external: { color: 'default', label: 'external', desc: '其他外部系统' },
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
    width: 110,
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

// ── 平台卡片 ──────────────────────────────────────────────────────────────────
function PlatformCard({ platform, aspects, properties, types }: {
  platform: OntClassifierValue
  aspects: OntAspect[]
  properties: OntProperty[]
  types: OntType[]
}) {
  const cfg = PLATFORM_TYPE_CONFIG[platform.category ?? '']
  const platformAspects = aspects.filter(a => a.dimensionId === platform.id)

  const collapseItems = platformAspects.map(aspect => {
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
      style={{
        height: '100%',
        opacity: platform.status === 0 ? 0.55 : 1,
        borderColor: platform.status === 0 ? '#d9d9d9' : undefined,
      }}
      styles={{ header: { borderBottom: `2px solid ${cfg?.color ?? '#d9d9d9'}` } }}
      title={
        <Space>
          <Tag color={cfg?.color ?? 'default'} style={{ fontSize: 11 }}>{cfg?.label ?? platform.category}</Tag>
          <Text strong style={{ fontSize: 14 }}>{platform.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({platform.name})</Text>
        </Space>
      }
      extra={
        <Space size={6}>
          {platform.isSystem
            ? <Tag color="default" style={{ fontSize: 10 }}>系统内置</Tag>
            : <Tag color="blue"    style={{ fontSize: 10 }}>自定义</Tag>}
          {platform.status === 0 && <Tag color="default" style={{ fontSize: 10 }}>停用</Tag>}
          <Tag color="geekblue" style={{ fontSize: 10 }}>{platformAspects.length} 个 Aspect</Tag>
        </Space>
      }
    >
      {platform.description && (
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: platformAspects.length ? 12 : 0 }}>
          {platform.description}
        </Paragraph>
      )}

      {platformAspects.length > 0 && (
        <Collapse size="small" ghost items={collapseItems} />
      )}

      {platformAspects.length === 0 && (
        <Empty description="暂无平台专属 Aspect" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function PlatformsPage() {
  const [group, setGroup] = useState<'system' | 'custom'>('system')

  const { data: platforms, isLoading: pLoading } = useQuery({ queryKey: ['dimensions', 'platform'],   queryFn: () => ontologyApi.getClassifierValues('platform') })
  const { data: aspects,   isLoading: aLoading } = useQuery({ queryKey: ['aspects'],     queryFn: () => ontologyApi.getAspects() })
  const { data: properties                      } = useQuery({ queryKey: ['properties'], queryFn: () => ontologyApi.getProperties() })
  const { data: types                           } = useQuery({ queryKey: ['types'],      queryFn: () => ontologyApi.getTypes() })

  const isLoading = pLoading || aLoading

  const systemPlatforms = (platforms ?? []).filter(p =>  p.isSystem)
  const customPlatforms  = (platforms ?? []).filter(p => !p.isSystem)
  const displayed        = group === 'system' ? systemPlatforms : customPlatforms

  const sharedProps = {
    aspects:    aspects    ?? [],
    properties: properties ?? [],
    types:      types      ?? [],
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>平台</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            数据平台定义了实体的物理来源，决定适用哪些平台专属 Aspect
          </Text>
        </div>
        <Segmented
          value={group}
          onChange={v => setGroup(v as typeof group)}
          options={[
            { label: `系统内置 (${systemPlatforms.length})`, value: 'system' },
            { label: `自定义 (${customPlatforms.length})`,   value: 'custom' },
          ]}
        />
      </div>

      {isLoading ? null : (
        <Row gutter={[16, 16]}>
          {displayed.map(p => (
            <Col span={12} key={p.id}>
              <PlatformCard platform={p} {...sharedProps} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
