import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Tag, Typography, Space, Collapse, Table, Empty, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ontologyApi } from '@/api/ontology'
import type { OntAspect, OntDimension, OntProperty } from '@/types/ontology'

const { Text, Title, Paragraph } = Typography

const STRATEGY_COLOR: Record<string, string> = {
  TrendFollowing: 'green',
  MeanReversion:  'cyan',
  Arbitrage:      'purple',
  MarketMaking:   'geekblue',
  EventDriven:    'gold',
  Execution:      'orange',
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

// ── 策略类型卡片 ──────────────────────────────────────────────────────────────
function StrategyTypeCard({ strategyType, aspects, properties }: {
  strategyType: OntDimension
  aspects: OntAspect[]
  properties: OntProperty[]
}) {
  const color = STRATEGY_COLOR[strategyType.name] ?? 'default'

  // 只显示该策略类型专属 aspect
  const typeAspects = aspects.filter(
    a => a.dimensionId === strategyType.id
  )

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
      style={{
        height: '100%',
        opacity: strategyType.status === 0 ? 0.55 : 1,
      }}
      styles={{ header: { borderBottom: `2px solid var(--ant-color-${color}, #d9d9d9)` } }}
      title={
        <Space>
          <Tag color={color} style={{ fontSize: 11 }}>strategy</Tag>
          <Text strong style={{ fontSize: 14 }}>{strategyType.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>({strategyType.name})</Text>
        </Space>
      }
      extra={
        <Space size={6}>
          {strategyType.isSystem && <Tag color="default" style={{ fontSize: 10 }}>系统内置</Tag>}
          {strategyType.status === 0 && <Tag color="default" style={{ fontSize: 10 }}>停用</Tag>}
          <Tag color="geekblue" style={{ fontSize: 10 }}>{typeAspects.length} 个专属 Aspect</Tag>
        </Space>
      }
    >
      {strategyType.description && (
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: typeAspects.length ? 12 : 0 }}>
          {strategyType.description}
        </Paragraph>
      )}

      {typeAspects.length > 0
        ? <Collapse size="small" ghost items={collapseItems} />
        : <Empty description="暂无专属 Aspect" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      }
    </Card>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function StrategyTypesPage() {
  const { data: strategyTypes, isLoading } = useQuery({
    queryKey: ['dimensions', 'strategy_type'],
    queryFn: () => ontologyApi.getDimensions('strategy_type'),
  })
  const { data: aspects    } = useQuery({ queryKey: ['aspects'],    queryFn: () => ontologyApi.getAspects() })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => ontologyApi.getProperties() })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>策略类型</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          定义自动交易策略的算法类型，每种类型有独立的参数 Aspect，通用风控配置所有类型共享
        </Text>
      </div>

      {!isLoading && (
        <Row gutter={[16, 16]}>
          {(strategyTypes ?? []).map(st => (
            <Col span={12} key={st.id}>
              <StrategyTypeCard
                strategyType={st}
                aspects={aspects ?? []}
                properties={properties ?? []}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
