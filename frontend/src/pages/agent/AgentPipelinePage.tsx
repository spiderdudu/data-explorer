import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Typography, Tag, Space, Badge, Spin, Card, Steps, Descriptions,
  Table, Progress, Tooltip, Empty, Divider,
} from 'antd'
import {
  RobotOutlined, ThunderboltOutlined, ToolOutlined, DatabaseOutlined,
  UserOutlined, DollarOutlined, ExperimentOutlined, RocketOutlined,
  PlayCircleOutlined, MonitorOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, ApiOutlined,
  BulbOutlined, SettingOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { pipelineApi } from '@/api/ontology'
import type { OntPipeline, PipelineStage, PipelineTestCase } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<PipelineStage, { label: string; icon: React.ReactNode; color: string }> = {
  assembly: { label: '组装',  icon: <SettingOutlined />,      color: '#1677ff' },
  rbac:     { label: '权限',  icon: <UserOutlined />,         color: '#722ed1' },
  budget:   { label: '预算',  icon: <DollarOutlined />,       color: '#fa8c16' },
  test:     { label: '测试',  icon: <ExperimentOutlined />,   color: '#13c2c2' },
  publish:  { label: '发布',  icon: <RocketOutlined />,       color: '#52c41a' },
  run:      { label: '运行',  icon: <PlayCircleOutlined />,   color: '#1677ff' },
  monitor:  { label: '监控',  icon: <MonitorOutlined />,      color: '#eb2f96' },
}

const STAGE_ORDER: PipelineStage[] = ['assembly', 'rbac', 'budget', 'test', 'publish', 'run', 'monitor']

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  draft:      { color: 'default',   label: 'Draft'      },
  testing:    { color: 'processing', label: 'Testing'   },
  published:  { color: 'success',   label: 'Published'  },
  running:    { color: 'blue',      label: 'Running'    },
  paused:     { color: 'warning',   label: 'Paused'     },
  deprecated: { color: 'error',     label: 'Deprecated' },
}

const TEST_STATUS_ICON: Record<string, React.ReactNode> = {
  pass:    <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  fail:    <CloseCircleOutlined style={{ color: '#f5222d' }} />,
  pending: <ClockCircleOutlined style={{ color: '#bfbfbf' }} />,
}

function fmtTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtNum(n?: number) {
  if (n == null) return '—'
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
}

// ── Pipeline list item ────────────────────────────────────────────────────────

function PipelineListItem({ pipeline, selected, onSelect }: {
  pipeline: OntPipeline; selected: boolean; onSelect: () => void
}) {
  const st = STATUS_TAG[pipeline.status]
  const stage = STAGE_CONFIG[pipeline.currentStage]
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '12px 16px', cursor: 'pointer',
        borderBottom: '1px solid #f5f5f5',
        borderLeft: `3px solid ${selected ? '#1677ff' : 'transparent'}`,
        background: selected ? '#f0f5ff' : '#fff',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <RobotOutlined style={{ color: '#1677ff', fontSize: 14, flexShrink: 0 }} />
        <Text strong style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pipeline.displayName}
        </Text>
        <Badge count={`v${pipeline.version}`} color="#8c8c8c" style={{ fontSize: 10 }} />
      </div>
      <Space size={4} wrap style={{ marginBottom: 4 }}>
        <Tag color={st.color} style={{ fontSize: 10, margin: 0 }}>{st.label}</Tag>
        <Tag color={pipeline.env === 'prod' ? 'green' : pipeline.env === 'uat' ? 'orange' : 'default'} style={{ fontSize: 10, margin: 0 }}>
          {pipeline.env}
        </Tag>
        <Tag icon={stage.icon} style={{ fontSize: 10, margin: 0, color: stage.color, borderColor: stage.color, background: 'transparent' }}>
          {stage.label}
        </Tag>
      </Space>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ClockCircleOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />
        <Text type="secondary" style={{ fontSize: 11 }}>{fmtTime(pipeline.lastRunAt)}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>· {pipeline.runCount} runs</Text>
        {pipeline.runCount > 0 && (
          <Text style={{ fontSize: 11, color: pipeline.successRate >= 0.95 ? '#52c41a' : '#fa8c16' }}>
            {Math.round(pipeline.successRate * 100)}%
          </Text>
        )}
      </div>
    </div>
  )
}

