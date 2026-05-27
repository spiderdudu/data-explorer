import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Typography, Tag, Space, Badge, Divider, Tabs,
  Table, Progress, Tooltip, Segmented, Spin,
} from 'antd'
import {
  MonitorOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, RobotOutlined, ThunderboltOutlined, ApiOutlined,
} from '@ant-design/icons'
import { agentApi } from '@/api/ontology'
import type { OntAgentTrace, OntEvalRun } from '@/types/ontology'

const { Text } = Typography

const SKILL_TYPE_COLOR: Record<string, string> = {
  llm: 'purple', grpc: 'blue', http: 'orange', dag: 'cyan', function: 'green',
}

const TRIGGER_COLOR: Record<string, string> = {
  event: 'magenta', schedule: 'geekblue', manual: 'default', stream: 'cyan',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  failed:  <CloseCircleOutlined style={{ color: '#f5222d' }} />,
  running: <LoadingOutlined     style={{ color: '#1677ff' }} />,
  timeout: <CloseCircleOutlined style={{ color: '#fa8c16' }} />,
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

// ── Trace Tab ─────────────────────────────────────────────────────────────────

function TraceTab({ traces }: { traces: OntAgentTrace[] }) {
  const [agentFilter, setAgentFilter] = useState('all')
  const agentNames = [...new Set(traces.map(t => t.agentName))]
  const filtered = agentFilter === 'all' ? traces : traces.filter(t => t.agentName === agentFilter)

  const expandedRowRender = (trace: OntAgentTrace) => (
    <div style={{ padding: '8px 48px' }}>
      <Table
        size="small"
        pagination={false}
        dataSource={trace.steps.map((s, i) => ({ ...s, key: i }))}
        columns={[
          {
            title: '#', dataIndex: 'key', width: 36,
            render: (n: number) => <Text type="secondary" style={{ fontSize: 11 }}>{n + 1}</Text>,
          },
          {
            title: 'Skill', dataIndex: 'skill', width: 200,
            render: (name: string, r: any) => (
              <Space size={6}>
                <ApiOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                <Text code style={{ fontSize: 11 }}>{name}</Text>
                <Tag color={SKILL_TYPE_COLOR[r.skillType]} style={{ fontSize: 10, margin: 0 }}>{r.skillType}</Tag>
              </Space>
            ),
          },
          {
            title: '状态', dataIndex: 'status', width: 70,
            render: (s: string) => STATUS_ICON[s] ?? STATUS_ICON.failed,
          },
          {
            title: '耗时', dataIndex: 'durationMs', width: 80,
            render: (ms: number) => <Text style={{ fontSize: 12 }}>{formatDuration(ms)}</Text>,
          },
          {
            title: 'Tokens', width: 120,
            render: (_: unknown, r: any) => r.tokenIn
              ? <Text type="secondary" style={{ fontSize: 11 }}>{r.tokenIn} in / {r.tokenOut} out</Text>
              : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
          },
          {
            title: '错误', dataIndex: 'error',
            render: (e?: string) => e
              ? <Text type="danger" style={{ fontSize: 11 }}>{e}</Text>
              : null,
          },
        ]}
      />
    </div>
  )

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={agentFilter}
          onChange={v => setAgentFilter(v as string)}
          options={[
            { label: `全部 (${traces.length})`, value: 'all' },
            ...agentNames.map(n => ({
              label: `${n.split(' ').pop()} (${traces.filter(t => t.agentName === n).length})`,
              value: n,
            })),
          ]}
        />
      </div>
      <Table
        size="small"
        dataSource={filtered.map(t => ({ ...t, key: t.id }))}
        pagination={false}
        expandable={{ expandedRowRender }}
        columns={[
          {
            title: 'Trace ID', dataIndex: 'id', width: 120,
            render: (id: string) => <Text code style={{ fontSize: 11 }}>{id}</Text>,
          },
          {
            title: 'Agent', dataIndex: 'agentName', width: 200,
            render: (name: string) => (
              <Space size={6}>
                <RobotOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                <Text style={{ fontSize: 13 }}>{name}</Text>
              </Space>
            ),
          },
          {
            title: '触发', dataIndex: 'triggerType', width: 100,
            render: (t: string, r: OntAgentTrace) => (
              <Tooltip title={r.triggerRef}>
                <Tag color={TRIGGER_COLOR[t]} style={{ fontSize: 11, margin: 0 }}>{t}</Tag>
              </Tooltip>
            ),
          },
          {
            title: '状态', dataIndex: 'status', width: 70,
            render: (s: string) => STATUS_ICON[s] ?? STATUS_ICON.failed,
          },
          {
            title: '耗时', dataIndex: 'durationMs', width: 80,
            render: (ms: number) => <Text style={{ fontSize: 12 }}>{formatDuration(ms)}</Text>,
          },
          {
            title: 'Tokens', width: 90,
            render: (_: unknown, r: OntAgentTrace) => r.tokenIn
              ? <Text type="secondary" style={{ fontSize: 11 }}>{r.tokenIn + r.tokenOut}</Text>
              : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
          },
          {
            title: '时间', dataIndex: 'runAt',
            render: (t: string) => <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(t)}</Text>,
          },
        ]}
      />
    </div>
  )
}

