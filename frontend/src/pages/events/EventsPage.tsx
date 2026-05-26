import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Typography, Tag, Space, Spin, Empty, Tabs, List,
  Badge, Progress, Tooltip, Divider,
} from 'antd'
import {
  ThunderboltOutlined, AlertOutlined, RiseOutlined,
  FallOutlined, MinusOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'

const { Text, Title, Paragraph } = Typography

// ── 常量 ──────────────────────────────────────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  RATE_DECISION: { label: '利率决议', color: 'blue'    },
  NFP:           { label: '非农就业', color: 'geekblue'},
  CPI:           { label: 'CPI 通胀', color: 'orange'  },
  GEOPOLITICAL:  { label: '地缘政治', color: 'red'     },
  WAR:           { label: '战争冲突', color: 'red'     },
  EARNINGS:      { label: '财报',     color: 'purple'  },
  OTHER:         { label: '其他',     color: 'default' },
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  HIGH:   { label: '高',  color: '#f5222d' },
  MEDIUM: { label: '中',  color: '#fa8c16' },
  LOW:    { label: '低',  color: '#52c41a' },
}

const SOURCE_LABEL: Record<string, string> = {
  bloomberg: 'Bloomberg', reuters: 'Reuters', manual: '人工录入', other: '其他',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── 影响方向图标 ──────────────────────────────────────────────────────────────
function ImpactIcon({ direction }: { direction?: string }) {
  if (direction === 'BULLISH')  return <RiseOutlined  style={{ color: '#52c41a', fontSize: 14 }} />
  if (direction === 'BEARISH')  return <FallOutlined  style={{ color: '#f5222d', fontSize: 14 }} />
  return <MinusOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
}

// ── 事件列表 Tab ──────────────────────────────────────────────────────────────
function EventListTab({ events, selected, onSelect }: {
  events: any[]
  selected: any | null
  onSelect: (e: any) => void
}) {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 左侧列表 */}
      <div style={{
        width: 320, flexShrink: 0, borderRight: '1px solid #f0f0f0',
        overflowY: 'auto', background: '#fff',
      }}>
        {events.map(evt => {
          const sev = SEVERITY_CONFIG[evt.severity]
          const typ = EVENT_TYPE_CONFIG[evt.eventType]
          const isSelected = selected?.id === evt.id
          return (
            <div
              key={evt.id}
              onClick={() => onSelect(evt)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: '1px solid #f5f5f5',
                borderLeft: `3px solid ${isSelected ? sev.color : 'transparent'}`,
                background: isSelected ? '#fafafa' : '#fff',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                <Text strong style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {evt.title}
                </Text>
              </div>
              <Space size={4} wrap>
                <Tag color={typ?.color ?? 'default'} style={{ fontSize: 10, margin: 0 }}>{typ?.label ?? evt.eventType}</Tag>
                {evt.symbols.map((s: string) => (
                  <Tag key={s} style={{ fontSize: 10, margin: 0 }}>{s}</Tag>
                ))}
              </Space>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCircleOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(evt.occurredAt)}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>· {SOURCE_LABEL[evt.source] ?? evt.source}</Text>
              </div>
            </div>
          )
        })}
      </div>

      {/* 右侧详情 */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24, background: '#f5f5f5' }}>
        {!selected && (
          <Empty description="选择左侧事件查看详情" style={{ marginTop: 80 }} />
        )}
        {selected && (
          <div style={{ maxWidth: 680 }}>
            {/* 标题区 */}
            <div style={{ background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <Space style={{ marginBottom: 8 }} wrap>
                <Tag color={EVENT_TYPE_CONFIG[selected.eventType]?.color ?? 'default'} style={{ fontSize: 12 }}>
                  {EVENT_TYPE_CONFIG[selected.eventType]?.label ?? selected.eventType}
                </Tag>
                <Tag color={SEVERITY_CONFIG[selected.severity]?.color} style={{ fontSize: 12, color: '#fff', borderColor: SEVERITY_CONFIG[selected.severity]?.color }}>
                  严重程度：{SEVERITY_CONFIG[selected.severity]?.label}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {new Date(selected.occurredAt).toLocaleString('zh-CN')}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  来源：{SOURCE_LABEL[selected.source] ?? selected.source}
                </Text>
              </Space>
              <Title level={4} style={{ margin: '0 0 8px' }}>{selected.title}</Title>
              <Paragraph style={{ margin: 0, color: '#595959' }}>{selected.summary}</Paragraph>
            </div>

            {/* 相关品种 */}
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>相关品种</Text>
              <Space wrap>
                {selected.symbols.map((s: string) => (
                  <Tag key={s} color="blue" style={{ fontSize: 12 }}>{s}</Tag>
                ))}
              </Space>
            </div>

            {/* 影响分析 */}
            {selected.impactDirection && (
              <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>LLM 影响分析</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <ImpactIcon direction={selected.impactDirection} />
                  <Text style={{ fontSize: 14 }}>
                    {selected.impactDirection === 'BULLISH' ? '利多' : selected.impactDirection === 'BEARISH' ? '利空' : '中性'}
                  </Text>
                  <Divider type="vertical" />
                  <Text type="secondary" style={{ fontSize: 13 }}>置信度</Text>
                  <Progress
                    percent={Math.round((selected.confidence ?? 0) * 100)}
                    size="small"
                    style={{ width: 120, margin: 0 }}
                    strokeColor={selected.confidence > 0.8 ? '#52c41a' : selected.confidence > 0.6 ? '#fa8c16' : '#f5222d'}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>受影响品种</Text>
                  <Space wrap>
                    {(selected.affectedSymbols ?? []).map((s: string) => (
                      <Tag key={s} icon={<ImpactIcon direction={selected.impactDirection} />}
                        style={{ fontSize: 12 }}>
                        {s}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 影响分析 Tab ──────────────────────────────────────────────────────────────
function ImpactTab({ events }: { events: any[] }) {
  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <List
        dataSource={events.filter(e => e.impactDirection)}
        renderItem={evt => {
          const sev = SEVERITY_CONFIG[evt.severity]
          const typ = EVENT_TYPE_CONFIG[evt.eventType]
          return (
            <List.Item style={{ display: 'block', padding: '16px', background: '#fff', borderRadius: 8, marginBottom: 12, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <ImpactIcon direction={evt.impactDirection} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 14 }}>{evt.title}</Text>
                    <Tag color={typ?.color ?? 'default'} style={{ fontSize: 10, margin: 0 }}>{typ?.label}</Tag>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sev.color }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(evt.occurredAt)}</Text>
                  </div>
                  <Paragraph type="secondary" style={{ fontSize: 13, margin: '0 0 10px' }}
                    ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                    {evt.summary}
                  </Paragraph>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Space size={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>受影响品种：</Text>
                      {(evt.affectedSymbols ?? []).map((s: string) => (
                        <Tag key={s} style={{ fontSize: 11, margin: 0 }}>{s}</Tag>
                      ))}
                    </Space>
                    <Space size={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>置信度：</Text>
                      <Progress
                        percent={Math.round((evt.confidence ?? 0) * 100)}
                        size="small" style={{ width: 80, margin: 0 }}
                        strokeColor={evt.confidence > 0.8 ? '#52c41a' : '#fa8c16'}
                      />
                    </Space>
                  </div>
                </div>
              </div>
            </List.Item>
          )
        }}
      />
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => ontologyApi.getEvents(),
  })

  const [selected, setSelected] = useState<any | null>(null)
  const effectiveSelected = selected ?? events?.[0] ?? null

  const highCount   = (events ?? []).filter(e => e.severity === 'HIGH').length
  const mediumCount = (events ?? []).filter(e => e.severity === 'MEDIUM').length

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Spin size="large" />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部统计栏 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
      }}>
        <Space size={4}>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <Text strong style={{ fontSize: 14 }}>市场事件</Text>
        </Space>
        <Divider type="vertical" />
        <Space size={6}>
          <Badge color="#f5222d" />
          <Text style={{ fontSize: 13 }}>高影响 {highCount} 个</Text>
        </Space>
        <Space size={6}>
          <Badge color="#fa8c16" />
          <Text style={{ fontSize: 13 }}>中影响 {mediumCount} 个</Text>
        </Space>
        <Space size={6}>
          <Badge color="#8c8c8c" />
          <Text style={{ fontSize: 13 }}>共 {events?.length ?? 0} 个</Text>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="list"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ background: '#fff', paddingLeft: 20, marginBottom: 0, flexShrink: 0 }}
        items={[
          {
            key: 'list',
            label: '事件列表',
            children: (
              <div style={{ height: '100%' }}>
                <EventListTab
                  events={events ?? []}
                  selected={effectiveSelected}
                  onSelect={setSelected}
                />
              </div>
            ),
          },
          {
            key: 'impact',
            label: '影响分析',
            children: (
              <div style={{ height: '100%' }}>
                <ImpactTab events={events ?? []} />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
