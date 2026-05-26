import { useState } from 'react'
import {
  Typography, Tag, Space, Tabs, Timeline, Descriptions,
  Badge, Progress, Divider, Empty, Alert,
} from 'antd'
import {
  RobotOutlined, ThunderboltOutlined, WarningOutlined,
  CheckCircleOutlined, ClockCircleOutlined, FallOutlined,
  RiseOutlined, ToolOutlined, DatabaseOutlined,
} from '@ant-design/icons'

const { Text, Title, Paragraph } = Typography

// ── 样例数据 ──────────────────────────────────────────────────────────────────
interface Attribution {
  id: number
  strategyName: string
  strategyDisplayName: string
  strategyType: string
  period: string
  pnl: number          // USD
  drawdown: number     // %
  status: 'RESOLVED' | 'INVESTIGATING' | 'PENDING'
  rootCause: 'MARKET_EVENT' | 'PARAM_ISSUE' | 'DATA_QUALITY' | 'RISK_TRIGGER' | 'UNKNOWN'
  summary: string
  relatedEvents: { name: string; type: string; impact: string }[]
  paramChanges: { param: string; before: string; after: string; changedAt: string; reason: string }[]
  timeline: { time: string; type: 'event' | 'action' | 'alert' | 'resolve'; content: string }[]
  conclusion?: string
  analyst?: string
  resolvedAt?: string
}