// ── EvalRun Tab ───────────────────────────────────────────────────────────────

function EvalRunTab({ evals }: { evals: OntEvalRun[] }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <Table
        size="small"
        dataSource={evals.map(e => ({ ...e, key: e.id }))}
        pagination={false}
        columns={[
          {
            title: 'Agent', dataIndex: 'agentName', width: 220,
            render: (name: string) => (
              <Space size={6}>
                <RobotOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                <Text style={{ fontSize: 13 }}>{name}</Text>
              </Space>
            ),
          },
          {
            title: 'Dataset', dataIndex: 'datasetName', width: 220,
            render: (d: string) => <Text code style={{ fontSize: 11 }}>{d}</Text>,
          },
          {
            title: 'Cases', dataIndex: 'caseCount', width: 65,
            render: (n: number) => <Text style={{ fontSize: 12 }}>{n}</Text>,
          },
          {
            title: 'Accuracy', dataIndex: 'accuracy', width: 130,
            render: (v: number) => (
              <Progress
                percent={Math.round(v * 100)}
                size="small"
                style={{ margin: 0, width: 110 }}
                strokeColor={v >= 0.85 ? '#52c41a' : v >= 0.75 ? '#fa8c16' : '#f5222d'}
              />
            ),
          },
          {
            title: 'F1', dataIndex: 'f1', width: 65,
            render: (v: number) => (
              <Text style={{ fontSize: 12, color: v >= 0.85 ? '#52c41a' : '#fa8c16' }}>
                {v.toFixed(2)}
              </Text>
            ),
          },
          {
            title: 'Avg 耗时', dataIndex: 'avgDurationMs', width: 90,
            render: (ms: number) => <Text style={{ fontSize: 12 }}>{formatDuration(ms)}</Text>,
          },
          {
            title: 'Avg Token', dataIndex: 'avgTokenTotal', width: 90,
            render: (n: number) => <Text type="secondary" style={{ fontSize: 12 }}>{n || '—'}</Text>,
          },
          {
            title: '时间', dataIndex: 'runAt',
            render: (t: string) => <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(t)}</Text>,
          },
        ]}
      />
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function AgentMonitorPage() {
  const { data: traces = [],   isLoading: tracesLoading }   = useQuery({ queryKey: ['agentTraces'],   queryFn: () => agentApi.getTraces()   })
  const { data: evalRuns = [], isLoading: evalsLoading }    = useQuery({ queryKey: ['agentEvalRuns'], queryFn: () => agentApi.getEvalRuns() })

  const successCount = traces.filter(t => t.status === 'success').length
  const failedCount  = traces.filter(t => t.status === 'failed').length
  const totalTokens  = traces.reduce((s, t) => s + t.tokenIn + t.tokenOut, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部统计栏 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
      }}>
        <Space size={4}>
          <MonitorOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ fontSize: 14 }}>Agent Monitor</Text>
        </Space>
        <Divider type="vertical" />
        <Space size={6}><Badge color="#52c41a" /><Text style={{ fontSize: 13 }}>成功 {successCount}</Text></Space>
        <Space size={6}><Badge color="#f5222d" /><Text style={{ fontSize: 13 }}>失败 {failedCount}</Text></Space>
        <Space size={6}>
          <ThunderboltOutlined style={{ color: '#faad14', fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>Tokens {totalTokens.toLocaleString()}</Text>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="trace"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ background: '#fff', paddingLeft: 20, marginBottom: 0, flexShrink: 0 }}
        items={[
          {
            key: 'trace',
            label: `Agent Trace (${traces.length})`,
            children: (
              <div style={{ height: '100%', overflowY: 'auto', background: '#f5f5f5' }}>
                {tracesLoading
                  ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
                  : <TraceTab traces={traces} />
                }
              </div>
            ),
          },
          {
            key: 'eval',
            label: `Eval Run (${evalRuns.length})`,
            children: (
              <div style={{ height: '100%', overflowY: 'auto', background: '#f5f5f5' }}>
                {evalsLoading
                  ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
                  : <EvalRunTab evals={evalRuns} />
                }
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
