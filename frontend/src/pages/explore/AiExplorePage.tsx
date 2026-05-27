import { useState, useRef, useEffect } from 'react'
import { Button, Card, Tag, Typography, Empty, Divider, Tabs, List, Popconfirm } from 'antd'
import {
  RobotOutlined, PlayCircleOutlined, SaveOutlined,
  CheckCircleOutlined, LoadingOutlined, WarningOutlined,
  DatabaseOutlined, ApiOutlined, FileTextOutlined, DeleteOutlined,
} from '@ant-design/icons'

const { Text, Paragraph } = Typography


// ── 类型 ──────────────────────────────────────────────────────────────────────

type ObjectType = 'dataset' | 'strategy' | 'lp'
type ScenarioKey = 'data_quality' | 'lineage_impact' | 'strategy_volume' | 'strategy_pnl'

interface AnalysisObject {
  id: string
  name: string
  displayName: string
  type: ObjectType
}

interface Scenario {
  key: ScenarioKey
  label: string
  description: string
  applicableTo: ObjectType[]
}

interface StepItem {
  id: string
  text: string
  status: 'pending' | 'running' | 'done' | 'warn'
}

interface Finding {
  level: 'info' | 'warn' | 'error'
  title: string
  detail: string
}

interface AnalysisResult {
  steps: StepItem[]
  findings: Finding[]
  conclusion: string
}

// ── 静态配置 ──────────────────────────────────────────────────────────────────

const OBJECTS: AnalysisObject[] = [
  { id: 'raw_ladder',        name: 'raw_ladder',        displayName: 'Raw Ladder',        type: 'dataset'  },
  { id: 'execution_ladder',  name: 'execution_ladder',  displayName: 'Execution Ladder',  type: 'dataset'  },
  { id: 'account_position',  name: 'account_position',  displayName: 'Account Position',  type: 'dataset'  },
  { id: 'execution_report',  name: 'execution_report',  displayName: 'Execution Report',  type: 'dataset'  },
  { id: 'ladder_archive',    name: 'ladder_archive',    displayName: 'Ladder Archive',    type: 'dataset'  },
  { id: 'trend_following',   name: 'TrendFollowing',    displayName: 'Trend Following',   type: 'strategy' },
  { id: 'mean_reversion',    name: 'MeanReversion',     displayName: 'Mean Reversion',    type: 'strategy' },
  { id: 'lp_citi',           name: 'LP_CITI',           displayName: 'LP_CITI',           type: 'lp'       },
  { id: 'lp_mufg',           name: 'LP_MUFG',           displayName: 'LP_MUFG',           type: 'lp'       },
]

const SCENARIOS: Scenario[] = [
  { key: 'data_quality',    label: '数据质量检查',    description: '检查新鲜度、记录数异常、字段缺失',          applicableTo: ['dataset'] },
  { key: 'lineage_impact',  label: '血缘影响面分析',  description: '分析该对象出问题时影响哪些下游策略/数据集', applicableTo: ['dataset', 'lp'] },
  { key: 'strategy_volume', label: '成交量异常归因',  description: '追溯成交量异常到数据层根因',               applicableTo: ['strategy'] },
  { key: 'strategy_pnl',   label: '盈亏波动追溯',    description: '分析盈亏波动是否来自数据质量问题',          applicableTo: ['strategy'] },
]

// ── Mock 分析结果 ─────────────────────────────────────────────────────────────

