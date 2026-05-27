import { useState, useRef, useEffect } from 'react'
import { Input, Button, Typography, Tag, Spin, Avatar, message } from 'antd'
import {
  SendOutlined, UserOutlined, RobotOutlined,
  TableOutlined, BarChartOutlined, CodeOutlined,
  ThunderboltOutlined, MessageOutlined, SaveOutlined,
} from '@ant-design/icons'
import { saveToDashboard } from './DashboardPage'

const { Text } = Typography

// ── 类型 ──────────────────────────────────────────────────────────────────────
type MessageRole = 'user' | 'assistant'

interface TableResult {
  columns: string[]
  rows: (string | number)[][]
}

interface Message {
  id: string
  role: MessageRole
  content: string
  sql?: string
  result?: TableResult
  chartType?: 'bar' | 'line' | 'table'
  loading?: boolean
}

// ── Mock 数据 ─────────────────────────────────────────────────────────────────
const MOCK_RESPONSES: Record<string, { sql: string; result: TableResult; summary: string }> = {
  default: {
    sql: `SELECT symbol, AVG(ask - bid) AS avg_spread, MIN(ask - bid) AS min_spread, MAX(ask - bid) AS max_spread
FROM execution_ladder
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY symbol
ORDER BY avg_spread DESC
LIMIT 10`,
    result: {
      columns: ['symbol', 'avg_spread', 'min_spread', 'max_spread'],
      rows: [
        ['GBPJPY', 0.00312, 0.00180, 0.00520],
        ['EURJPY', 0.00285, 0.00160, 0.00480],
        ['USDJPY', 0.00198, 0.00120, 0.00340],
        ['GBPUSD', 0.00156, 0.00090, 0.00280],
        ['EURUSD', 0.00089, 0.00050, 0.00160],
        ['USDCHF', 0.00102, 0.00060, 0.00190],
        ['AUDUSD', 0.00134, 0.00080, 0.00240],
        ['NZDUSD', 0.00178, 0.00100, 0.00310],
      ],
    },
    summary: '过去 24 小时共 8 个品种的点差统计。GBPJPY 平均点差最宽（0.00312），EURUSD 最窄（0.00089）。整体点差在正常范围内，未发现异常扩张。',
  },
  position: {
    sql: `SELECT ap.account_id, ap.symbol,
       ap.volume, ap.open_price,
       ap.unrealized_pnl,
       ab.equity
FROM account_position ap
JOIN account_balance ab ON ap.account_id = ab.account_id
WHERE ABS(ap.unrealized_pnl) > 1000
ORDER BY ap.unrealized_pnl ASC
LIMIT 20`,
    result: {
      columns: ['account_id', 'symbol', 'volume', 'open_price', 'unrealized_pnl', 'equity'],
      rows: [
        ['ACC_0042', 'GBPUSD', -2.50, 1.27340, -3842.50, 48200.00],
        ['ACC_0017', 'USDJPY',  5.00, 149.820, -2910.00, 92400.00],
        ['ACC_0089', 'EURUSD', -1.00, 1.08920, -1540.00, 31600.00],
        ['ACC_0031', 'GBPJPY',  3.00, 188.450,  1280.00, 67800.00],
        ['ACC_0055', 'EURJPY', -2.00, 162.340,  2150.00, 55300.00],
        ['ACC_0073', 'AUDUSD',  4.00, 0.65120,  3620.00, 84100.00],
      ],
    },
    summary: '当前共 6 个账户持仓浮亏/浮盈超过 1000 USD。ACC_0042 的 GBPUSD 空头浮亏最大（-3842.50），需关注风险。ACC_0073 的 AUDUSD 多头浮盈最高（+3620.00）。',
  },
  lp: {
    sql: `SELECT lp_id,
       COUNT(*) AS quote_count,
       AVG(ask - bid) AS avg_spread,
       STDDEV(ask - bid) AS spread_stddev,
       MAX(quoted_at) AS last_quote_at
FROM lp_raw_quote
WHERE quoted_at >= NOW() - INTERVAL '1 hour'
GROUP BY lp_id
ORDER BY avg_spread ASC`,
    result: {
      columns: ['lp_id', 'quote_count', 'avg_spread', 'spread_stddev', 'last_quote_at'],
      rows: [
        ['LP_CITI',   18420, 0.00042, 0.000089, '2026-05-22 15:58:01'],
        ['LP_BARC',   16830, 0.00051, 0.000102, '2026-05-22 15:58:03'],
        ['LP_DEUT',   15290, 0.00063, 0.000134, '2026-05-22 15:57:58'],
        ['LP_HSBC',   14100, 0.00078, 0.000198, '2026-05-22 15:57:55'],
        ['LP_MUFG',   12640, 0.00094, 0.000241, '2026-05-22 15:57:49'],
      ],
    },
    summary: '过去 1 小时 5 个 LP 的报价质量对比。LP_CITI 报价最活跃（18420 次）且点差最窄（0.00042），质量最优。LP_MUFG 点差最宽且波动最大，建议评估是否降低其权重。',
  },
}

