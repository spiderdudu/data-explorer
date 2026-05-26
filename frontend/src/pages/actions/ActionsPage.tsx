import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Input, Tag, Space, Typography, Badge, Tooltip,
  List, Spin, Empty, Segmented,
} from 'antd'
import {
  ThunderboltOutlined, SearchOutlined,
  ApiOutlined, DeploymentUnitOutlined, BellOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { OntEntity } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

const ACTION_TYPE_CONFIG: Record<string, {
  label: string
  color: string
  icon: React.ReactNode
  tagColor: string
}> = {
  action_grpc:    { label: 'gRPC',    color: '#1677ff', icon: <ApiOutlined />,            tagColor: 'blue'    },
  action_airflow: { label: 'Airflow', color: '#fa8c16', icon: <DeploymentUnitOutlined />, tagColor: 'orange'  },
  action_alert:   { label: 'Alert',   color: '#eb2f96', icon: <BellOutlined />,           tagColor: 'magenta' },
}

const ENV_COLOR: Record<string, string> = {
  prod: 'green', uat: 'orange', dev: 'default',
}

// ── 单条 Action 卡片 ──────────────────────────────────────────────────────────
function ActionItem({ action }: { action: OntEntity }) {
  const cfg = ACTION_TYPE_CONFIG[action.platform] ?? { label: action.platform, color: '#8c8c8c', icon: <ThunderboltOutlined />, tagColor: 'default' }

  return (
    <List.Item style={{ display: 'block', padding: '12px 16px', cursor: 'default' }}>
      {/* 行1：图标 + 名称 + tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ color: cfg.color, fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={6} wrap>
            <Text strong style={{ fontSize: 14 }}>{action.displayName ?? action.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>({action.name})</Text>
            <Tag color={cfg.tagColor} style={{ fontSize: 11, margin: 0 }}>{cfg.label}</Tag>
            <Tag color={ENV_COLOR[action.env]} style={{ fontSize: 11, margin: 0 }}>{action.env}</Tag>
            {action.status === 0 && <Tag color="default" style={{ fontSize: 11, margin: 0 }}>停用</Tag>}
          </Space>
        </div>
      </div>
      {/* 行2：描述 + URN */}
      <div style={{ paddingLeft: 26 }}>
        {action.description && (
          <Paragraph
            type="secondary"
            style={{ fontSize: 13, margin: '2px 0 4px' }}
            ellipsis={{ rows: 1, expandable: true, symbol: '展开' }}
          >
            {action.description}
          </Paragraph>
        )}
        <Tooltip title={action.urn}>
          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
            {action.urn}
          </Text>
        </Tooltip>
      </div>
    </List.Item>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function ActionsPage() {
  const [query, setQuery]         = useState('')
  const [actionType, setActionType] = useState<string>('all')

  const { data: allActions, isLoading } = useQuery({
    queryKey: ['actions'],
    queryFn: () => ontologyApi.getActions(),
  })

  // 前端过滤
  const filtered = (allActions ?? []).filter(a => {
    const matchType = actionType === 'all' || a.platform === actionType
    const q = query.toLowerCase()
    const matchQuery = !q ||
      a.name.toLowerCase().includes(q) ||
      (a.displayName ?? '').toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q)
    return matchType && matchQuery
  })

  // 各类型数量
  const counts = (allActions ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.platform] = (acc[a.platform] ?? 0) + 1
    return acc
  }, {})

  const segmentedOptions = [
    { label: `全部 (${allActions?.length ?? 0})`, value: 'all' },
    ...Object.entries(ACTION_TYPE_CONFIG).map(([key, cfg]) => ({
      label: `${cfg.label} (${counts[key] ?? 0})`,
      value: key,
    })),
  ]

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
      {/* 主内容区 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #f0f0f0',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Action</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              系统内置的可触发操作，包括 gRPC 写操作、Airflow DAG、预警推送
            </Text>
          </div>
          <div style={{ flex: 1 }} />
          <Input
            placeholder="搜索操作名称或描述"
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
            value={actionType}
            onChange={v => setActionType(v as string)}
            options={segmentedOptions}
          />
        </div>

        {/* 列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
          )}
          {!isLoading && filtered.length === 0 && (
            <Empty description="暂无操作" style={{ marginTop: 60 }} />
          )}
          {!isLoading && filtered.length > 0 && (
            <List
              dataSource={filtered}
              renderItem={action => <ActionItem key={action.id} action={action} />}
              style={{ background: '#fff', borderRadius: 8, marginTop: 16 }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