// ── Stage: Assembly ───────────────────────────────────────────────────────────

function AssemblyPanel({ pipeline }: { pipeline: OntPipeline }) {
  const { assembly } = pipeline
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card size="small" title={<Space size={6}><RobotOutlined style={{ color: '#1677ff' }} /><Text strong>Agent</Text></Space>}>
        {assembly.agentName
          ? <Space><Tag color="blue">{assembly.agentName}</Tag><Text type="secondary" style={{ fontSize: 12 }}>id: {assembly.agentId}</Text></Space>
          : <Text type="secondary">未选择</Text>}
      </Card>

      <Card size="small" title={<Space size={6}><ThunderboltOutlined style={{ color: '#722ed1' }} /><Text strong>Skills</Text><Text type="secondary" style={{ fontSize: 12 }}>({assembly.skillNames.length} 个，有序)</Text></Space>}>
        <Steps
          size="small"
          direction="vertical"
          style={{ marginTop: 4 }}
          items={assembly.skillNames.map((name, i) => ({
            title: <Text style={{ fontSize: 13 }}>{name}</Text>,
            status: 'finish' as const,
            icon: i === 0
              ? <PlayCircleOutlined style={{ color: '#1677ff' }} />
              : i === assembly.skillNames.length - 1
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
              : <ApiOutlined style={{ color: '#722ed1' }} />,
          }))}
        />
      </Card>

      <Card size="small" title={<Space size={6}><ToolOutlined style={{ color: '#fa8c16' }} /><Text strong>Tools</Text></Space>}>
        <Space size={6} wrap>
          {assembly.toolNames.map(t => <Tag key={t} color="orange" style={{ fontSize: 12 }}>{t}</Tag>)}
        </Space>
      </Card>

      <Card size="small" title={<Space size={6}><BulbOutlined style={{ color: '#722ed1' }} /><Text strong>LLM Model</Text></Space>}>
        {assembly.llmModel
          ? <Tag color="purple" style={{ fontSize: 12 }}>{assembly.llmModel}</Tag>
          : <Text type="secondary">无 LLM（纯规则/gRPC）</Text>}
      </Card>

      <Card size="small" title={<Space size={6}><DatabaseOutlined style={{ color: '#13c2c2' }} /><Text strong>Datasets</Text><Text type="secondary" style={{ fontSize: 12 }}>({assembly.datasetUrns.length} 个)</Text></Space>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {assembly.datasetUrns.map(urn => (
            <Text key={urn} code style={{ fontSize: 11 }}>{urn}</Text>
          ))}
        </div>
      </Card>

      <Card size="small" title={<Space size={6}><ClockCircleOutlined style={{ color: '#1677ff' }} /><Text strong>触发方式</Text></Space>}>
        <Space size={6} wrap>
          <Tag color="geekblue">{assembly.triggerType}</Tag>
          {assembly.cronExpr && <Text code style={{ fontSize: 12 }}>{assembly.cronExpr}</Text>}
          {assembly.eventTypes?.map(e => <Tag key={e} color="magenta" style={{ fontSize: 11 }}>{e}</Tag>)}
        </Space>
      </Card>
    </div>
  )
}

// ── Stage: RBAC ───────────────────────────────────────────────────────────────

