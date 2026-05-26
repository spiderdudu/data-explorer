import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Input, Tag, Space, Typography, Badge, Tooltip,
  List, Spin, Empty, Segmented,
} from 'antd'
import { SearchOutlined, RobotOutlined } from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { OntEntity } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

const STRATEGY_TYPE_CONFIG: Record<string, { color: string; tagColor: string }> = {
  TrendFollowing: { color: '#1677ff', tagColor: 'blue'     },
  MeanReversion:  { color: '#52c41a', tagColor: 'green'    },
  Arbitrage:      { color: '#722ed1', tagColor: 'purple'   },
  MarketMaking:   { color: '#fa8c16', tagColor: 'orange'   },
  EventDriven:    { color: '#eb2f96', tagColor: 'magenta'  },
  Execution:      { color: '#13c2c2', tagColor: 'cyan'     },
}

const STRATEGY_TYPE_LABEL: Record<string, string> = {
  TrendFollowing: '趋势跟踪',
  MeanReversion:  '均值回归',
  Arbitrage:      '套利',
  MarketMaking:   '做市',
  EventDriven:    '事件驱动',
  Execution:      '执行算法',
}

const ENV_COLOR: Record<string, string> = {
  prod: 'green', uat: 'orange', dev: 'default',
}

// ── 单条 Strategy 卡片 ────────────────────────────────────────────────────────
function StrategyItem({ strategy }: { strategy: OntEntity }) {
  const cfg = STRATEGY_TYPE_CONFIG[strategy.platform] ?? { color: '#8c8c8c', tagColor: 'default' }
  const typeLabel = STRATEGY_TYPE_LABEL[strategy.platform] ?? strategy.platform

  return (
    <List.Item style={{ display: 'block', padding: '12px 16px', cursor: 'default' }}>
      {/* 行1：图标 + 名称 + tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <RobotOutlined style={{ color: cfg.color, fontSize: 16, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={6} wrap>
            <Text strong style={{ fontSize: 14 }}>{strategy.displayName ?? strategy.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>({strategy.name})</Text>
            <Tag color={cfg.tagColor} style={{ fontSize: 11, margin: 0 }}>{typeLabel}</Tag>
            <Tag color={ENV_COLOR[strategy.env]} style={{ fontSize: 11, margin: 0 }}>{strategy.env}</Tag>
            {strategy.status === 0 && <Tag color="default" style={{ fontSize: 11, margin: 0 }}>停用</Tag>}
            <Tooltip title="当前版本">
              <Badge count={`v${strategy.currentVersion}`} color={cfg.color} style={{ fontSize: 10 }} />
            </Tooltip>
          </Space>
        </div>
      </div>
      {/* 行2：描述 + URN */}
      <div style={{ paddingLeft: 26 }}>
        {strategy.description && (
          <Paragraph
            type="secondary"
            style={{ fontSize: 13, margin: '2px 0 4px' }}
            ellipsis={{ rows: 1, expandable: true, symbol: '展开' }}
          >
            {strategy.description}
          </Paragraph>
        )}
        <Tooltip title={strategy.urn}>
          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
            {strategy.urn}
          </Text>
        </Tooltip>
      </div>
    </List.Item>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function StrategiesPage() {
  const [query, setQuery]             = useState('')
  const [strategyType, setStrategyType] = useState<string>('all')

  const { data: allStrategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => ontologyApi.getStrategies(),
  })

  const filtered = (allStrategies ?? []).filter(s => {
    const matchType = strategyType === 'all' || s.platform === strategyType
    const q = query.toLowerCase()
    const matchQuery = !q ||
      s.name.toLowerCase().includes(q) ||
      (s.displayName ?? '').toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q)
    return matchType && matchQuery
  })

  const counts = (allStrategies ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.platform] = (acc[s.platform] ?? 0) + 1
    return acc
  }, {})

  const segmentedOptions = [
    { label: `全部 (${allStrategies?.length ?? 0})`, value: 'all' },
    ...Object.entries(STRATEGY_TYPE_LABEL).map(([key, label]) => ({
      label: `${label} (${counts[key] ?? 0})`,
      value: key,
    })),
  ]

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #f0f0f0',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Strategy</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              自动交易策略，按策略类型分类，参数结构由 strategy_type 维度决定
            </Text>
          </div>
          <div style={{ flex: 1 }} />
          <Input
            placeholder="搜索策略名称或描述"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={query}
            onChange={e => setQuery(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
        </div>

        {/* 类型筛选 */}
        <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 20px' }}>
          <Segmented
            value={strategyType}
            onChange={v => setStrategyType(v as string)}
            options={segmentedOptions}
          />
        </div>

        {/* 列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
          )}
          {!isLoading && filtered.length === 0 && (
            <Empty description="暂无策略" style={{ marginTop: 60 }} />
          )}
          {!isLoading && filtered.length > 0 && (
            <List
              dataSource={filtered}
              renderItem={strategy => <StrategyItem key={strategy.id} strategy={strategy} />}
              style={{ background: '#fff', borderRadius: 8, marginTop: 16 }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
