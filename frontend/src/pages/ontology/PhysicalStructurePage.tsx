import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Card, Tag, Typography, Space, Badge, Tree,
  Tooltip, Empty, Spin, Tabs, Descriptions,
  Button, Table, Progress,
} from 'antd'
import type { TreeProps } from 'antd'
import {
  CloudServerOutlined, ContainerOutlined,
  DatabaseOutlined, FolderOutlined, FolderOpenOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
  SyncOutlined, SearchOutlined, LinkOutlined,
  HddOutlined, ApiOutlined, InboxOutlined, CodeOutlined, GlobalOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { ContainerTreeNode, OntEntity } from '@/types/ontology'

const { Text, Paragraph } = Typography

// ── 颜色映射 ──────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  database: 'blue', stream: 'purple', file: 'orange',
  api: 'magenta', internal: 'cyan', external: 'default',
}
const CATEGORY_HEX: Record<string, string> = {
  blue: '#1677ff', purple: '#722ed1', orange: '#fa8c16',
  magenta: '#eb2f96', cyan: '#13c2c2', default: '#8c8c8c',
}

// ── 连接信息 mock ─────────────────────────────────────────────────────────────

interface ConnInfo {
  fields: { label: string; value: string; mono?: boolean }[]
}

const CONN_INFO: Record<string, ConnInfo> = {
  'ladder-db-prod-ld': { fields: [
    { label: 'Host',     value: 'ladder-db-ld.cluster.eu-west-2.rds.amazonaws.com', mono: true },
    { label: 'Port',     value: '5432', mono: true },
    { label: 'Database', value: 'platform', mono: true },
    { label: 'SSL Mode', value: 'require' },
    { label: 'Region',   value: 'eu-west-2' },
    { label: 'Engine',   value: 'TimescaleDB 2.11 / PostgreSQL 15' },
  ]},
  'ladder-db-prod-sg': { fields: [
    { label: 'Host',     value: 'ladder-db-sg.cluster.ap-southeast-1.rds.amazonaws.com', mono: true },
    { label: 'Port',     value: '5432', mono: true },
    { label: 'Database', value: 'platform', mono: true },
    { label: 'SSL Mode', value: 'require' },
    { label: 'Region',   value: 'ap-southeast-1' },
    { label: 'Engine',   value: 'TimescaleDB 2.11 / PostgreSQL 15' },
  ]},
  'mq-prod-ld': { fields: [
    { label: 'Instance Key', value: 'LD', mono: true },
    { label: 'Base Path',    value: '/poin/queues/LD', mono: true },
    { label: 'Queue Dir',    value: '/poin/queues/LD/{queue-name}/', mono: true },
    { label: 'Region',       value: 'eu-west-2' },
    { label: 'EC2 Host',     value: 'mq-ld.internal.evo.com', mono: true },
  ]},
  'mq-prod-sg': { fields: [
    { label: 'Instance Key', value: 'SG', mono: true },
    { label: 'Base Path',    value: '/poin/queues/SG', mono: true },
    { label: 'Queue Dir',    value: '/poin/queues/SG/{queue-name}/', mono: true },
    { label: 'Region',       value: 'ap-southeast-1' },
    { label: 'EC2 Host',     value: 'mq-sg.internal.evo.com', mono: true },
  ]},
  'evo-dataservice': { fields: [
    { label: 'Host',     value: 'dataservice.internal.evo.com', mono: true },
    { label: 'Port',     value: '50053', mono: true },
    { label: 'TLS',      value: 'enabled' },
    { label: 'Services', value: 'evo.config.ConfigService, evo.trade.TradeService, evo.strategy.StrategyService', mono: true },
    { label: 'Region',   value: 'eu-west-2' },
  ]},
  'evo-analytics': { fields: [
    { label: 'Host',     value: 'analytics.internal.evo.com', mono: true },
    { label: 'Port',     value: '50056', mono: true },
    { label: 'TLS',      value: 'enabled' },
    { label: 'Services', value: 'evo.analytics.ReportService', mono: true },
    { label: 'Region',   value: 'eu-west-2' },
  ]},
  'reuters-eikon-prod': { fields: [
    { label: 'Endpoint', value: 'https://api.refinitiv.com/data/historical-pricing/v1', mono: true },
    { label: 'Auth',     value: 'API Key (stored in AWS Secrets Manager)' },
    { label: 'Rate Limit', value: '600 req/min' },
  ]},
  'bloomberg-api-prod': { fields: [
    { label: 'Endpoint', value: 'https://api.bloomberg.com/eap/catalogs', mono: true },
    { label: 'Auth',     value: 'OAuth2 Client Credentials' },
    { label: 'Rate Limit', value: '300 req/min' },
  ]},
}