const MOCK_ATTRIBUTIONS: Attribution[] = [
  {
    id: 1,
    strategyName: 'eurusd-trend-ld',
    strategyDisplayName: 'EURUSD 趋势 (LD)',
    strategyType: 'TrendFollowing',
    period: '2025-05-07 ~ 2025-05-08',
    pnl: -3240,
    drawdown: 4.2,
    status: 'RESOLVED',
    rootCause: 'MARKET_EVENT',
    summary: 'Fed 利率决议后市场剧烈波动，趋势信号频繁反转，策略连续止损出场导致亏损。',
    relatedEvents: [
      { name: 'Fed 利率决议 2025-05', type: 'RATE_DECISION', impact: '美元走强，EUR/USD 下跌 80 pips，波动率飙升' },
    ],
    paramChanges: [
      { param: 'stop_loss_pips', before: '30', after: '50', changedAt: '2025-05-08 09:00', reason: '高波动期间扩大止损，避免频繁触发' },
      { param: 'lot_size', before: '1.0', after: '0.5', changedAt: '2025-05-08 09:00', reason: '降低仓位规模，控制风险敞口' },
    ],
    timeline: [
      { time: '05-07 18:00', type: 'event',   content: 'Fed 宣布维持利率不变，措辞偏鹰派' },
      { time: '05-07 18:05', type: 'alert',   content: '风控预警：EUR/USD 5分钟波动超过 40 pips，触发高波动预警' },
      { time: '05-07 18:10', type: 'action',  content: '策略止损出场，亏损 -850 USD' },
      { time: '05-07 18:35', type: 'action',  content: '策略重新入场（做多），随后再次止损，亏损 -1200 USD' },
      { time: '05-07 19:00', type: 'alert',   content: '日亏损超过阈值 2000 USD，触发风控暂停' },
      { time: '05-08 09:00', type: 'action',  content: '人工介入：调整止损参数和仓位，恢复运行' },
      { time: '05-08 14:00', type: 'resolve', content: '归因分析完成，确认为市场事件导致，参数已优化' },
    ],
    conclusion: '本次亏损主因是 Fed 决议后市场波动率异常升高，趋势策略在高波动环境下信号质量下降。已调整止损参数并降低仓位，同时在事件驱动型高波动期间增加暂停逻辑。',
    analyst: 'john.smith',
    resolvedAt: '2025-05-08 14:00',
  },
  {
    id: 2,
    strategyName: 'eurusd-grid-ld',
    strategyDisplayName: 'EURUSD 网格 (LD)',
    strategyType: 'MeanReversion',
    period: '2025-05-02 ~ 2025-05-03',
    pnl: -1850,
    drawdown: 2.8,
    status: 'RESOLVED',
    rootCause: 'PARAM_ISSUE',
    summary: '非农数据公布后 EUR/USD 单边上涨，网格策略持续做空导致亏损，回归假设失效。',
    relatedEvents: [
      { name: '非农就业 2025-05', type: 'NFP', impact: '非农低于预期，美元走弱，EUR/USD 上涨 60 pips' },
    ],
    paramChanges: [
      { param: 'entry_zscore', before: '2.0', after: '2.5', changedAt: '2025-05-03 10:00', reason: '提高入场阈值，减少在趋势行情中的逆势建仓' },
      { param: 'max_position', before: '3.0', after: '2.0', changedAt: '2025-05-03 10:00', reason: '降低最大持仓，控制单边行情下的风险' },
    ],
    timeline: [
      { time: '05-02 12:30', type: 'event',   content: '非农就业数据公布：17.5万，低于预期 24万' },
      { time: '05-02 12:35', type: 'action',  content: '网格策略在 1.0820 做空（Z-score 触发），EUR/USD 继续上涨' },
      { time: '05-02 13:00', type: 'action',  content: '网格加仓做空 1.0850，持仓亏损扩大' },
      { time: '05-02 14:00', type: 'alert',   content: '持仓亏损超过 1500 USD，触发风控预警' },
      { time: '05-02 15:30', type: 'action',  content: '强制平仓，亏损 -1850 USD' },
      { time: '05-03 10:00', type: 'resolve', content: '调整入场阈值和最大持仓参数，归因完成' },
    ],
    conclusion: '网格策略在单边趋势行情中表现不佳，非农数据触发了持续的方向性行情。已提高入场 Z-score 阈值，并在重大数据发布前后增加暂停窗口（±30分钟）。',
    analyst: 'alice.wang',
    resolvedAt: '2025-05-03 10:00',
  },
  {
    id: 3,
    strategyName: 'nfp-event-ld',
    strategyDisplayName: 'NFP 事件驱动',
    strategyType: 'EventDriven',
    period: '2025-04-14',
    pnl: 1240,
    drawdown: 0.8,
    status: 'RESOLVED',
    rootCause: 'MARKET_EVENT',
    summary: '中东地缘冲突触发策略建仓，黄金上涨获利，但持仓时间超出预设，部分利润回吐。',
    relatedEvents: [
      { name: '中东地缘冲突升级', type: 'GEOPOLITICAL', impact: '黄金跳涨 35 美元，避险情绪升温' },
    ],
    paramChanges: [
      { param: 'hold_minutes', before: '60', after: '45', changedAt: '2025-04-15 09:00', reason: '地缘事件行情回撤较快，缩短持仓时间锁定利润' },
    ],
    timeline: [
      { time: '04-14 06:00', type: 'event',   content: '中东局势升级，LLM 影响分析：BULLISH，置信度 65%' },
      { time: '04-14 06:05', type: 'action',  content: '事件驱动策略触发，做多 XAUUSD 0.5手' },
      { time: '04-14 07:00', type: 'action',  content: '黄金上涨 28 美元，浮盈 +1400 USD' },
      { time: '04-14 07:05', type: 'action',  content: '持仓时间到达 60 分钟，按计划平仓，实现盈利 +1240 USD' },
      { time: '04-15 09:00', type: 'resolve', content: '复盘：平仓后黄金继续上涨 7 美元，持仓时间可适当延长' },
    ],
    conclusion: '策略整体表现符合预期，但持仓时间设置偏保守，错过了部分利润。已将 hold_minutes 从 60 调整为 45，同时增加动态止盈逻辑（价格回撤 50% 时提前平仓）。',
    analyst: 'john.smith',
    resolvedAt: '2025-04-15 09:00',
  },
  {
    id: 4,
    strategyName: 'eurusd-mm-ld',
    strategyDisplayName: 'EURUSD 做市 (LD)',
    strategyType: 'MarketMaking',
    period: '2025-05-09',
    pnl: -920,
    drawdown: 1.5,
    status: 'INVESTIGATING',
    rootCause: 'UNKNOWN',
    summary: 'BoE 降息后 GBP/USD 剧烈波动，EUR/USD 联动波动，做市策略库存积累过快，对冲不及时。',
    relatedEvents: [
      { name: 'BoE 利率决议 2025-05', type: 'RATE_DECISION', impact: 'GBP/USD 下跌 90 pips，EUR/USD 联动波动' },
    ],
    paramChanges: [],
    timeline: [
      { time: '05-09 11:00', type: 'event',   content: 'BoE 宣布降息 25bp，GBP/USD 快速下跌' },
      { time: '05-09 11:05', type: 'action',  content: 'EUR/USD 联动波动，做市策略 bid 方向成交量激增' },
      { time: '05-09 11:20', type: 'alert',   content: '库存偏斜超过阈值，触发对冲预警' },
      { time: '05-09 11:25', type: 'action',  content: '对冲执行，但滑点较大，对冲成本偏高' },
      { time: '05-09 12:00', type: 'alert',   content: '日亏损 -920 USD，低于风控阈值，继续运行' },
    ],
    conclusion: undefined,
    analyst: 'alice.wang',
  },
]