const MOCK_RESULTS: Record<string, AnalysisResult> = {
  'raw_ladder|data_quality': {
    steps: [
      { id: '1', text: '检查数据新鲜度（最近更新时间）...', status: 'done' },
      { id: '2', text: '统计过去 24h 记录数，与历史均值对比...', status: 'done' },
      { id: '3', text: '扫描字段缺失率（bid / ask / symbol）...', status: 'done' },
      { id: '4', text: '检测异常值（点差 > 3σ）...', status: 'warn' },
      { id: '5', text: '生成质量报告...', status: 'done' },
    ],
    findings: [
      { level: 'info',  title: '数据新鲜度正常', detail: '最近更新：2 分钟前，频率符合 realtime 预期' },
      { level: 'info',  title: '记录数正常', detail: '过去 24h 共 1,842,300 条，与 7 日均值偏差 < 2%' },
      { level: 'warn',  title: 'GBPJPY 点差异常扩大', detail: '过去 1h 内 GBPJPY 点差 3 次超过 0.0050，超出历史 3σ 上限（0.0048）' },
      { level: 'error', title: 'LP_MUFG 报价量下降 80%', detail: '过去 2h LP_MUFG 报价量从 7000 条/h 降至 1400 条/h，建议检查 LP 连接状态' },
    ],
    conclusion: 'raw_ladder 整体质量良好，但存在两个风险点：GBPJPY 点差异常扩大（可能影响依赖该品种的策略入场），以及 LP_MUFG 报价量骤降（建议立即排查 LP 连接）。',
  },

  'raw_ladder|lineage_impact': {
    steps: [
      { id: '1', text: '查询 raw_ladder 的下游血缘关系...', status: 'done' },
      { id: '2', text: '识别直接依赖数据集（execution_ladder、spread_metrics）...', status: 'done' },
      { id: '3', text: '追踪依赖 execution_ladder 的策略...', status: 'done' },
      { id: '4', text: '评估各下游的影响程度...', status: 'done' },
      { id: '5', text: '生成影响面报告...', status: 'done' },
    ],
    findings: [
      { level: 'info', title: '直接下游：2 个数据集', detail: 'execution_ladder（Flink 实时聚合）、spread_metrics（5min 窗口聚合）' },
      { level: 'warn', title: '间接影响：2 个策略', detail: 'TrendFollowing 和 MeanReversion 均依赖 execution_ladder 作为行情输入' },
      { level: 'warn', title: 'TrendFollowing 影响最大', detail: '该策略 100% 依赖 raw_ladder → execution_ladder 链路，一旦中断将无法产生信号' },
      { level: 'info', title: 'MeanReversion 有备用数据源', detail: '该策略同时订阅 reuters 行情，raw_ladder 中断时可降级运行' },
    ],
    conclusion: 'raw_ladder 是核心数据源，影响 2 个下游数据集和 2 个策略。TrendFollowing 完全依赖此链路，风险最高；MeanReversion 有备用源，风险可控。建议为 TrendFollowing 配置数据源告警。',
  },

  'trend_following|strategy_volume': {
    steps: [
      { id: '1', text: '获取 TrendFollowing 过去 7 天成交量数据...', status: 'done' },
      { id: '2', text: '检测成交量异常时间段...', status: 'done' },
      { id: '3', text: '查询策略依赖的数据源（raw_ladder、execution_ladder）...', status: 'done' },
      { id: '4', text: '对比异常时段的数据质量指标...', status: 'done' },
      { id: '5', text: '关联 LP 报价质量变化...', status: 'warn' },
      { id: '6', text: '生成归因报告...', status: 'done' },
    ],
    findings: [
      { level: 'warn',  title: '今日成交量下降 62%', detail: '今日成交 38 笔，7 日均值 100 笔，下降幅度显著' },
      { level: 'error', title: '根因：LP_MUFG 报价量骤降', detail: '今日 10:00-12:00 LP_MUFG 报价量下降 80%，导致 GBPJPY/EURJPY 流动性不足' },
      { level: 'warn',  title: 'GBPJPY 点差超出入场阈值', detail: '策略入场阈值为点差 < 0.0040，但该时段 GBPJPY 平均点差 0.0052，触发条件不满足' },
      { level: 'info',  title: 'EURUSD/GBPUSD 成交正常', detail: '主要货币对流动性充足，成交量与历史持平，策略逻辑本身无异常' },
    ],
    conclusion: '成交量下降根因在数据层：LP_MUFG 报价异常 → GBPJPY/EURJPY 点差扩大 → 策略入场条件不满足。策略逻辑本身无问题，建议联系 LP_MUFG 排查连接状态，或临时降低该 LP 权重。',
  },

  'mean_reversion|strategy_pnl': {
    steps: [
      { id: '1', text: '获取 MeanReversion 本周盈亏数据...', status: 'done' },
      { id: '2', text: '计算盈亏波动率，与历史对比...', status: 'done' },
      { id: '3', text: '查询依赖数据源：spread_metrics、lp_raw_quote...', status: 'done' },
      { id: '4', text: '对比本周 vs 上周点差标准差...', status: 'warn' },
      { id: '5', text: '追溯 spread_metrics 上游血缘（raw_ladder）...', status: 'done' },
      { id: '6', text: '检查 raw_ladder 本周数据延迟记录...', status: 'warn' },
      { id: '7', text: '生成归因报告...', status: 'done' },
    ],
    findings: [
      { level: 'warn',  title: '本周盈亏波动率是上周 3.2 倍', detail: '本周日内盈亏标准差 $4,200，上周 $1,310，波动显著放大' },
      { level: 'error', title: '数据层根因：点差噪声增大', detail: '本周 EURUSD 点差标准差 0.000142，上周 0.000048，增大 3 倍，导致均值回归信号频繁误触发' },
      { level: 'warn',  title: 'raw_ladder 本周 2 次数据延迟', detail: '周二 14:23 和周四 09:41 各有一次约 8 分钟的数据中断，影响 spread_metrics 计算窗口' },
      { level: 'info',  title: '策略参数本身无需调整', detail: '在正常数据质量下，策略回测表现稳定，问题来自数据层而非策略逻辑' },
    ],
    conclusion: '盈亏波动放大的根因是数据质量问题：raw_ladder 两次延迟 → spread_metrics 计算窗口受污染 → 点差噪声增大 → 均值回归信号误触发。建议修复 raw_ladder 数据稳定性，并在数据延迟期间暂停策略信号。',
  },

  'lp_mufg|lineage_impact': {
    steps: [
      { id: '1', text: '查询 LP_MUFG 报价流入的数据集...', status: 'done' },
      { id: '2', text: '追踪 raw_ladder 下游血缘...', status: 'done' },
      { id: '3', text: '识别依赖 LP_MUFG 报价的品种（USDJPY/EURJPY/GBPJPY）...', status: 'done' },
      { id: '4', text: '评估各策略对这些品种的依赖程度...', status: 'warn' },
      { id: '5', text: '生成影响面报告...', status: 'done' },
    ],
    findings: [
      { level: 'info', title: 'LP_MUFG 主要覆盖 3 个品种', detail: 'USDJPY（报价量最大）、EURJPY、GBPJPY，均为日元交叉盘' },
      { level: 'warn', title: 'TrendFollowing 高度依赖日元品种', detail: '该策略 60% 的信号来自 USDJPY/GBPJPY，LP_MUFG 异常将直接影响流动性' },
      { level: 'warn', title: 'MeanReversion 部分依赖', detail: '该策略 EURJPY 仓位占比 25%，LP_MUFG 异常时点差扩大会影响入场精度' },
      { level: 'info', title: 'LP_CITI/LP_BARC 可部分覆盖', detail: 'USDJPY 有 LP_CITI 和 LP_BARC 备用，但 GBPJPY 仅 LP_MUFG 和 LP_DEUT 覆盖，备用流动性有限' },
    ],
    conclusion: 'LP_MUFG 异常主要影响日元交叉盘流动性，TrendFollowing 风险最高（60% 信号依赖）。USDJPY 有备用 LP 可降级，但 GBPJPY 备用流动性不足，建议紧急联系 LP_MUFG 或临时提高 LP_DEUT 权重。',
  },
}