// ── Overview 统计 mock ────────────────────────────────────────────────────────

interface InstanceStats {
  datasets: number
  containers: number
  totalRows: string
  totalSize: string
  lastSync: string
  uptime: string
  version: string
  connections: { current: number; max: number }
}

const INSTANCE_STATS: Record<string, InstanceStats> = {
  'ladder-db-prod-ld': {
    datasets: 6, containers: 1, totalRows: '142.8M', totalSize: '38.4 GB',
    lastSync: '2 min ago', uptime: '99.98%', version: 'TimescaleDB 2.11 / PG 15.4',
    connections: { current: 12, max: 100 },
  },
  'ladder-db-prod-sg': {
    datasets: 4, containers: 1, totalRows: '98.2M', totalSize: '24.1 GB',
    lastSync: '3 min ago', uptime: '99.95%', version: 'TimescaleDB 2.11 / PG 15.4',
    connections: { current: 8, max: 100 },
  },
  'mq-prod-ld': {
    datasets: 5, containers: 5, totalRows: '—', totalSize: '12.6 GB',
    lastSync: 'realtime', uptime: '99.99%', version: 'Chronicle Queue 5.25',
    connections: { current: 4, max: 32 },
  },
  'mq-prod-sg': {
    datasets: 3, containers: 3, totalRows: '—', totalSize: '8.2 GB',
    lastSync: 'realtime', uptime: '99.97%', version: 'Chronicle Queue 5.25',
    connections: { current: 2, max: 32 },
  },
  'evo-dataservice': {
    datasets: 4, containers: 3, totalRows: '—', totalSize: '—',
    lastSync: 'realtime', uptime: '99.96%', version: 'gRPC 1.62 / Java 21',
    connections: { current: 28, max: 200 },
  },
  'evo-analytics': {
    datasets: 1, containers: 1, totalRows: '—', totalSize: '—',
    lastSync: 'on-demand', uptime: '99.80%', version: 'gRPC 1.62 / Java 21',
    connections: { current: 3, max: 50 },
  },
  'reuters-eikon-prod': {
    datasets: 2, containers: 0, totalRows: '—', totalSize: '—',
    lastSync: '1 min ago', uptime: '99.50%', version: 'Refinitiv API v1',
    connections: { current: 1, max: 5 },
  },
  'bloomberg-api-prod': {
    datasets: 1, containers: 0, totalRows: '—', totalSize: '—',
    lastSync: '5 min ago', uptime: '99.20%', version: 'Bloomberg EAP v2',
    connections: { current: 1, max: 3 },
  },
}

// ── 数据发现 mock ─────────────────────────────────────────────────────────────

interface DiscoveryItem {
  name: string
  type: 'new' | 'missing' | 'schema_change'
  detail: string
}