// ── 常量配置 ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; badge: 'success' | 'processing' | 'warning' | 'default' }> = {
  RESOLVED:      { label: '已解决',  color: '#52c41a', badge: 'success'    },
  INVESTIGATING: { label: '调查中',  color: '#fa8c16', badge: 'processing' },
  PENDING:       { label: '待处理',  color: '#8c8c8c', badge: 'default'    },
}

const ROOT_CAUSE_CONFIG: Record<string, { label: string; color: string }> = {
  MARKET_EVENT:  { label: '市场事件', color: 'gold'    },
  PARAM_ISSUE:   { label: '参数问题', color: 'orange'  },
  DATA_QUALITY:  { label: '数据质量', color: 'red'     },
  RISK_TRIGGER:  { label: '风控触发', color: 'volcano' },
  UNKNOWN:       { label: '待确认',   color: 'default' },
}

const STRATEGY_TYPE_COLOR: Record<string, string> = {
  TrendFollowing: 'blue', MeanReversion: 'green', Arbitrage: 'purple',
  MarketMaking: 'orange', EventDriven: 'magenta', Execution: 'cyan',
}

const TIMELINE_ICON: Record<string, React.ReactNode> = {
  event:   <ThunderboltOutlined style={{ color: '#faad14' }} />,
  action:  <ToolOutlined        style={{ color: '#1677ff' }} />,
  alert:   <WarningOutlined     style={{ color: '#f5222d' }} />,
  resolve: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
}

// ── 左侧策略归因列表项 ────────────────────────────────────────────────────────
function AttributionItem({ item, selected, onClick }: {
  item: Attribution; selected: boolean; onClick: () => void
}) {
  const status = STATUS_CONFIG[item.status]
  const cause  = ROOT_CAUSE_CONFIG[item.rootCause]
  const isProfit = item.pnl >= 0

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px', cursor: 'pointer',
        borderBottom: '1px solid #f5f5f5',
        borderLeft: `3px solid ${selected ? status.color : 'transparent'}`,
        background: selected ? '#fafafa' : '#fff',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 13 }}>{item.strategyDisplayName}</Text>
        <Badge status={status.badge} text={<Text style={{ fontSize: 11, color: status.color }}>{status.label}</Text>} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Tag color={STRATEGY_TYPE_COLOR[item.strategyType] ?? 'default'} style={{ fontSize: 10, margin: 0 }}>
          {item.strategyType}
        </Tag>
        <Tag color={cause.color} style={{ fontSize: 10, margin: 0 }}>{cause.label}</Tag>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          <ClockCircleOutlined style={{ marginRight: 3 }} />{item.period}
        </Text>
        <Text style={{ fontSize: 12, color: isProfit ? '#52c41a' : '#f5222d', fontWeight: 600 }}>
          {isProfit ? '+' : ''}{item.pnl.toLocaleString()} USD
        </Text>
      </div>
    </div>
  )
}

