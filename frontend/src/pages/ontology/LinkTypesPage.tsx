import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Tag, Typography, Space, Badge, Segmented, Tooltip } from 'antd'
import { ArrowRightOutlined, LockOutlined, SwapOutlined } from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { OntLinkType } from '@/types/ontology'

const { Text, Title, Paragraph } = Typography

const CARDINALITY_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  ONE_TO_ONE:   { label: '1 : 1',   color: 'cyan',     desc: '一对一' },
  ONE_TO_MANY:  { label: '1 : N',   color: 'blue',     desc: '一对多' },
  MANY_TO_ONE:  { label: 'N : 1',   color: 'geekblue', desc: '多对一' },
  MANY_TO_MANY: { label: 'N : N',   color: 'purple',   desc: '多对多' },
}

// 类型 id → 名称映射（和 MOCK_TYPES 保持一致）
const TYPE_NAME: Record<number, string> = {
  1: 'Dataset', 2: 'Domain', 3: 'Container', 4: 'Action',
  5: 'MarketEvent', 7: 'Client', 10: 'Strategy', 11: 'Instance',
}

const TYPE_COLOR: Record<string, string> = {
  Dataset: 'blue', Domain: 'green', Container: 'cyan', Instance: 'cyan',
  Action: 'orange', MarketEvent: 'gold',
  Client: 'magenta', Strategy: 'volcano',
}

function LinkTypeCard({ link }: { link: OntLinkType }) {
  const srcName = TYPE_NAME[link.sourceTypeId] ?? String(link.sourceTypeId)
  const tgtName = TYPE_NAME[link.targetTypeId] ?? String(link.targetTypeId)
  const card    = CARDINALITY_CONFIG[link.cardinality]

  return (
    <Card
      size="small"
      style={{ height: '100%', opacity: link.status === 0 ? 0.55 : 1 }}
      title={
        <Space>
          <Text strong style={{ fontSize: 14 }}>{link.displayName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>({link.name})</Text>
        </Space>
      }
      extra={
        <Space size={6}>
          {link.isSystem
            ? <Tooltip title="系统内置，不可删除">
                <Tag color="default" style={{ fontSize: 10 }}>系统内置</Tag>
              </Tooltip>
            : <Tag color="blue" style={{ fontSize: 10 }}>自定义</Tag>}
          {link.status === 0 && <Tag color="default" style={{ fontSize: 10 }}>停用</Tag>}
        </Space>
      }
    >
      {/* 关联方向 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', background: '#f8f9fa',
        borderRadius: 6, marginBottom: 12,
      }}>
        <Tag color={TYPE_COLOR[srcName] ?? 'default'} style={{ margin: 0 }}>{srcName}</Tag>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: '#d9d9d9' }} />
          {link.isDirected
            ? <ArrowRightOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
            : <SwapOutlined       style={{ color: '#8c8c8c', fontSize: 12 }} />}
          <div style={{ flex: 1, height: 1, background: '#d9d9d9' }} />
        </div>
        <Tag color={TYPE_COLOR[tgtName] ?? 'default'} style={{ margin: 0 }}>{tgtName}</Tag>
      </div>

      {/* 基数 + 反向名称 + qualifier */}
      <Space style={{ marginBottom: link.description ? 10 : 0 }} size={8} wrap>
        <Tooltip title={card?.desc}>
          <Tag color={card?.color ?? 'default'} style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {card?.label ?? link.cardinality}
          </Tag>
        </Tooltip>
        {link.reverseName && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            反向：{link.reverseName}
          </Text>
        )}
        {link.qualifierValues && (
          <Tooltip title="关联限定值">
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              [{link.qualifierValues}]
            </Text>
          </Tooltip>
        )}
      </Space>

      {link.description && (
        <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
          {link.description}
        </Paragraph>
      )}
    </Card>
  )
}

export default function LinkTypesPage() {
  const [group, setGroup] = useState<'system' | 'custom'>('system')

  const { data: linkTypes, isLoading } = useQuery({
    queryKey: ['linkTypes'],
    queryFn: () => ontologyApi.getLinkTypes(),
  })

  const systemLinks = (linkTypes ?? []).filter(l =>  l.isSystem)
  const customLinks  = (linkTypes ?? []).filter(l => !l.isSystem)
  const displayed    = group === 'system' ? systemLinks : customLinks

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>关联类型</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            定义实体间的语义关联，通过 ont_entity_link 实例化
          </Text>
        </div>
        <Segmented
          value={group}
          onChange={v => setGroup(v as typeof group)}
          options={[
            { label: `系统内置 (${systemLinks.length})`, value: 'system' },
            { label: `自定义 (${customLinks.length})`,   value: 'custom' },
          ]}
        />
      </div>

      {!isLoading && (
        <Row gutter={[16, 16]}>
          {displayed.map(link => (
            <Col span={12} key={link.id}>
              <LinkTypeCard link={link} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