const DISCOVERY: Record<string, DiscoveryItem[]> = {
  'ladder-db-prod-ld': [
    { name: 'public.ladder_raw',         type: 'new',           detail: 'New table found, not registered in metadata (~2.1M rows)' },
    { name: 'public.spread_metrics',     type: 'schema_change', detail: 'New column window_type varchar(20) not in schema definition' },
    { name: 'public.lp_config',          type: 'missing',       detail: 'Table registered in metadata does not exist in database' },
    { name: 'public.account_snapshot',   type: 'new',           detail: 'New table found, not registered in metadata (~850K rows)' },
  ],
  'ladder-db-prod-sg': [
    { name: 'public.ladder_archive_sg',  type: 'new',           detail: 'New table found, not registered in metadata (~1.2M rows)' },
    { name: 'public.client_ladder',      type: 'schema_change', detail: 'Column markup_bps added, not in schema definition' },
  ],
  'mq-prod-ld': [
    { name: 'smart-order-router-output', type: 'new',           detail: 'New queue found, not registered in metadata' },
    { name: 'config-output-LD',          type: 'missing',       detail: 'Queue registered in metadata does not exist on instance' },
    { name: 'risk-manager-output',       type: 'new',           detail: 'New queue found, not registered in metadata' },
  ],
  'evo-dataservice': [
    { name: 'evo.trade.TradeService/StreamTrades', type: 'new', detail: 'New streaming RPC not registered as dataset' },
  ],
}

// ── Test 步骤 mock ────────────────────────────────────────────────────────────

interface TestStep {
  label: string
  detail: string
  durationMs: number
}

const TEST_STEPS: Record<string, TestStep[]> = {
  default: [
    { label: 'DNS resolution',       detail: 'Resolving hostname to IP address',          durationMs: 450 },
    { label: 'TCP handshake',        detail: 'Establishing TCP connection on port',        durationMs: 380 },
    { label: 'TLS negotiation',      detail: 'Verifying certificate and cipher suite',     durationMs: 520 },
    { label: 'Authentication',       detail: 'Validating credentials',                     durationMs: 290 },
    { label: 'Ping query',           detail: 'SELECT 1 — measuring round-trip latency',    durationMs: 180 },
  ],
  mq: [
    { label: 'SSH connection',       detail: 'Connecting to EC2 host via SSH',             durationMs: 600 },
    { label: 'Queue path check',     detail: 'Verifying base path exists on filesystem',   durationMs: 200 },
    { label: 'Read test',            detail: 'Reading last entry from queue',              durationMs: 350 },
    { label: 'Write test',           detail: 'Writing test entry and verifying',           durationMs: 280 },
  ],
  grpc: [
    { label: 'DNS resolution',       detail: 'Resolving service endpoint',                 durationMs: 320 },
    { label: 'TCP handshake',        detail: 'Establishing connection',                    durationMs: 290 },
    { label: 'TLS negotiation',      detail: 'mTLS certificate exchange',                  durationMs: 480 },
    { label: 'gRPC health check',    detail: 'grpc.health.v1.Health/Check',                durationMs: 150 },
    { label: 'Unary RPC test',       detail: 'Sending test request and verifying response', durationMs: 220 },
  ],
  api: [
    { label: 'DNS resolution',       detail: 'Resolving API endpoint hostname',            durationMs: 280 },
    { label: 'HTTPS connection',     detail: 'TLS 1.3 handshake',                          durationMs: 420 },
    { label: 'Auth token request',   detail: 'Obtaining access token',                     durationMs: 680 },
    { label: 'API health check',     detail: 'GET /health — verifying 200 OK',             durationMs: 310 },
  ],
}

const DISCOVERY_COLOR = { new: 'blue', missing: 'red', schema_change: 'orange' } as const
const DISCOVERY_LABEL = { new: 'New', missing: 'Missing', schema_change: 'Schema Changed' }

// ── Container+Dataset 树 ──────────────────────────────────────────────────────