function getMockResult(objectId: string, scenario: ScenarioKey): AnalysisResult {
  const key = `${objectId}|${scenario}`
  return MOCK_RESULTS[key] ?? {
    steps: [
      { id: '1', text: '加载元数据...', status: 'done' },
      { id: '2', text: '分析依赖关系...', status: 'done' },
      { id: '3', text: '生成报告...', status: 'done' },
    ],
    findings: [
      { level: 'info', title: '分析完成', detail: '未发现明显异常，数据状态正常' },
    ],
    conclusion: '当前对象状态正常，未发现需要关注的风险点。',
  }
}

interface AnalysisReport {
  id: string
  title: string
  savedAt: string
  object: AnalysisObject
  scenario: ScenarioKey
  steps: StepItem[]
  findings: Finding[]
  conclusion: string
}

// ── 颜色 / 图标 ───────────────────────────────────────────────────────────────

const FINDING_COLOR = { info: '#1677ff', warn: '#fa8c16', error: '#f5222d' }
const FINDING_BG    = { info: '#e6f4ff', warn: '#fff7e6', error: '#fff1f0' }
const FINDING_LABEL = { info: '信息', warn: '警告', error: '异常' }
const FINDING_TAG   = { info: 'blue', warn: 'orange', error: 'red' } as const