function getMockResponse(question: string) {
  const q = question.toLowerCase()
  if (q.includes('持仓') || q.includes('position') || q.includes('pnl') || q.includes('盈亏')) {
    return MOCK_RESPONSES.position
  }
  if (q.includes('lp') || q.includes('报价') || q.includes('质量')) {
    return MOCK_RESPONSES.lp
  }
  return MOCK_RESPONSES.default
}

// ── 快捷问题 ──────────────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  '过去 24 小时各品种点差统计',
  '当前浮亏超过 1000 USD 的持仓',
  '各 LP 过去 1 小时报价质量对比',
  'EURUSD 今日成交量趋势',
]

// ── 结果表格 ──────────────────────────────────────────────────────────────────
function ResultTable({ result }: { result: TableResult }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 12, fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
      }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {result.columns.map(col => (
              <th key={col} style={{
                padding: '6px 12px', textAlign: 'left',
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '5px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  color: typeof cell === 'number' && cell < 0 ? '#ef4444' :
                         typeof cell === 'number' && cell > 0 ? '#22c55e' : '#1e293b',
                  whiteSpace: 'nowrap',
                }}>
                  {typeof cell === 'number' ? cell.toFixed(cell % 1 === 0 ? 0 : 5) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── SQL 展示 ──────────────────────────────────────────────────────────────────
function SqlBlock({ sql }: { sql: string }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <Button
        size="small" type="text" icon={<CodeOutlined />}
        style={{ color: '#94a3b8', fontSize: 11, padding: '0 4px' }}
        onClick={() => setShow(v => !v)}
      >
        {show ? '收起 SQL' : '查看 SQL'}
      </Button>
      {show && (
        <pre style={{
          marginTop: 6, padding: '10px 14px',
          background: '#1e293b', color: '#e2e8f0',
          borderRadius: 6, fontSize: 11, lineHeight: 1.6,
          overflowX: 'auto', whiteSpace: 'pre-wrap',
          fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
        }}>
          {sql}
        </pre>
      )}
    </div>
  )
}

// ── 消息气泡 ──────────────────────────────────────────────────────────────────
function MessageBubble({ msg, question }: { msg: Message; question?: string }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <div style={{
          maxWidth: '60%', padding: '10px 14px',
          background: '#1677ff', borderRadius: '12px 12px 2px 12px',
          color: '#fff', fontSize: 13, lineHeight: 1.6,
        }}>
          {msg.content}
        </div>
        <Avatar size={32} icon={<UserOutlined />}
          style={{ background: '#e2e8f0', color: '#64748b', flexShrink: 0 }} />
      </div>
    )
  }

  function handleSave() {
    if (!msg.result) return
    saveToDashboard({
      title: question ?? msg.content.slice(0, 30),
      sql: msg.sql ?? '',
      chartType: 'table',
      columns: msg.result.columns,
      rows: msg.result.rows,
      source: 'chat',
    })
    message.success('已保存到看板')
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <Avatar size={32} icon={<RobotOutlined />}
        style={{ background: '#eff6ff', color: '#1677ff', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {msg.loading ? (
          <div style={{
            padding: '10px 14px', background: '#fff',
            borderRadius: '2px 12px 12px 12px',
            border: '1px solid #f1f5f9',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <Spin size="small" />
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>正在分析...</Text>
          </div>
        ) : (
          <div style={{
            background: '#fff', borderRadius: '2px 12px 12px 12px',
            border: '1px solid #f1f5f9', padding: '12px 16px',
          }}>
            {/* 摘要文字 */}
            <Typography.Paragraph style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#1e293b' }}>
              {msg.content}
            </Typography.Paragraph>

            {/* 结果表格 */}
            {msg.result && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <TableOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                    {msg.result.rows.length} 行结果
                  </Text>
                  <Button
                    size="small" type="text" icon={<SaveOutlined />}
                    style={{ marginLeft: 'auto', fontSize: 11, color: '#1677ff' }}
                    onClick={handleSave}
                  >
                    保存到看板
                  </Button>
                </div>
                <ResultTable result={msg.result} />
              </div>
            )}

            {/* SQL */}
            {msg.sql && <SqlBlock sql={msg.sql} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function ChatBIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我可以帮你查询和分析 Evo 的交易数据。你可以用自然语言提问，我会自动生成 SQL 并返回结果。',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return
    const q = question.trim()
    setInput('')
    setLoading(true)

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q }
    const loadingMsg: Message = { id: Date.now() + '_ai', role: 'assistant', content: '', loading: true }
    setMessages(prev => [...prev, userMsg, loadingMsg])

    // 模拟 AI 响应延迟
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))

    const mock = getMockResponse(q)
    const aiMsg: Message = {
      id: loadingMsg.id,
      role: 'assistant',
      content: mock.summary,
      sql: mock.sql,
      result: mock.result,
    }
    setMessages(prev => prev.map(m => m.id === loadingMsg.id ? aiMsg : m))
    setLoading(false)
  }

  const isEmpty = messages.length === 1 // 只有欢迎消息

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* 顶部标题栏 */}
      <div style={{
        padding: '10px 20px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <MessageOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        <Text strong style={{ fontSize: 14 }}>Chat BI</Text>
        <Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>Beta</Tag>
        <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
          基于 Evo 数据地图，用自然语言探索数据
        </Text>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['execution_ladder', 'account_position', 'lp_raw_quote'].map(t => (
            <Tag key={t} style={{ fontSize: 10, cursor: 'default' }}>{t}</Tag>
          ))}
          <Text type="secondary" style={{ fontSize: 11 }}>等 11 张表可查询</Text>
        </div>
      </div>

      {/* 消息区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>

          {/* 空状态：快捷问题 */}
          {isEmpty && (
            <div style={{ textAlign: 'center', padding: '40px 0 32px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#eff6ff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <ThunderboltOutlined style={{ fontSize: 24, color: '#1677ff' }} />
              </div>
              <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>
                用自然语言探索交易数据
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                直接提问，AI 自动生成 SQL 并返回结果
              </Text>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 10, marginTop: 28, textAlign: 'left',
              }}>
                {QUICK_QUESTIONS.map(q => (
                  <div
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '12px 16px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#1e293b',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#1677ff'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 2px rgba(22,119,255,0.1)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    }}
                  >
                    <BarChartOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              question={msg.role === 'assistant' && i > 0 ? messages[i - 1]?.content : undefined}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 输入框 */}
      <div style={{
        padding: '12px 20px 16px',
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* 快捷问题（有消息后显示在输入框上方） */}
          {!isEmpty && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {QUICK_QUESTIONS.slice(0, 3).map(q => (
                <Tag
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}
                >
                  {q}
                </Tag>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={() => sendMessage(input)}
              placeholder="提问，例如：过去 1 小时 EURUSD 的点差变化趋势..."
              size="large"
              style={{ borderRadius: 10, fontSize: 13 }}
              disabled={loading}
              suffix={
                <Button
                  type="primary"
                  shape="circle"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={{ width: 28, height: 28, minWidth: 28 }}
                />
              }
            />
          </div>
          <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
            当前为 Demo 模式，SQL 由 AI 生成后在 TimescaleDB 执行
          </Text>
        </div>
      </div>
    </div>
  )
}