function toTreeData(nodes: ContainerTreeNode[], navigate: (p: string) => void): TreeProps['treeData'] {
  return nodes.map(node => {
    const isContainer = node.typeName === 'Container'
    const isDataset   = node.typeName === 'Dataset'
    return {
      key: String(node.id),
      title: (
        <Space size={4} style={{ userSelect: 'none' }}>
          <Text
            style={{ fontSize: 13, cursor: isContainer || isDataset ? 'pointer' : 'default', color: isDataset ? '#1677ff' : undefined }}
            onClick={() => {
              if (isContainer) navigate(`/datasets?container=${node.name}`)
              if (isDataset)   navigate(`/datasets/${node.id}`)
            }}
          >
            {node.displayName ?? node.name}
          </Text>
          {(node.datasetCount ?? 0) > 0 && isContainer && (
            <Tooltip title={`${node.datasetCount} datasets`}>
              <Badge count={node.datasetCount} color="geekblue" style={{ fontSize: 10 }} />
            </Tooltip>
          )}
          {node.description && (
            <Tooltip title={node.description}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                — {node.description.length > 28 ? node.description.slice(0, 28) + '…' : node.description}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
      icon: isDataset
        ? <DatabaseOutlined style={{ color: '#1677ff' }} />
        : (node.children?.length ?? 0) > 0
          ? ({ expanded }: { expanded: boolean }) =>
              expanded ? <FolderOpenOutlined style={{ color: '#08979c' }} /> : <FolderOutlined style={{ color: '#08979c' }} />
          : <ContainerOutlined style={{ color: '#08979c' }} />,
      children: node.children?.length ? toTreeData(node.children as ContainerTreeNode[], navigate) : undefined,
    }
  })
}

// ── Test tab ──────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'running' | 'ok' | 'fail'

function TestTab({ instance }: { instance: OntEntity }) {
  const [status,  setStatus]  = useState<TestStatus>('idle')
  const [results, setResults] = useState<{ label: string; detail: string; ms: number; ok: boolean }[]>([])

  const platform = instance.platform
  const stepsKey = platform === 'mq' ? 'mq' : platform === 'grpc' ? 'grpc' : (platform === 'reuters' || platform === 'bloomberg') ? 'api' : 'default'
  const steps = TEST_STEPS[stepsKey]

  async function runTest() {
    setStatus('running'); setResults([])
    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.durationMs * (0.8 + Math.random() * 0.4)))
      const ms = Math.floor(step.durationMs * (0.6 + Math.random() * 0.5))
      setResults(prev => [...prev, { label: step.label, detail: step.detail, ms, ok: true }])
    }
    setStatus('ok')
  }

  const totalMs = results.reduce((s, r) => s + r.ms, 0)

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button type="primary" icon={<LinkOutlined />} loading={status === 'running'} onClick={runTest}>
          Test Connection
        </Button>
        {status === 'ok' && (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
            <Text style={{ color: '#52c41a', fontWeight: 600 }}>All checks passed</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>total {totalMs}ms</Text>
          </Space>
        )}
        {status === 'fail' && (
          <Space>
            <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 16 }} />
            <Text style={{ color: '#f5222d', fontWeight: 600 }}>Connection failed</Text>
          </Space>
        )}
      </div>

      {results.length > 0 && (
        <div style={{
          background: '#1e293b', borderRadius: 8, padding: '14px 18px',
          fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
          fontSize: 12, lineHeight: 2,
        }}>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12, flexShrink: 0 }} />
              <span style={{ color: '#e2e8f0', minWidth: 160 }}>{r.label}</span>
              <span style={{ color: '#64748b', flex: 1 }}>{r.detail}</span>
              <span style={{ color: '#94a3b8', minWidth: 50, textAlign: 'right' }}>{r.ms}ms</span>
            </div>
          ))}
          {status === 'running' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1677ff' }}>
              <LoadingOutlined spin style={{ fontSize: 12 }} />
              <span>Running...</span>
            </div>
          )}
          {status === 'ok' && (
            <div style={{ borderTop: '1px solid #334155', marginTop: 8, paddingTop: 8, color: '#52c41a' }}>
              ✓ Connection healthy — {totalMs}ms total
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Discovery tab ─────────────────────────────────────────────────────────────

function DiscoveryTab({ instance }: { instance: OntEntity }) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanMsg,  setScanMsg]  = useState('')
  const [items,    setItems]    = useState<DiscoveryItem[] | null>(null)

  const scanMessages = [
    'Connecting to data source...',
    'Listing containers and schemas...',
    'Comparing with registered metadata...',
    'Checking schema definitions...',
    'Generating report...',
  ]

  async function runScan() {
    setScanning(true); setProgress(0); setItems(null)
    for (let i = 0; i < scanMessages.length; i++) {
      setScanMsg(scanMessages[i])
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
      setProgress(Math.round((i + 1) / scanMessages.length * 100))
    }
    setItems(DISCOVERY[instance.name] ?? [])
    setScanning(false)
  }

  const columns = [
    {
      title: 'Name', dataIndex: 'name', key: 'name', width: 260,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Status', dataIndex: 'type', key: 'type', width: 140,
      render: (v: DiscoveryItem['type']) => <Tag color={DISCOVERY_COLOR[v]} style={{ fontSize: 11 }}>{DISCOVERY_LABEL[v]}</Tag>,
    },
    {
      title: 'Detail', dataIndex: 'detail', key: 'detail',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
  ]

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button type="primary" icon={<SearchOutlined />} loading={scanning} onClick={runScan}>
          Scan Data Source
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Compare registered metadata against actual data source structure
        </Text>
      </div>

      {scanning && (
        <div style={{ marginBottom: 20, maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <SyncOutlined spin style={{ color: '#1677ff' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>{scanMsg}</Text>
          </div>
          <Progress percent={progress} size="small" strokeColor="#1677ff" />
        </div>
      )}

      {items !== null && (
        items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 36, color: '#52c41a', display: 'block', marginBottom: 10 }} />
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>Metadata in sync</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>No discrepancies found between metadata and actual data source</Text>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Found {items.length} discrepancies:</Text>
              {(['new', 'missing', 'schema_change'] as const).map(t => {
                const count = items.filter(i => i.type === t).length
                return count > 0 ? (
                  <Tag key={t} color={DISCOVERY_COLOR[t]} style={{ fontSize: 11 }}>
                    {count} {DISCOVERY_LABEL[t]}
                  </Tag>
                ) : null
              })}
            </div>
            <Table
              columns={columns}
              dataSource={items.map((item, i) => ({ ...item, key: i }))}
              size="small"
              pagination={false}
              style={{ background: '#fff', borderRadius: 8 }}
            />
          </>
        )
      )}
    </div>
  )
}
// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function DataSourcePage() {
  const navigate = useNavigate()
  const [selectedId,  setSelectedId]  = useState<number | null>(null)
  const [typeFilter,  setTypeFilter]  = useState<string>('all')
  const [search,      setSearch]      = useState('')

  const { data: instances,   isLoading: iLoading } = useQuery({ queryKey: ['instances'],   queryFn: () => ontologyApi.getInstances() })
  const { data: instanceTree                      } = useQuery({ queryKey: ['instanceTree'], queryFn: () => ontologyApi.getInstanceTree() })
  const { data: classifierValues                  } = useQuery({ queryKey: ['classifierValues', 'platform'], queryFn: () => ontologyApi.getClassifierValues('platform') })

  const dimMap = new Map((classifierValues ?? []).map(d => [d.name, d]))

  const effectiveId      = selectedId ?? instances?.[0]?.id ?? null
  const selectedInstance = (instances ?? []).find(i => i.id === effectiveId)
  const selectedTree     = (instanceTree ?? []).find(n => n.id === effectiveId)

  const categoryOrder = ['database', 'stream', 'file', 'internal', 'api', 'external', 'other']
  const categoryLabel: Record<string, string> = {
    database: 'DB', stream: 'MQ', file: 'File',
    internal: 'gRPC', api: 'API', external: 'Other', other: 'Other',
  }
  const categoryIcon: Record<string, React.ReactNode> = {
    database: <HddOutlined />, stream: <InboxOutlined />, file: <FolderOutlined />,
    internal: <CodeOutlined />, api: <GlobalOutlined />, external: <ApiOutlined />, other: <CloudServerOutlined />,
  }

  // 所有出现的 category
  const activeCats = categoryOrder.filter(cat =>
    (instances ?? []).some(i => (dimMap.get(i.platform)?.category ?? 'other') === cat)
  )

  // 过滤后的 instance 列表
  const filteredInstances = (instances ?? []).filter(inst => {
    const cat = dimMap.get(inst.platform)?.category ?? 'other'
    if (typeFilter !== 'all' && cat !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (inst.displayName ?? inst.name).toLowerCase().includes(q) ||
             inst.name.toLowerCase().includes(q) ||
             inst.platform.toLowerCase().includes(q)
    }
    return true
  })

  const connInfo = selectedInstance ? CONN_INFO[selectedInstance.name] : null
  const stats    = selectedInstance ? INSTANCE_STATS[selectedInstance.name] ?? null : null
  const catColor = selectedInstance
    ? CATEGORY_COLOR[dimMap.get(selectedInstance.platform)?.category ?? ''] ?? 'default'
    : 'default'
  const iconColor = CATEGORY_HEX[catColor] ?? '#13c2c2'

  const tabItems = selectedInstance ? [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: `${iconColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CloudServerOutlined style={{ fontSize: 20, color: iconColor }} />
            </div>
            <div>
              <Space wrap>
                <Text strong style={{ fontSize: 15 }}>{selectedInstance.displayName ?? selectedInstance.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>({selectedInstance.name})</Text>
                <Tag color={catColor} style={{ fontSize: 11 }}>
                  {dimMap.get(selectedInstance.platform)?.displayName ?? selectedInstance.platform}
                </Tag>
                <Tag color={selectedInstance.env === 'prod' ? 'green' : 'orange'} style={{ fontSize: 11 }}>
                  {selectedInstance.env}
                </Tag>
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11 }}>Online</Tag>
              </Space>
              {selectedInstance.description && (
                <Paragraph type="secondary" style={{ fontSize: 13, margin: '6px 0 0' }}>
                  {selectedInstance.description}
                </Paragraph>
              )}
            </div>
          </div>

          {connInfo ? (
            <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Connection Info</Text>} style={{ marginBottom: 16 }}>
              <Descriptions size="small" column={2}>
                {connInfo.fields.map(f => (
                  <Descriptions.Item key={f.label} label={f.label}>
                    {f.mono ? <Text code style={{ fontSize: 11 }}>{f.value}</Text> : <Text style={{ fontSize: 12 }}>{f.value}</Text>}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          ) : (
            <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Connection Info</Text>} style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>No connection info registered</Text>
            </Card>
          )}

          {stats && (
            <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Stats</Text>}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Datasets',   value: stats.datasets,   color: '#1677ff' },
                  { label: 'Containers', value: stats.containers, color: '#08979c' },
                  { label: 'Total Rows', value: stats.totalRows,  color: '#52c41a' },
                  { label: 'Total Size', value: stats.totalSize,  color: '#fa8c16' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 12 }}>
                <Descriptions size="small" column={3}>
                  <Descriptions.Item label="Uptime"><Text style={{ color: '#52c41a', fontSize: 12 }}>{stats.uptime}</Text></Descriptions.Item>
                  <Descriptions.Item label="Last Sync"><Text style={{ fontSize: 12 }}>{stats.lastSync}</Text></Descriptions.Item>
                  <Descriptions.Item label="Version"><Text style={{ fontSize: 12 }}>{stats.version}</Text></Descriptions.Item>
                  <Descriptions.Item label="Connections">
                    <Space size={4}>
                      <Text style={{ fontSize: 12 }}>{stats.connections.current} / {stats.connections.max}</Text>
                      <Progress
                        percent={Math.round(stats.connections.current / stats.connections.max * 100)}
                        size="small" showInfo={false} style={{ width: 60, margin: 0 }}
                        strokeColor={stats.connections.current / stats.connections.max > 0.8 ? '#f5222d' : '#1677ff'}
                      />
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    { key: 'test',      label: 'Test',      children: <TestTab instance={selectedInstance} /> },
    {
      key: 'structure',
      label: (
        <span>
          Structure
          {(selectedTree?.children?.length ?? 0) > 0 && (
            <Badge count={selectedTree!.children!.length} color="geekblue" style={{ fontSize: 10, marginLeft: 6 }} />
          )}
        </span>
      ),
      children: (
        <div style={{ padding: '4px 0' }}>
          {selectedTree?.children?.length
            ? <Tree showIcon defaultExpandAll treeData={toTreeData(selectedTree.children as ContainerTreeNode[], navigate)} style={{ fontSize: 13 }} />
            : <Empty description="No containers registered" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          }
        </div>
      ),
    },
    { key: 'discovery', label: 'Discovery', children: <DiscoveryTab instance={selectedInstance} /> },
  ] : []

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>

      {/* 左侧面板 */}
      <div style={{
        width: 240, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 标题 */}
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Text strong style={{ fontSize: 13 }}>Data Sources</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{instances?.length ?? 0}</Text>
          </div>

          {/* 搜索框 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 8px',
            background: '#fafafa',
          }}>
            <SearchOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search instances..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, flex: 1 }}
            />
            {search && (
              <span style={{ cursor: 'pointer', color: '#bfbfbf', fontSize: 11 }} onClick={() => setSearch('')}>✕</span>
            )}
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            <div
              onClick={() => setTypeFilter('all')}
              style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, cursor: 'pointer',
                background: typeFilter === 'all' ? '#1677ff' : '#f0f0f0',
                color: typeFilter === 'all' ? '#fff' : '#595959',
                userSelect: 'none', transition: 'all 0.15s',
              }}
            >
              All
            </div>
            {activeCats.map(cat => (
              <div
                key={cat}
                onClick={() => setTypeFilter(typeFilter === cat ? 'all' : cat)}
                style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, cursor: 'pointer',
                  background: typeFilter === cat ? CATEGORY_HEX[CATEGORY_COLOR[cat] ?? 'default'] : '#f0f0f0',
                  color: typeFilter === cat ? '#fff' : '#595959',
                  userSelect: 'none', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <span style={{ fontSize: 10 }}>{categoryIcon[cat]}</span>
                {categoryLabel[cat]}
              </div>
            ))}
          </div>
        </div>

        {/* Instance 列表 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {iLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}

          {!iLoading && filteredInstances.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>No instances found</Text>
            </div>
          )}

          {!iLoading && filteredInstances.map(inst => {
            const dim        = dimMap.get(inst.platform)
            const cat        = dim?.category ?? 'other'
            const color      = CATEGORY_COLOR[cat] ?? 'default'
            const hex        = CATEGORY_HEX[color] ?? '#8c8c8c'
            const isSelected = inst.id === effectiveId
            return (
              <div
                key={inst.id}
                onClick={() => setSelectedId(inst.id)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  background: isSelected ? '#e6f4ff' : undefined,
                  borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: `${hex}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CloudServerOutlined style={{ color: hex, fontSize: 13 }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text strong style={{ fontSize: 13, color: isSelected ? '#1677ff' : undefined, display: 'block' }}>
                      {inst.displayName ?? inst.name}
                    </Text>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      <Tag color={color} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                        {dim?.displayName ?? inst.platform}
                      </Tag>
                      <Tag color={inst.env === 'prod' ? 'green' : 'orange'} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                        {inst.env}
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 右侧：详情 tabs */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {!selectedInstance ? (
          <Empty description="Select a data source" style={{ marginTop: 80 }}
            image={<CloudServerOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          />
        ) : (
          <div style={{ padding: '16px 24px' }}>
            <Tabs items={tabItems} defaultActiveKey="overview" />
          </div>
        )}
      </div>
    </div>
  )
}