function RbacPanel({ pipeline }: { pipeline: OntPipeline }) {
  const { rbac } = pipeline
  return (
    <Card size="small">
      <Descriptions column={1} size="small" labelStyle={{ width: 100, color: '#8c8c8c', fontSize: 13 }}>
        <Descriptions.Item label="Owners">
          <Space size={4} wrap>{rbac.owners.map(u => <Tag key={u} color="blue" style={{ fontSize: 12 }}>{u}</Tag>)}</Space>
        </Descriptions.Item>
        <Descriptions.Item label="Operators">
          <Space size={4} wrap>{rbac.operators.map(u => <Tag key={u} color="cyan" style={{ fontSize: 12 }}>{u}</Tag>)}</Space>
        </Descriptions.Item>
        <Descriptions.Item label="Viewers">
          <Space size={4} wrap>
            {rbac.viewers.length === 0
              ? <Text type="secondary">无</Text>
              : rbac.viewers.map(u => <Tag key={u} style={{ fontSize: 12 }}>{u}</Tag>)}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="发布审批">
          {rbac.requireApproval
            ? <Space size={4}><Badge status="warning" /><Text>需要审批</Text>{rbac.approvers.map(u => <Tag key={u} color="gold" style={{ fontSize: 12 }}>{u}</Tag>)}</Space>
            : <Space size={4}><Badge status="default" /><Text type="secondary">无需审批</Text></Space>}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

// ── Stage: Budget ─────────────────────────────────────────────────────────────

function BudgetPanel({ pipeline }: { pipeline: OntPipeline }) {
  const { budget } = pipeline
  return (
    <Card size="small">
      <Descriptions column={2} size="small" labelStyle={{ color: '#8c8c8c', fontSize: 13 }}>
        <Descriptions.Item label="单次 Token 上限">
          {budget.maxTokensPerRun ? fmtNum(budget.maxTokensPerRun) : <Text type="secondary">不限</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="每日 Token 上限">
          {budget.maxTokensPerDay ? fmtNum(budget.maxTokensPerDay) : <Text type="secondary">不限</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="每日运行次数">
          {budget.maxRunsPerDay ? `${budget.maxRunsPerDay} 次` : <Text type="secondary">不限</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="每日费用上限">
          {budget.maxCostUsdPerDay ? `$${budget.maxCostUsdPerDay}` : <Text type="secondary">不限</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="告警阈值" span={2}>
          <Space size={8}>
            <Progress percent={budget.alertThresholdPct} size="small" style={{ width: 160 }} strokeColor="#fa8c16" />
            <Text type="secondary" style={{ fontSize: 12 }}>达到预算 {budget.alertThresholdPct}% 时告警</Text>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

// ── Stage: Test ───────────────────────────────────────────────────────────────

const TEST_COLUMNS: ColumnsType<PipelineTestCase> = [
  {
    title: '状态', dataIndex: 'status', key: 'status', width: 60, align: 'center',
    render: (s: string) => <Tooltip title={s}>{TEST_STATUS_ICON[s]}</Tooltip>,
  },
  {
    title: 'Input', dataIndex: 'input', key: 'input', width: 260,
    render: (v: string) => <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>{v}</Text>,
  },
  {
    title: 'Expected', dataIndex: 'expectedOutput', key: 'expectedOutput', width: 120,
    render: (v?: string) => v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
  },
  {
    title: 'Actual', dataIndex: 'actualOutput', key: 'actualOutput', width: 160,
    render: (v?: string, r?: PipelineTestCase) => {
      if (!v) return <Text type="secondary">—</Text>
      const ok = v === r?.expectedOutput
      return <Text style={{ fontSize: 12, color: ok ? '#52c41a' : '#f5222d' }}>{v}</Text>
    },
  },
  {
    title: 'Duration', dataIndex: 'durationMs', key: 'durationMs', width: 80, align: 'right',
    render: (v?: number) => v != null ? <Text style={{ fontSize: 12 }}>{v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${v}ms`}</Text> : '—',
  },
  {
    title: 'Tokens', dataIndex: 'tokenUsed', key: 'tokenUsed', width: 70, align: 'right',
    render: (v?: number) => v != null ? <Text style={{ fontSize: 12 }}>{fmtNum(v)}</Text> : '—',
  },
]

function TestPanel({ pipeline }: { pipeline: OntPipeline }) {
  const { testCases } = pipeline
  const pass    = testCases.filter(t => t.status === 'pass').length
  const fail    = testCases.filter(t => t.status === 'fail').length
  const pending = testCases.filter(t => t.status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card size="small">
        <Space size={20}>
          <Space size={6}><CheckCircleOutlined style={{ color: '#52c41a' }} /><Text>通过 {pass}</Text></Space>
          <Space size={6}><CloseCircleOutlined style={{ color: '#f5222d' }} /><Text>失败 {fail}</Text></Space>
          <Space size={6}><ClockCircleOutlined style={{ color: '#bfbfbf' }} /><Text>待运行 {pending}</Text></Space>
          {testCases.length > 0 && (
            <Progress
              percent={Math.round((pass / testCases.length) * 100)}
              size="small"
              style={{ width: 120 }}
              strokeColor={fail > 0 ? '#f5222d' : '#52c41a'}
            />
          )}
        </Space>
      </Card>
      {testCases.length > 0
        ? <Table columns={TEST_COLUMNS} dataSource={testCases} rowKey="id" size="small" pagination={false} />
        : <Empty description="暂无测试用例" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    </div>
  )
}

// ── Stage: Publish ────────────────────────────────────────────────────────────

function PublishPanel({ pipeline }: { pipeline: OntPipeline }) {
  return (
    <Card size="small">
      <Descriptions column={2} size="small" labelStyle={{ color: '#8c8c8c', fontSize: 13 }}>
        <Descriptions.Item label="当前状态">
          <Tag color={STATUS_TAG[pipeline.status].color}>{STATUS_TAG[pipeline.status].label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="版本">
          <Text strong>v{pipeline.version}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="发布时间">
          <Text style={{ fontSize: 12 }}>{fmtTime(pipeline.publishedAt)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="发布人">
          <Text style={{ fontSize: 12 }}>{pipeline.publishedBy ?? '—'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="审批要求" span={2}>
          {pipeline.rbac.requireApproval
            ? <Space size={4}><Badge status="warning" /><Text>需要审批，审批人：</Text>{pipeline.rbac.approvers.map(u => <Tag key={u} color="gold" style={{ fontSize: 12 }}>{u}</Tag>)}</Space>
            : <Space size={4}><Badge status="default" /><Text type="secondary">无需审批，可直接发布</Text></Space>}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

// ── Stage: Run ────────────────────────────────────────────────────────────────

function RunPanel({ pipeline }: { pipeline: OntPipeline }) {
  return (
    <Card size="small">
      <Descriptions column={2} size="small" labelStyle={{ color: '#8c8c8c', fontSize: 13 }}>
        <Descriptions.Item label="运行状态">
          <Tag color={STATUS_TAG[pipeline.status].color}>{STATUS_TAG[pipeline.status].label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="触发方式">
          <Tag color="geekblue">{pipeline.assembly.triggerType}</Tag>
          {pipeline.assembly.cronExpr && <Text code style={{ fontSize: 11, marginLeft: 4 }}>{pipeline.assembly.cronExpr}</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="累计执行">
          <Text strong>{pipeline.runCount}</Text> 次
        </Descriptions.Item>
        <Descriptions.Item label="成功率">
          <Text strong style={{ color: pipeline.successRate >= 0.95 ? '#52c41a' : '#fa8c16' }}>
            {pipeline.runCount > 0 ? `${Math.round(pipeline.successRate * 100)}%` : '—'}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="最近运行" span={2}>
          <Text style={{ fontSize: 12 }}>{fmtTime(pipeline.lastRunAt)}</Text>
        </Descriptions.Item>
        {pipeline.assembly.eventTypes && (
          <Descriptions.Item label="监听事件" span={2}>
            <Space size={4} wrap>
              {pipeline.assembly.eventTypes.map(e => <Tag key={e} color="magenta" style={{ fontSize: 11 }}>{e}</Tag>)}
            </Space>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  )
}

// ── Stage: Monitor ────────────────────────────────────────────────────────────

function MonitorPanel({ pipeline }: { pipeline: OntPipeline }) {
  return (
    <Card size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: '总执行次数', value: pipeline.runCount, color: '#1677ff' },
            { label: '成功率', value: pipeline.runCount > 0 ? `${Math.round(pipeline.successRate * 100)}%` : '—', color: pipeline.successRate >= 0.95 ? '#52c41a' : '#fa8c16' },
            { label: '最近运行', value: fmtTime(pipeline.lastRunAt), color: '#595959' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: '#fafafa', borderRadius: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          详细 Trace 记录和 Eval Run 结果请前往 <Text strong>Agent Monitor</Text> 页面查看。
        </Text>
      </div>
    </Card>
  )
}

// ── Pipeline detail ───────────────────────────────────────────────────────────

function PipelineDetail({ pipeline }: { pipeline: OntPipeline }) {
  const [activeStage, setActiveStage] = useState<PipelineStage>(pipeline.currentStage)
  const currentIdx = STAGE_ORDER.indexOf(pipeline.currentStage)

  const stepsItems = STAGE_ORDER.map((stage, i) => {
    const cfg = STAGE_CONFIG[stage]
    let status: 'finish' | 'process' | 'wait' = 'wait'
    if (i < currentIdx) status = 'finish'
    else if (i === currentIdx) status = 'process'
    return {
      title: (
        <span
          style={{ cursor: 'pointer', fontSize: 13, color: activeStage === stage ? cfg.color : undefined }}
          onClick={() => setActiveStage(stage)}
        >
          {cfg.label}
        </span>
      ),
      icon: <span style={{ color: status === 'finish' ? '#52c41a' : status === 'process' ? cfg.color : '#bfbfbf', fontSize: 14 }}>{cfg.icon}</span>,
      status,
    }
  })

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 800 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Title level={4} style={{ margin: 0 }}>{pipeline.displayName}</Title>
            <Badge count={`v${pipeline.version}`} color="geekblue" style={{ fontSize: 10 }} />
            <Tag color={STATUS_TAG[pipeline.status].color}>{STATUS_TAG[pipeline.status].label}</Tag>
            <Tag color={pipeline.env === 'prod' ? 'green' : pipeline.env === 'uat' ? 'orange' : 'default'}>{pipeline.env}</Tag>
          </div>
          {pipeline.description && (
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>{pipeline.description}</Paragraph>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            创建人: {pipeline.createdBy} · 创建于 {fmtTime(pipeline.createdAt)} · 更新于 {fmtTime(pipeline.updatedAt)}
          </Text>
        </div>

        {/* Stage progress bar */}
        <Card size="small" style={{ marginBottom: 20 }}>
          <Steps
            current={currentIdx}
            size="small"
            items={stepsItems}
          />
        </Card>

        {/* Active stage content */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: STAGE_CONFIG[activeStage].color, fontSize: 16 }}>{STAGE_CONFIG[activeStage].icon}</span>
            <Text strong style={{ fontSize: 15 }}>{STAGE_CONFIG[activeStage].label}</Text>
          </div>
          {activeStage === 'assembly' && <AssemblyPanel pipeline={pipeline} />}
          {activeStage === 'rbac'     && <RbacPanel     pipeline={pipeline} />}
          {activeStage === 'budget'   && <BudgetPanel   pipeline={pipeline} />}
          {activeStage === 'test'     && <TestPanel     pipeline={pipeline} />}
          {activeStage === 'publish'  && <PublishPanel  pipeline={pipeline} />}
          {activeStage === 'run'      && <RunPanel      pipeline={pipeline} />}
          {activeStage === 'monitor'  && <MonitorPanel  pipeline={pipeline} />}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentPipelinePage() {
  const { data: pipelines = [], isLoading } = useQuery({ queryKey: ['pipelines'], queryFn: pipelineApi.getPipelines })
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selected = pipelines.find(p => p.id === selectedId) ?? pipelines[0] ?? null

  const publishedCount = pipelines.filter(p => p.status === 'published' || p.status === 'running').length
  const totalRuns      = pipelines.reduce((s, p) => s + p.runCount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
      }}>
        <Space size={4}>
          <RobotOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ fontSize: 14 }}>Agent Pipeline</Text>
        </Space>
        <Divider type="vertical" />
        <Space size={6}><Badge color="#52c41a" /><Text style={{ fontSize: 13 }}>已发布 {publishedCount} 个</Text></Space>
        <Space size={6}><Badge color="#8c8c8c" /><Text style={{ fontSize: 13 }}>共 {pipelines.length} 个 Pipeline</Text></Space>
        <Space size={6}>
          <ThunderboltOutlined style={{ color: '#faad14', fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>累计执行 {totalRuns} 次</Text>
        </Space>
      </div>

      {/* Left + Right */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Left list */}
        <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid #f0f0f0', overflowY: 'auto', background: '#fff' }}>
          {isLoading
            ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            : pipelines.map(p => (
                <PipelineListItem
                  key={p.id}
                  pipeline={p}
                  selected={selected?.id === p.id}
                  onSelect={() => setSelectedId(p.id)}
                />
              ))
          }
        </div>

        {/* Right detail */}
        <div style={{ flex: 1, minWidth: 0, background: '#f5f5f5' }}>
          {selected
            ? <PipelineDetail pipeline={selected} />
            : <Empty description="选择左侧 Pipeline 查看详情" style={{ marginTop: 80 }} />
          }
        </div>
      </div>
    </div>
  )
}
