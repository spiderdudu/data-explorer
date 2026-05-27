import { useState, useEffect, useRef } from 'react'
import { Typography, Empty, Button, Card, Tag, Tooltip, Row, Col, Modal, Input, Divider } from 'antd'
import {
  BarChartOutlined, DeleteOutlined, PlusOutlined,
  TableOutlined, LineChartOutlined, SaveOutlined,
  ArrowLeftOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts'

const { Text } = Typography

// ── 类型 ──────────────────────────────────────────────────────────────────────

export interface DashboardChart {
  id: string
  title: string
  sql: string
  chartType: 'bar' | 'line' | 'table'
  columns: string[]
  rows: (string | number)[][]
  savedAt: string
  source: 'chat' | 'query'
}

export interface SavedDashboard {
  id: string
  name: string
  createdAt: string
  charts: DashboardChart[]
}

export const DRAFT_KEY      = 'evo_dashboard_charts'
export const DASHBOARDS_KEY = 'evo_saved_dashboards'

export function saveToDashboard(chart: Omit<DashboardChart, 'id' | 'savedAt'>) {
  const existing: DashboardChart[] = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '[]')
  const newChart: DashboardChart = {
    ...chart,
    id: `chart_${Date.now()}`,
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify([newChart, ...existing]))
}

// ── ChartCard ─────────────────────────────────────────────────────────────────