// ── 右侧归因详情 ──────────────────────────────────────────────────────────────
function AttributionDetail({ item }: { item: Attribution }) {
  const status = STATUS_CONFIG[item.status]
  const cause  = ROOT_CAUSE_CONFIG[item.rootCause]
  const isProfit = item.pnl >= 0

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 关键指标 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: isProfit ? '#f6ffed' : '#fff2f0', borderRadius: 8, padding: '12px 16px', border: `1px solid ${isProfit ? '#b7eb8f' : '#ffccc7'}` }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>期间 PnL</Text>
              <Text style={{ fontSize: 20, fontWeight: 700, color: isProfit ? '#52c41a' : '#f5222d' }}>
                {isProfit ? '+' : ''}{item.pnl.toLocaleString()} USD
              </Text>
            </div>
            <div style={{ flex: 1, background: '#fff7e6', borderRadius: 8, padding: '12px 16px', border: '1px solid #ffd591' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>最大回撤</Text>
              <Text style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>{item.drawdown}%</Text>
            </div>
            <div style={{ flex: 1, background: '#f0f5ff', borderRadius: 8, padding: '12px 16px', border: '1px solid #adc6ff' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>归因状态</Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: status.color }}>{status.label}</Text>
            </div>
          </div>

          {/* 摘要 */}
          <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>异常摘要</Text>
            <Paragraph style={{ margin: 0, color: '#595959' }}>{item.summary}</Paragraph>
          </div>

          {/* 根因 + 关联事件 */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #f0f0f0', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13 }}>根本原因</Text>
              <Tag color={cause.color}>{cause.label}</Tag>
            </div>
            {item.relatedEvents.map((evt, i) => (
              <div key={i} style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
                <Space>
                  <ThunderboltOutlined style={{ color: '#faad14' }} />
                  <Text strong style={{ fontSize: 13 }}>{evt.name}</Text>
                  <Tag color="gold" style={{ fontSize: 10 }}>{evt.type}</Tag>
                </Space>
                <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0' }}>{evt.impact}</Paragraph>
              </div>
            ))}
          </div>

          {/* 结论 */}
          {item.conclusion ? (
            <Alert
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
              message={<Text strong>归因结论</Text>}
              description={item.conclusion}
              style={{ marginBottom: 12 }}
            />
          ) : (
            <Alert type="warning" showIcon message="归因调查中，结论待确认" />
          )}

          {item.analyst && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              分析师：{item.analyst}
              {item.resolvedAt && `  ·  解决时间：${item.resolvedAt}`}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'timeline',
      label: '事件时间线',
      children: (
        <div style={{ padding: '16px 0' }}>
          <Timeline
            items={item.timeline.map(t => ({
              dot: TIMELINE_ICON[t.type],
              children: (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t.time}</Text>
                  <div><Text style={{ fontSize: 13 }}>{t.content}</Text></div>
                </div>
              ),
            }))}
          />
        </div>
      ),
    },
    {
      key: 'params',
      label: `参数变更 ${item.paramChanges.length > 0 ? `(${item.paramChanges.length})` : ''}`,
      children: (
        <div style={{ padding: '16px 0' }}>
          {item.paramChanges.length === 0 ? (
            <Empty description="本次归因无参数变更" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            item.paramChanges.map((p, i) => (
              <div key={i} style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text code style={{ fontSize: 12 }}>{p.param}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{p.changedAt}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Tag color="red" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.before}</Tag>
                  <Text type="secondary">→</Text>
                  <Tag color="green" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.after}</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>{p.reason}</Text>
              </div>
            ))
          )}
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* 标题 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <RobotOutlined style={{ fontSize: 20, color: '#722ed1' }} />
          <Title level={4} style={{ margin: 0 }}>{item.strategyDisplayName}</Title>
          <Tag color={STRATEGY_TYPE_COLOR[item.strategyType] ?? 'default'}>{item.strategyType}</Tag>
          <Tag color={cause.color}>{cause.label}</Tag>
        </Space>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />{item.period}
          </Text>
        </div>
      </div>

      <Tabs items={tabItems} />
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function StrategyAttributionPage() {
  const [selectedId, setSelectedId] = useState<number>(MOCK_ATTRIBUTIONS[0].id)
  const selected = MOCK_ATTRIBUTIONS.find(a => a.id === selectedId)!

  const resolvedCount     = MOCK_ATTRIBUTIONS.filter(a => a.status === 'RESOLVED').length
  const investigatingCount = MOCK_ATTRIBUTIONS.filter(a => a.status === 'INVESTIGATING').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部统计 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
      }}>
        <Space size={4}>
          <RobotOutlined style={{ color: '#722ed1' }} />
          <Text strong style={{ fontSize: 14 }}>策略归因</Text>
        </Space>
        <Divider type="vertical" />
        <Space size={6}>
          <Badge color="#fa8c16" />
          <Text style={{ fontSize: 13 }}>调查中 {investigatingCount} 个</Text>
        </Space>
        <Space size={6}>
          <Badge color="#52c41a" />
          <Text style={{ fontSize: 13 }}>已解决 {resolvedCount} 个</Text>
        </Space>
        <Space size={6}>
          <Badge color="#8c8c8c" />
          <Text style={{ fontSize: 13 }}>共 {MOCK_ATTRIBUTIONS.length} 条</Text>
        </Space>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* 左侧列表 */}
        <div style={{
          width: 280, flexShrink: 0,
          borderRight: '1px solid #f0f0f0',
          overflowY: 'auto', background: '#fff',
        }}>
          {MOCK_ATTRIBUTIONS.map(item => (
            <AttributionItem
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onClick={() => setSelectedId(item.id)}
            />
          ))}
        </div>

        {/* 右侧详情 */}
        <div style={{ flex: 1, minWidth: 0, background: '#f5f5f5', overflowY: 'auto' }}>
          <AttributionDetail item={selected} />
        </div>
      </div>
    </div>
  )
}
