import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Row, Col, Card, Tag, Typography, Space, Badge, Collapse,
  Table, Tooltip, Empty, Spin, Segmented,
} from 'antd'
import {
  DatabaseOutlined, ThunderboltOutlined, UserOutlined,
  AccountBookOutlined, BarChartOutlined, ApartmentOutlined,
  AppstoreOutlined, ContainerOutlined, BulbOutlined,
  RiseOutlined, LockOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ontologyApi } from '@/api/ontology'
import type { OntAspect, OntProperty, OntType } from '@/types/ontology'

const { Text, Title, Paragraph } = Typography

// ── 类型图标映射 ───────────────────────────────────────────────────────────────
const TYPE_ICON: Record<string, React.ReactNode> = {
  Dataset:     <DatabaseOutlined />,
  Domain:      <AppstoreOutlined />,
  Container:   <ContainerOutlined />,
  Action:      <BulbOutlined />,
  MarketEvent: <ThunderboltOutlined />,
  Quote:       <RiseOutlined />,
  Client:      <UserOutlined />,
  Account:     <AccountBookOutlined />,
  Position:    <BarChartOutlined />,
  Strategy:    <ApartmentOutlined />,
}

const TYPE_COLOR: Record<string, string> = {
  Dataset:     '#1677ff',
  Domain:      '#52c41a',
  Container:   '#13c2c2',
  Action:      '#fa8c16',
  MarketEvent: '#faad14',
  Quote:       '#722ed1',
  Client:      '#eb2f96',
  Account:     '#2f54eb',
  Position:    '#f5222d',
  Strategy:    '#08979c',
}

const DATA_TYPE_COLOR: Record<string, string> = {
  string:   'blue',
  integer:  'cyan',
  decimal:  'geekblue',
  boolean:  'green',
  date:     'orange',
  datetime: 'orange',
  enum:     'purple',
  ref:      'magenta',
  json:     'volcano',
}

// ── Property 表格列 ────────────────────────────────────────────────────────────
const PROP_COLUMNS: ColumnsType<OntProperty> = [
  {
    title: '属性名',
    dataIndex: 'name',
    key: 'name',
    width: 160,
    render: (name: string, record) => (
      <Space size={4}>
        <Text code style={{ fontSize: 12 }}>{name}</Text>
        {record.isSystem && (
          <Tooltip title="系统内置属性">
            <LockOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
          </Tooltip>
        )}
      </Space>
    ),
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
    align: 'center',
    render: (v: boolean) => v
      ? <Badge status="error" text="" />
      : <Badge status="default" text="" />,
  },
  {
    title: '多值',
    dataIndex: 'isMulti',
    key: 'isMulti',
    width: 60,
    align: 'center',
    render: (v: boolean) => v ? <Tag color="cyan" style={{ fontSize: 10 }}>multi</Tag> : '—',
  },
  {
    title: '说明',
    dataIndex: 'description',
    key: 'description',
    render: (d: string) => d
      ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text>
      : '—',
  },
]

// ── 单个类型卡片 ───────────────────────────────────────────────────────────────
function TypeCard({ type, aspects, properties }: {
  type: OntType
  aspects: OntAspect[]
  properties: OntProperty[]
}) {
  const color = TYPE_COLOR[type.name] ?? '#8c8c8c'
  const icon  = TYPE_ICON[type.name]
  const typeAspects = aspects.filter(a => a.typeId === type.id && !a.dimensionId)
  const propCount   = properties.filter(p => {
    const a = aspects.find(a => a.id === p.aspectId)
    return a && a.typeId === type.id && !a.dimensionId
  }).length

  const collapseItems = typeAspects.map(aspect => {
    const props = properties.filter(p => p.aspectId === aspect.id)
    return {
      key: String(aspect.id),
      label: (
        <Space>
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
      style={{ height: '100%' }}
      styles={{ header: { borderBottom: `2px solid ${color}` } }}
      title={
        <Space>
          <span style={{ color, fontSize: 16 }}>{icon}</span>
          <Text strong style={{ fontSize: 14 }}>{type.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({type.name})</Text>
        </Space>
      }
      extra={
        <Space size={6}>
          {type.isSystem
            ? <Tag color="default" style={{ fontSize: 10 }}>系统内置</Tag>
            : <Tag color="blue"    style={{ fontSize: 10 }}>业务类型</Tag>}
          <Tag color="geekblue" style={{ fontSize: 10 }}>{propCount} 个属性</Tag>
        </Space>
      }
    >
      {type.description && (
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: typeAspects.length ? 12 : 0 }}>
          {type.description}
        </Paragraph>
      )}

      {typeAspects.length > 0 && (
        <Collapse
          size="small"
          ghost
          items={collapseItems}
          style={{ background: 'transparent' }}
        />
      )}

      {typeAspects.length === 0 && (
        <Empty description="暂无 Aspect 定义" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function OntTypesPage() {
  const [group, setGroup] = useState<'system' | 'custom'>('system')

  const { data: types,      isLoading: tLoading } = useQuery({ queryKey: ['types'],      queryFn: () => ontologyApi.getTypes() })
  const { data: aspects,    isLoading: aLoading } = useQuery({ queryKey: ['aspects'],    queryFn: () => ontologyApi.getAspects() })
  const { data: properties, isLoading: pLoading } = useQuery({ queryKey: ['properties'], queryFn: () => ontologyApi.getProperties() })

  const isLoading = tLoading || aLoading || pLoading

  const systemTypes = (types ?? []).filter(t =>  t.isSystem)
  const customTypes  = (types ?? []).filter(t => !t.isSystem)
  const displayed   = group === 'system' ? systemTypes : customTypes

  const sharedProps = { aspects: aspects ?? [], properties: properties ?? [] }

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>实体类型</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            本体元数据体系的类型定义，每种类型包含若干 Aspect（属性分组）和 Property（属性）
          </Text>
        </div>
        <Segmented
          value={group}
          onChange={v => setGroup(v as typeof group)}
          options={[
            { label: `系统内置 (${systemTypes.length})`, value: 'system' },
            { label: `自定义 (${customTypes.length})`,   value: 'custom' },
          ]}
        />
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
      )}

      {!isLoading && (
        <Row gutter={[16, 16]}>
          {displayed.map(type => (
            <Col span={12} key={type.id}>
              <TypeCard type={type} {...sharedProps} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