function ChartCard({ chart, onDelete }: { chart: DashboardChart; onDelete?: () => void }) {
  const data = chart.rows.map(row => {
    const obj: Record<string, string | number> = {}
    chart.columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })

  const xKey = chart.columns[0]
  const valueKeys = chart.columns.slice(1)
  const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96']

  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <Card
      size="small"
      title={<Text strong style={{ fontSize: 13 }}>{chart.title}</Text>}
      extra={onDelete && (
        <Tooltip title="删除">
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
        </Tooltip>
      )}
      style={{ height: '100%' }}
    >
      <div style={{ marginBottom: 8, display: 'flex', gap: 6 }}>
        <Tag color={chart.source === 'chat' ? 'purple' : 'blue'} style={{ fontSize: 10, margin: 0 }}>
          {chart.source === 'chat' ? 'Chat BI' : '查询构建器'}
        </Tag>
        <Tag
          icon={chart.chartType === 'table' ? <TableOutlined /> : chart.chartType === 'bar' ? <BarChartOutlined /> : <LineChartOutlined />}
          style={{ fontSize: 10, margin: 0 }}
        >
          {chart.chartType === 'table' ? '表格' : chart.chartType === 'bar' ? '柱状图' : '折线图'}
        </Tag>
        <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>
          {new Date(chart.savedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </div>

      {chart.chartType === 'table' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {chart.columns.map(col => (
                  <th key={col} style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #f0f0f0', color: '#8c8c8c', fontWeight: 500 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.slice(0, 6).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '4px 8px' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} style={{ width: '100%' }}>
          {width > 0 && (chart.chartType === 'bar' ? (
            <BarChart width={width} height={180} data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <RTooltip contentStyle={{ fontSize: 11 }} />
              {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {valueKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart width={width} height={180} data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <RTooltip contentStyle={{ fontSize: 11 }} />
              {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {valueKeys.map((k, i) => (
                <Line key={k} dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── 固定 Dashboard 详情视图 ───────────────────────────────────────────────────

function SavedDashboardView({ dashboard, onBack, onDelete }: {
  dashboard: SavedDashboard
  onBack: () => void
  onDelete: () => void
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{
        padding: '10px 20px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={onBack} />
        <BarChartOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        <Text strong style={{ fontSize: 14 }}>{dashboard.name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{dashboard.charts.length} 个图表</Text>
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
          创建于 {new Date(dashboard.createdAt).toLocaleDateString('zh-CN')}
        </Text>
        <Button size="small" danger style={{ marginLeft: 'auto' }} onClick={onDelete}>删除 Dashboard</Button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <Row gutter={[16, 16]}>
          {dashboard.charts.map(chart => (
            <Col key={chart.id} xs={24} md={12} xl={8}>
              <ChartCard chart={chart} />
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}

// ── 样例 Dashboard 数据 ───────────────────────────────────────────────────────

const SAMPLE_DASHBOARDS: SavedDashboard[] = [
  {
    id: 'db_sample_1',
    name: '每日点差监控',
    createdAt: '2026-05-20T09:00:00Z',
    charts: [
      {
        id: 'c_s1_1', title: '各品种平均点差', source: 'query', chartType: 'bar',
        sql: 'SELECT symbol, AVG(spread) AS avg_spread FROM execution_ladder GROUP BY symbol',
        savedAt: '2026-05-20T09:00:00Z',
        columns: ['symbol', 'avg_spread'],
        rows: [['EURUSD', 0.00089], ['GBPUSD', 0.00156], ['USDJPY', 0.00198], ['GBPJPY', 0.00312], ['EURJPY', 0.00285], ['AUDUSD', 0.00134], ['USDCHF', 0.00105], ['NZDUSD', 0.00181]],
      },
      {
        id: 'c_s1_2', title: '各品种最大/最小点差对比', source: 'query', chartType: 'bar',
        sql: 'SELECT symbol, MIN(spread) AS min_spread, MAX(spread) AS max_spread FROM execution_ladder GROUP BY symbol',
        savedAt: '2026-05-20T09:05:00Z',
        columns: ['symbol', 'min_spread', 'max_spread'],
        rows: [['EURUSD', 0.00050, 0.00160], ['GBPUSD', 0.00090, 0.00280], ['USDJPY', 0.00120, 0.00340], ['GBPJPY', 0.00180, 0.00520], ['EURJPY', 0.00160, 0.00480], ['AUDUSD', 0.00080, 0.00240]],
      },
      {
        id: 'c_s1_3', title: '点差异常品种（过去24h）', source: 'chat', chartType: 'table',
        sql: 'SELECT symbol, AVG(spread) AS avg_spread, MAX(spread) AS max_spread FROM execution_ladder WHERE created_at >= NOW() - INTERVAL \'24 hours\' GROUP BY symbol ORDER BY avg_spread DESC LIMIT 10',
        savedAt: '2026-05-20T09:10:00Z',
        columns: ['symbol', 'avg_spread', 'max_spread', '状态'],
        rows: [['GBPJPY', 0.00312, 0.00520, '⚠️ 偏高'], ['EURJPY', 0.00285, 0.00480, '⚠️ 偏高'], ['USDJPY', 0.00198, 0.00340, '正常'], ['GBPUSD', 0.00156, 0.00280, '正常'], ['EURUSD', 0.00089, 0.00160, '✅ 优']],
      },
    ],
  },
  {
    id: 'db_sample_2',
    name: 'LP 质量报告',
    createdAt: '2026-05-21T10:00:00Z',
    charts: [
      {
        id: 'c_s2_1', title: '各 LP 平均点差', source: 'query', chartType: 'bar',
        sql: 'SELECT lp_id, AVG(ask - bid) AS avg_spread FROM lp_raw_quote GROUP BY lp_id ORDER BY avg_spread',
        savedAt: '2026-05-21T10:00:00Z',
        columns: ['lp_id', 'avg_spread'],
        rows: [['LP_CITI', 0.00042], ['LP_BARC', 0.00051], ['LP_DEUT', 0.00063], ['LP_HSBC', 0.00078], ['LP_MUFG', 0.00094]],
      },
      {
        id: 'c_s2_2', title: '各 LP 报价量对比', source: 'query', chartType: 'bar',
        sql: 'SELECT lp_id, SUM(volume) AS total_volume, COUNT(*) AS quote_count FROM lp_raw_quote GROUP BY lp_id',
        savedAt: '2026-05-21T10:05:00Z',
        columns: ['lp_id', 'total_volume', 'quote_count'],
        rows: [['LP_CITI', 20000000, 4], ['LP_BARC', 16000000, 4], ['LP_DEUT', 11500000, 4], ['LP_HSBC', 13300000, 4], ['LP_MUFG', 16200000, 4]],
      },
      {
        id: 'c_s2_3', title: 'LP 质量综合评分', source: 'chat', chartType: 'table',
        sql: '',
        savedAt: '2026-05-21T10:10:00Z',
        columns: ['LP', '平均点差', '报价频率', '覆盖品种', '综合评分'],
        rows: [['LP_CITI', '0.00042', '高', '4', '⭐⭐⭐⭐⭐'], ['LP_BARC', '0.00051', '高', '4', '⭐⭐⭐⭐'], ['LP_DEUT', '0.00063', '中', '4', '⭐⭐⭐'], ['LP_HSBC', '0.00078', '中', '4', '⭐⭐⭐'], ['LP_MUFG', '0.00094', '低', '4', '⭐⭐']],
      },
    ],
  },
  {
    id: 'db_sample_3',
    name: '账户持仓风险',
    createdAt: '2026-05-22T08:30:00Z',
    charts: [
      {
        id: 'c_s3_1', title: '各账户浮动盈亏', source: 'query', chartType: 'bar',
        sql: 'SELECT account_id, SUM(unrealized_pnl) AS total_pnl FROM account_position GROUP BY account_id ORDER BY total_pnl',
        savedAt: '2026-05-22T08:30:00Z',
        columns: ['account_id', 'total_pnl'],
        rows: [['ACC_0017', -2210], ['ACC_0042', -3730.5], ['ACC_0089', -580], ['ACC_0008', 658], ['ACC_0031', 1850], ['ACC_0055', 3205], ['ACC_0061', 1194], ['ACC_0073', 3860]],
      },
      {
        id: 'c_s3_2', title: '各品种持仓量分布', source: 'query', chartType: 'bar',
        sql: 'SELECT symbol, SUM(ABS(volume)) AS total_volume FROM account_position GROUP BY symbol ORDER BY total_volume DESC',
        savedAt: '2026-05-22T08:35:00Z',
        columns: ['symbol', 'total_volume'],
        rows: [['EURUSD', 8.0], ['GBPJPY', 7.0], ['USDJPY', 6.5], ['AUDUSD', 7.0], ['GBPUSD', 4.5], ['EURJPY', 3.0], ['NZDUSD', 4.0], ['USDCHF', 2.0]],
      },
      {
        id: 'c_s3_3', title: '高风险持仓预警', source: 'chat', chartType: 'table',
        sql: '',
        savedAt: '2026-05-22T08:40:00Z',
        columns: ['账户', '品种', '方向', '浮亏(USD)', '风险等级'],
        rows: [['ACC_0042', 'GBPUSD', '空', -3842.50, '🔴 高'], ['ACC_0017', 'USDJPY', '多', -2910.00, '🔴 高'], ['ACC_0089', 'EURUSD', '空', -1540.00, '🟡 中']],
      },
    ],
  },
]

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [draftCharts, setDraftCharts]       = useState<DashboardChart[]>([])
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([])
  const [viewingId, setViewingId]           = useState<string | null>(null)
  const [createModal, setCreateModal]       = useState(false)
  const [dashboardName, setDashboardName]   = useState('')

  useEffect(() => {
    setDraftCharts(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '[]'))
    const stored = localStorage.getItem(DASHBOARDS_KEY)
    if (stored) {
      setSavedDashboards(JSON.parse(stored))
    } else {
      // 首次加载注入样例数据
      setSavedDashboards(SAMPLE_DASHBOARDS)
      localStorage.setItem(DASHBOARDS_KEY, JSON.stringify(SAMPLE_DASHBOARDS))
    }
  }, [])

  function handleDeleteDraft(id: string) {
    const next = draftCharts.filter(c => c.id !== id)
    setDraftCharts(next)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
  }

  function handleClearDraft() {
    setDraftCharts([])
    localStorage.removeItem(DRAFT_KEY)
  }

  function handleCreateDashboard() {
    if (!dashboardName.trim() || draftCharts.length === 0) return
    const newDb: SavedDashboard = {
      id: `db_${Date.now()}`,
      name: dashboardName.trim(),
      createdAt: new Date().toISOString(),
      charts: draftCharts,
    }
    const next = [newDb, ...savedDashboards]
    setSavedDashboards(next)
    localStorage.setItem(DASHBOARDS_KEY, JSON.stringify(next))
    // 清空草稿
    setDraftCharts([])
    localStorage.removeItem(DRAFT_KEY)
    setCreateModal(false)
    setDashboardName('')
  }

  function handleDeleteDashboard(id: string) {
    const next = savedDashboards.filter(d => d.id !== id)
    setSavedDashboards(next)
    localStorage.setItem(DASHBOARDS_KEY, JSON.stringify(next))
    if (viewingId === id) setViewingId(null)
  }

  // 查看某个固定 dashboard
  const viewingDashboard = savedDashboards.find(d => d.id === viewingId)
  if (viewingDashboard) {
    return (
      <SavedDashboardView
        dashboard={viewingDashboard}
        onBack={() => setViewingId(null)}
        onDelete={() => handleDeleteDashboard(viewingDashboard.id)}
      />
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>

      {/* 顶栏 */}
      <div style={{
        padding: '10px 20px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <BarChartOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        <Text strong style={{ fontSize: 14 }}>看板</Text>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── 草稿区 ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text strong style={{ fontSize: 13 }}>草稿区</Text>
            {draftCharts.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>{draftCharts.length} 个图表</Text>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {draftCharts.length > 0 && (
                <>
                  <Button
                    size="small" icon={<SaveOutlined />} type="primary"
                    onClick={() => { setDashboardName(''); setCreateModal(true) }}
                  >
                    创建 Dashboard
                  </Button>
                  <Button size="small" danger onClick={handleClearDraft}>清空</Button>
                </>
              )}
            </div>
          </div>

          {draftCharts.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 8, border: '1px dashed #d9d9d9',
              padding: '32px 0', textAlign: 'center',
            }}>
              <Text type="secondary" style={{ fontSize: 13 }}>暂无图表</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>在查询构建器或 Chat BI 中保存图表到看板</Text>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {draftCharts.map(chart => (
                <Col key={chart.id} xs={24} md={12} xl={8}>
                  <ChartCard chart={chart} onDelete={() => handleDeleteDraft(chart.id)} />
                </Col>
              ))}
            </Row>
          )}
        </div>

        {/* ── 固定 Dashboard 列表 ── */}
        <div>
          <Divider style={{ margin: '0 0 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AppstoreOutlined style={{ color: '#8c8c8c' }} />
            <Text strong style={{ fontSize: 13 }}>我的 Dashboard</Text>
            {savedDashboards.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>{savedDashboards.length} 个</Text>
            )}
          </div>

          {savedDashboards.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 8, border: '1px dashed #d9d9d9',
              padding: '32px 0', textAlign: 'center',
            }}>
              <Text type="secondary" style={{ fontSize: 13 }}>暂无固定 Dashboard</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>在草稿区积累图表后，点「创建 Dashboard」固化</Text>
            </div>
          ) : (
            <Row gutter={[12, 12]}>
              {savedDashboards.map(db => (
                <Col key={db.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => setViewingId(db.id)}
                    style={{ cursor: 'pointer' }}
                    extra={
                      <Tooltip title="删除">
                        <Button
                          type="text" size="small" danger icon={<DeleteOutlined />}
                          onClick={e => { e.stopPropagation(); handleDeleteDashboard(db.id) }}
                        />
                      </Tooltip>
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, background: '#e6f4ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <BarChartOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{db.name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {db.charts.length} 个图表 · {new Date(db.createdAt).toLocaleDateString('zh-CN')}
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>

      {/* 创建 Dashboard 弹窗 */}
      <Modal
        title="创建 Dashboard"
        open={createModal}
        onOk={handleCreateDashboard}
        onCancel={() => setCreateModal(false)}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ disabled: !dashboardName.trim() }}
      >
        <div style={{ padding: '8px 0' }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            将草稿区的 {draftCharts.length} 个图表固化为一个命名 Dashboard，草稿区将同时清空。
          </Text>
          <Input
            placeholder="Dashboard 名称，如：每日点差监控"
            value={dashboardName}
            onChange={e => setDashboardName(e.target.value)}
            onPressEnter={handleCreateDashboard}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  )
}