const STEP_ICON = {
  pending: <LoadingOutlined style={{ color: '#d9d9d9' }} />,
  running: <LoadingOutlined style={{ color: '#1677ff' }} spin />,
  done:    <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  warn:    <WarningOutlined style={{ color: '#fa8c16' }} />,
}

const OBJ_COLOR = { dataset: 'blue', strategy: 'purple', lp: 'cyan' } as const
const OBJ_ICON  = { dataset: <DatabaseOutlined />, strategy: <RobotOutlined />, lp: <ApiOutlined /> }
const OBJ_LABEL = { dataset: '数据集', strategy: '策略', lp: 'LP' }

const SCENARIO_GROUP: { label: string; keys: ScenarioKey[] }[] = [
  { label: '数据质量',  keys: ['data_quality'] },
  { label: '影响面分析', keys: ['lineage_impact'] },
  { label: '策略表现',  keys: ['strategy_volume', 'strategy_pnl'] },
]

const REPORTS_KEY = 'evo_ai_reports'

// ── 报告详情 ──────────────────────────────────────────────────────────────────

function ReportDetail({ report, onBack }: { report: AnalysisReport; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Button type="text" size="small" onClick={onBack}>← 返回列表</Button>
        <Text strong style={{ fontSize: 15 }}>{report.title}</Text>
        <Tag color={OBJ_COLOR[report.object.type]} style={{ fontSize: 11 }}>{OBJ_LABEL[report.object.type]}</Tag>
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
          {new Date(report.savedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </div>
      <Card size="small" title={<Text strong style={{ fontSize: 13 }}>探索过程</Text>} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.steps.map(step => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {STEP_ICON[step.status]}
              <Text style={{ fontSize: 13, color: step.status === 'warn' ? '#fa8c16' : '#1e293b' }}>{step.text}</Text>
            </div>
          ))}
        </div>
      </Card>
      <Card size="small" title={<Text strong style={{ fontSize: 13 }}>关键发现</Text>} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.findings.map((f, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: FINDING_BG[f.level], borderLeft: `3px solid ${FINDING_COLOR[f.level]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color={FINDING_TAG[f.level]} style={{ fontSize: 10, margin: 0 }}>{FINDING_LABEL[f.level]}</Tag>
                <Text strong style={{ fontSize: 13 }}>{f.title}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>{f.detail}</Text>
            </div>
          ))}
        </div>
      </Card>
      <Card size="small" title={<Text strong style={{ fontSize: 13 }}>结论</Text>}>
        <Paragraph style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>{report.conclusion}</Paragraph>
      </Card>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export default function AiExplorePage() {
  const [selectedObj,      setSelectedObj]      = useState<AnalysisObject | null>(OBJECTS.find(o => o.type === 'dataset') ?? null)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey | null>(null)
  const [typeFilter,       setTypeFilter]       = useState<ObjectType>('dataset')
  const [search,           setSearch]           = useState('')
  const [running,          setRunning]          = useState(false)
  const [steps,            setSteps]            = useState<StepItem[]>([])
  const [findings,         setFindings]         = useState<Finding[]>([])
  const [conclusion,       setConclusion]       = useState('')
  const [saved,            setSaved]            = useState(false)
  const [activeTab,        setActiveTab]        = useState('explore')
  const [reports,          setReports]          = useState<AnalysisReport[]>([])
  const [viewingReport,    setViewingReport]    = useState<AnalysisReport | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReports(JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]'))
  }, [])

  function handleTypeFilter(t: ObjectType) {
    setTypeFilter(t)
    setSelectedObj(OBJECTS.find(o => o.type === t) ?? null)
    if (selectedScenario) {
      const s = SCENARIOS.find(s => s.key === selectedScenario)
      if (s && !s.applicableTo.includes(t)) setSelectedScenario(null)
    }
    setSteps([]); setFindings([]); setConclusion(''); setSaved(false)
  }

  function handleSelectObj(obj: AnalysisObject) {
    setSelectedObj(selectedObj?.id === obj.id ? null : obj)
    if (selectedScenario) {
      const s = SCENARIOS.find(s => s.key === selectedScenario)
      if (s && !s.applicableTo.includes(obj.type)) setSelectedScenario(null)
    }
    setSteps([]); setFindings([]); setConclusion(''); setSaved(false)
  }

  async function handleRun() {
    if (!selectedObj || !selectedScenario) return
    setActiveTab('explore')
    setRunning(true); setSteps([]); setFindings([]); setConclusion(''); setSaved(false)
    const result = getMockResult(selectedObj.id, selectedScenario)
    for (let i = 0; i < result.steps.length; i++) {
      setSteps(prev => [...prev, { ...result.steps[i], status: 'running' }])
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      setSteps(prev => prev.map(s => s.id === result.steps[i].id ? result.steps[i] : s))
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    await new Promise(r => setTimeout(r, 300))
    setFindings(result.findings)
    await new Promise(r => setTimeout(r, 200))
    setConclusion(result.conclusion)
    setRunning(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleSaveReport() {
    const report: AnalysisReport = {
      id: `report_${Date.now()}`,
      title: `${selectedObj?.displayName} — ${SCENARIOS.find(s => s.key === selectedScenario)?.label}`,
      savedAt: new Date().toISOString(),
      object: selectedObj!, scenario: selectedScenario!,
      steps, findings, conclusion,
    }
    const next = [report, ...reports]
    setReports(next)
    localStorage.setItem(REPORTS_KEY, JSON.stringify(next))
    setSaved(true)
  }

  function handleDeleteReport(id: string) {
    const next = reports.filter(r => r.id !== id)
    setReports(next)
    localStorage.setItem(REPORTS_KEY, JSON.stringify(next))
    if (viewingReport?.id === id) setViewingReport(null)
  }

  const hasResult = steps.length > 0
  const filteredObjects = OBJECTS.filter(o => {
    if (o.type !== typeFilter) return false
    if (search && !o.displayName.toLowerCase().includes(search.toLowerCase()) &&
        !o.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const visibleScenarios = SCENARIOS.filter(s => s.applicableTo.includes(typeFilter))

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: '#f5f5f5' }}>

      {/* ── 左侧配置面板 ── */}
      <div style={{
        width: 260, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* 标题 */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 13 }}>AI 探索</Text>
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

          {/* 分析对象 */}
          <div>
            <Text style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              分析对象
            </Text>

            {/* 类型 Tab */}
            <div style={{ display: 'flex', marginTop: 8, border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
              {(['dataset', 'strategy', 'lp'] as ObjectType[]).map((t, i) => (
                <div
                  key={t}
                  onClick={() => handleTypeFilter(t)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '5px 0', fontSize: 12,
                    cursor: 'pointer', userSelect: 'none',
                    background: typeFilter === t ? '#1677ff' : '#fff',
                    color: typeFilter === t ? '#fff' : '#595959',
                    borderRight: i < 2 ? '1px solid #f0f0f0' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {OBJ_LABEL[t]}
                </div>
              ))}
            </div>

            {/* 搜索框 */}
            <div style={{
              marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 8px',
              background: '#fafafa',
            }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`搜索${OBJ_LABEL[typeFilter]}...`}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, flex: 1 }}
              />
              {search && <span style={{ cursor: 'pointer', color: '#bfbfbf', fontSize: 11 }} onClick={() => setSearch('')}>✕</span>}
            </div>

            {/* 对象列表 */}
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredObjects.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12, padding: '8px 4px' }}>无匹配结果</Text>
              ) : filteredObjects.map(obj => {
                const isSelected = selectedObj?.id === obj.id
                return (
                  <div
                    key={obj.id}
                    onClick={() => handleSelectObj(obj)}
                    style={{
                      padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      background: isSelected ? '#e6f4ff' : undefined,
                      borderLeft: isSelected ? '2px solid #1677ff' : '2px solid transparent',
                      color: isSelected ? '#1677ff' : '#1e293b',
                      transition: 'all 0.1s', userSelect: 'none',
                    }}
                  >
                    {obj.displayName}
                  </div>
                )
              })}
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* 分析场景 */}
          <div>
            <Text style={{ fontSize: 11, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              分析场景
            </Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleScenarios.map(s => {
                const isSelected = selectedScenario === s.key
                return (
                  <div
                    key={s.key}
                    onClick={() => setSelectedScenario(isSelected ? null : s.key)}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', userSelect: 'none',
                      border: `1px solid ${isSelected ? '#1677ff' : '#e0e0e0'}`,
                      background: isSelected ? '#e6f4ff' : '#fafafa',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = '#91caff' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = '#e0e0e0' }}
                  >
                    <Text strong style={{ fontSize: 12, color: isSelected ? '#1677ff' : undefined, display: 'block' }}>
                      {s.label}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{s.description}</Text>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 开始分析 */}
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <Button
              type="primary" block icon={<PlayCircleOutlined />}
              disabled={!selectedObj || !selectedScenario || running}
              loading={running}
              onClick={handleRun}
            >
              开始分析
            </Button>
            {(!selectedObj || !selectedScenario) && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 6 }}>
                {!selectedObj ? '请先选择分析对象' : '请选择分析场景'}
              </Text>
            )}
          </div>
        </div>
      </div>

      {/* ── 右侧内容区 ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={activeTab}
          onChange={key => { setActiveTab(key); setViewingReport(null) }}
          style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}
          items={[
            { key: 'explore', label: '当前分析' },
            {
              key: 'reports',
              label: (
                <span>
                  历史报告
                  {reports.length > 0 && (
                    <Tag color="blue" style={{ fontSize: 10, marginLeft: 6, padding: '0 5px' }}>{reports.length}</Tag>
                  )}
                </span>
              ),
            },
          ]}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* 当前分析 */}
          {activeTab === 'explore' && (
            !hasResult ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                  image={<RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description={
                    <Text type="secondary">
                      {!selectedObj ? '请选择分析对象' : !selectedScenario ? '请选择分析场景' : '点击「开始分析」'}
                    </Text>
                  }
                />
              </div>
            ) : (
              <div style={{ maxWidth: 680 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <RobotOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                  <Text strong style={{ fontSize: 15 }}>
                    {selectedObj?.displayName} — {SCENARIOS.find(s => s.key === selectedScenario)?.label}
                  </Text>
                  <Tag color={OBJ_COLOR[selectedObj!.type]} style={{ fontSize: 11 }}>{OBJ_LABEL[selectedObj!.type]}</Tag>
                </div>

                <Card size="small" title={<Text strong style={{ fontSize: 13 }}>探索过程</Text>} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {steps.map(step => (
                      <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {STEP_ICON[step.status]}
                        <Text style={{
                          fontSize: 13,
                          color: step.status === 'pending' ? '#d9d9d9'
                               : step.status === 'running' ? '#1677ff'
                               : step.status === 'warn' ? '#fa8c16' : '#1e293b',
                        }}>{step.text}</Text>
                      </div>
                    ))}
                  </div>
                </Card>

                {findings.length > 0 && (
                  <Card size="small" title={<Text strong style={{ fontSize: 13 }}>关键发现</Text>} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {findings.map((f, i) => (
                        <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: FINDING_BG[f.level], borderLeft: `3px solid ${FINDING_COLOR[f.level]}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Tag color={FINDING_TAG[f.level]} style={{ fontSize: 10, margin: 0 }}>{FINDING_LABEL[f.level]}</Tag>
                            <Text strong style={{ fontSize: 13 }}>{f.title}</Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{f.detail}</Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {conclusion && (
                  <Card
                    size="small"
                    title={<Text strong style={{ fontSize: 13 }}>结论</Text>}
                    extra={
                      <Button size="small" icon={<SaveOutlined />} type={saved ? 'default' : 'primary'} disabled={saved} onClick={handleSaveReport}>
                        {saved ? '已保存' : '保存为报告'}
                      </Button>
                    }
                  >
                    <Paragraph style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>{conclusion}</Paragraph>
                  </Card>
                )}
                <div ref={bottomRef} />
              </div>
            )
          )}

          {/* 历史报告 */}
          {activeTab === 'reports' && (
            viewingReport ? (
              <ReportDetail report={viewingReport} onBack={() => setViewingReport(null)} />
            ) : reports.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                  image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description={<Text type="secondary">暂无报告，完成分析后点「保存为报告」</Text>}
                />
              </div>
            ) : (
              <div style={{ maxWidth: 680 }}>
                <List
                  dataSource={reports}
                  renderItem={report => (
                    <List.Item
                      style={{
                        background: '#fff', borderRadius: 8, marginBottom: 8,
                        padding: '12px 16px', cursor: 'pointer',
                        border: '1px solid #f0f0f0', transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      onClick={() => setViewingReport(report)}
                      actions={[
                        <Popconfirm
                          title="删除这份报告？" okText="删除" cancelText="取消"
                          onConfirm={e => { e?.stopPropagation(); handleDeleteReport(report.id) }}
                          onCancel={e => e?.stopPropagation()}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
                        </Popconfirm>,
                      ]}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileTextOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13 }}>{report.title}</Text>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <Tag color={OBJ_COLOR[report.object.type]} style={{ fontSize: 10, margin: 0 }}>{OBJ_LABEL[report.object.type]}</Tag>
                            <Tag style={{ fontSize: 10, margin: 0 }}>{SCENARIOS.find(s => s.key === report.scenario)?.label}</Tag>
                            {report.findings.filter(f => f.level === 'error').length > 0 && (
                              <Text style={{ fontSize: 11, color: '#f5222d' }}>● {report.findings.filter(f => f.level === 'error').length} 异常</Text>
                            )}
                            {report.findings.filter(f => f.level === 'warn').length > 0 && (
                              <Text style={{ fontSize: 11, color: '#fa8c16' }}>● {report.findings.filter(f => f.level === 'warn').length} 警告</Text>
                            )}
                          </div>
                        </div>
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                          {new Date(report.savedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
