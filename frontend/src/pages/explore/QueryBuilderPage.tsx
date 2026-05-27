import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Select, Button, Tag, Typography, Divider, Radio,
  Table, Empty, Tooltip, message,
} from 'antd'
import {
  PlusOutlined, CloseOutlined, PlayCircleOutlined,
  TableOutlined, BarChartOutlined, LineChartOutlined,
  SaveOutlined, FunctionOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend,
} from 'recharts'
import { saveToDashboard } from './DashboardPage'

const { Text } = Typography

// ── Schema 定义（来自数据地图） ───────────────────────────────────────────────
interface FieldDef {
  name: string
  dataType: string
  isPk?: boolean
}

interface DatasetDef {
  name: string
  displayName: string
  fields: FieldDef[]
}

const DATASETS: DatasetDef[] = [
  {
    name: 'execution_ladder', displayName: 'Execution Ladder',
    fields: [
      { name: 'symbol',     dataType: 'varchar' },
      { name: 'bid',        dataType: 'decimal' },
      { name: 'ask',        dataType: 'decimal' },
      { name: 'spread',     dataType: 'decimal' },
      { name: 'markup',     dataType: 'decimal' },
      { name: 'created_at', dataType: 'timestamptz' },
    ],
  },
  {
    name: 'lp_raw_quote', displayName: 'LP Raw Quote',
    fields: [
      { name: 'lp_id',     dataType: 'varchar' },
      { name: 'symbol',    dataType: 'varchar' },
      { name: 'bid',       dataType: 'decimal' },
      { name: 'ask',       dataType: 'decimal' },
      { name: 'volume',    dataType: 'decimal' },
      { name: 'quoted_at', dataType: 'timestamptz' },
    ],
  },
  {
    name: 'account_position', displayName: 'Account Position',
    fields: [
      { name: 'account_id',     dataType: 'varchar' },
      { name: 'symbol',         dataType: 'varchar' },
      { name: 'volume',         dataType: 'decimal' },
      { name: 'open_price',     dataType: 'decimal' },
      { name: 'unrealized_pnl', dataType: 'decimal' },
      { name: 'updated_at',     dataType: 'timestamptz' },
    ],
  },
  {
    name: 'spread_metrics', displayName: 'Spread Metrics',
    fields: [
      { name: 'symbol',       dataType: 'varchar' },
      { name: 'avg_spread',   dataType: 'decimal' },
      { name: 'min_spread',   dataType: 'decimal' },
      { name: 'max_spread',   dataType: 'decimal' },
      { name: 'window_start', dataType: 'timestamptz' },
      { name: 'window_end',   dataType: 'timestamptz' },
    ],
  },
  {
    name: 'execution_report', displayName: 'Execution Report',
    fields: [
      { name: 'client_id',  dataType: 'varchar' },
      { name: 'symbol',     dataType: 'varchar' },
      { name: 'side',       dataType: 'varchar' },
      { name: 'volume',     dataType: 'decimal' },
      { name: 'exec_price', dataType: 'decimal' },
      { name: 'exec_at',    dataType: 'timestamptz' },
    ],
  },
]

const AGG_FUNCTIONS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']

const FILTER_OPS: Record<string, string[]> = {
  varchar:     ['=', '!=', 'IN', 'NOT IN', 'LIKE'],
  decimal:     ['=', '!=', '>', '>=', '<', '<=', 'BETWEEN'],
  timestamptz: ['过去 1 小时', '过去 24 小时', '过去 7 天', '过去 30 天', '自定义'],
}

// ── Mock 基础数据 ─────────────────────────────────────────────────────────────

// execution_ladder：8 个品种，每个品种 6 条 tick
const RAW_EXECUTION_LADDER = [
  { symbol: 'EURUSD', bid: 1.08312, ask: 1.08401, spread: 0.00089, markup: 0.00020 },
  { symbol: 'EURUSD', bid: 1.08298, ask: 1.08391, spread: 0.00093, markup: 0.00020 },
  { symbol: 'EURUSD', bid: 1.08334, ask: 1.08418, spread: 0.00084, markup: 0.00020 },
  { symbol: 'EURUSD', bid: 1.08276, ask: 1.08372, spread: 0.00096, markup: 0.00020 },
  { symbol: 'EURUSD', bid: 1.08355, ask: 1.08437, spread: 0.00082, markup: 0.00020 },
  { symbol: 'EURUSD', bid: 1.08320, ask: 1.08408, spread: 0.00088, markup: 0.00020 },
  { symbol: 'GBPUSD', bid: 1.27340, ask: 1.27496, spread: 0.00156, markup: 0.00030 },
  { symbol: 'GBPUSD', bid: 1.27280, ask: 1.27445, spread: 0.00165, markup: 0.00030 },
  { symbol: 'GBPUSD', bid: 1.27410, ask: 1.27558, spread: 0.00148, markup: 0.00030 },
  { symbol: 'GBPUSD', bid: 1.27190, ask: 1.27352, spread: 0.00162, markup: 0.00030 },
  { symbol: 'GBPUSD', bid: 1.27460, ask: 1.27612, spread: 0.00152, markup: 0.00030 },
  { symbol: 'GBPUSD', bid: 1.27310, ask: 1.27472, spread: 0.00162, markup: 0.00030 },
  { symbol: 'USDJPY', bid: 149.820, ask: 150.018, spread: 0.00198, markup: 0.00040 },
  { symbol: 'USDJPY', bid: 149.650, ask: 149.862, spread: 0.00212, markup: 0.00040 },
  { symbol: 'USDJPY', bid: 150.120, ask: 150.305, spread: 0.00185, markup: 0.00040 },
  { symbol: 'USDJPY', bid: 149.980, ask: 150.168, spread: 0.00188, markup: 0.00040 },
  { symbol: 'USDJPY', bid: 150.340, ask: 150.528, spread: 0.00188, markup: 0.00040 },
  { symbol: 'USDJPY', bid: 149.760, ask: 149.958, spread: 0.00198, markup: 0.00040 },
  { symbol: 'GBPJPY', bid: 188.450, ask: 188.762, spread: 0.00312, markup: 0.00060 },
  { symbol: 'GBPJPY', bid: 188.210, ask: 188.538, spread: 0.00328, markup: 0.00060 },
  { symbol: 'GBPJPY', bid: 188.680, ask: 188.974, spread: 0.00294, markup: 0.00060 },
  { symbol: 'GBPJPY', bid: 188.920, ask: 189.228, spread: 0.00308, markup: 0.00060 },
  { symbol: 'GBPJPY', bid: 188.100, ask: 188.418, spread: 0.00318, markup: 0.00060 },
  { symbol: 'GBPJPY', bid: 188.560, ask: 188.862, spread: 0.00302, markup: 0.00060 },
  { symbol: 'EURJPY', bid: 162.340, ask: 162.625, spread: 0.00285, markup: 0.00055 },
  { symbol: 'EURJPY', bid: 162.180, ask: 162.478, spread: 0.00298, markup: 0.00055 },
  { symbol: 'EURJPY', bid: 162.510, ask: 162.782, spread: 0.00272, markup: 0.00055 },
  { symbol: 'EURJPY', bid: 162.720, ask: 162.998, spread: 0.00278, markup: 0.00055 },
  { symbol: 'EURJPY', bid: 162.050, ask: 162.338, spread: 0.00288, markup: 0.00055 },
  { symbol: 'EURJPY', bid: 162.430, ask: 162.712, spread: 0.00282, markup: 0.00055 },
  { symbol: 'AUDUSD', bid: 0.65120, ask: 0.65254, spread: 0.00134, markup: 0.00025 },
  { symbol: 'AUDUSD', bid: 0.65080, ask: 0.65222, spread: 0.00142, markup: 0.00025 },
  { symbol: 'AUDUSD', bid: 0.65190, ask: 0.65316, spread: 0.00126, markup: 0.00025 },
  { symbol: 'AUDUSD', bid: 0.65240, ask: 0.65372, spread: 0.00132, markup: 0.00025 },
  { symbol: 'AUDUSD', bid: 0.65050, ask: 0.65188, spread: 0.00138, markup: 0.00025 },
  { symbol: 'AUDUSD', bid: 0.65310, ask: 0.65440, spread: 0.00130, markup: 0.00025 },
  { symbol: 'USDCHF', bid: 0.89420, ask: 0.89522, spread: 0.00102, markup: 0.00022 },
  { symbol: 'USDCHF', bid: 0.89380, ask: 0.89490, spread: 0.00110, markup: 0.00022 },
  { symbol: 'USDCHF', bid: 0.89460, ask: 0.89562, spread: 0.00102, markup: 0.00022 },
  { symbol: 'USDCHF', bid: 0.89340, ask: 0.89448, spread: 0.00108, markup: 0.00022 },
  { symbol: 'USDCHF', bid: 0.89500, ask: 0.89604, spread: 0.00104, markup: 0.00022 },
  { symbol: 'USDCHF', bid: 0.89290, ask: 0.89398, spread: 0.00108, markup: 0.00022 },
  { symbol: 'NZDUSD', bid: 0.60340, ask: 0.60518, spread: 0.00178, markup: 0.00035 },
  { symbol: 'NZDUSD', bid: 0.60280, ask: 0.60466, spread: 0.00186, markup: 0.00035 },
  { symbol: 'NZDUSD', bid: 0.60410, ask: 0.60588, spread: 0.00178, markup: 0.00035 },
  { symbol: 'NZDUSD', bid: 0.60180, ask: 0.60364, spread: 0.00184, markup: 0.00035 },
  { symbol: 'NZDUSD', bid: 0.60490, ask: 0.60668, spread: 0.00178, markup: 0.00035 },
  { symbol: 'NZDUSD', bid: 0.60220, ask: 0.60404, spread: 0.00184, markup: 0.00035 },
]

// lp_raw_quote：5 个 LP × 4 个品种，共 20 行
const RAW_LP_RAW_QUOTE = [
  { lp_id: 'LP_CITI', symbol: 'EURUSD', bid: 1.08318, ask: 1.08356, volume: 5000000 },
  { lp_id: 'LP_CITI', symbol: 'GBPUSD', bid: 1.27348, ask: 1.27392, volume: 3000000 },
  { lp_id: 'LP_CITI', symbol: 'USDJPY', bid: 149.830, ask: 149.878, volume: 8000000 },
  { lp_id: 'LP_CITI', symbol: 'EURJPY', bid: 162.348, ask: 162.396, volume: 4000000 },
  { lp_id: 'LP_BARC', symbol: 'EURUSD', bid: 1.08310, ask: 1.08352, volume: 4000000 },
  { lp_id: 'LP_BARC', symbol: 'GBPUSD', bid: 1.27335, ask: 1.27382, volume: 2500000 },
  { lp_id: 'LP_BARC', symbol: 'USDJPY', bid: 149.815, ask: 149.868, volume: 6000000 },
  { lp_id: 'LP_BARC', symbol: 'EURJPY', bid: 162.330, ask: 162.385, volume: 3500000 },
  { lp_id: 'LP_DEUT', symbol: 'EURUSD', bid: 1.08305, ask: 1.08351, volume: 3500000 },
  { lp_id: 'LP_DEUT', symbol: 'GBPUSD', bid: 1.27320, ask: 1.27372, volume: 2000000 },
  { lp_id: 'LP_DEUT', symbol: 'USDJPY', bid: 149.808, ask: 149.862, volume: 4500000 },
  { lp_id: 'LP_DEUT', symbol: 'GBPJPY', bid: 188.440, ask: 188.508, volume: 2000000 },
  { lp_id: 'LP_HSBC', symbol: 'EURUSD', bid: 1.08298, ask: 1.08348, volume: 3000000 },
  { lp_id: 'LP_HSBC', symbol: 'USDJPY', bid: 149.800, ask: 149.858, volume: 5000000 },
  { lp_id: 'LP_HSBC', symbol: 'AUDUSD', bid: 0.65115, ask: 0.65162, volume: 2500000 },
  { lp_id: 'LP_HSBC', symbol: 'GBPJPY', bid: 188.428, ask: 188.502, volume: 1800000 },
  { lp_id: 'LP_MUFG', symbol: 'USDJPY', bid: 149.790, ask: 149.852, volume: 7000000 },
  { lp_id: 'LP_MUFG', symbol: 'EURJPY', bid: 162.315, ask: 162.378, volume: 4000000 },
  { lp_id: 'LP_MUFG', symbol: 'GBPJPY', bid: 188.420, ask: 188.498, volume: 3000000 },
  { lp_id: 'LP_MUFG', symbol: 'AUDUSD', bid: 0.65108, ask: 0.65158, volume: 2200000 },
]

// account_position：8 个账户，每个账户 2-3 个持仓
const RAW_ACCOUNT_POSITION = [
  { account_id: 'ACC_0042', symbol: 'GBPUSD', volume: -2.50, open_price: 1.27340, unrealized_pnl: -3842.50 },
  { account_id: 'ACC_0042', symbol: 'EURUSD', volume:  1.00, open_price: 1.08200, unrealized_pnl:   112.00 },
  { account_id: 'ACC_0042', symbol: 'USDJPY', volume:  2.00, open_price: 149.500, unrealized_pnl:   640.00 },
  { account_id: 'ACC_0017', symbol: 'USDJPY', volume:  5.00, open_price: 149.820, unrealized_pnl: -2910.00 },
  { account_id: 'ACC_0017', symbol: 'GBPJPY', volume:  2.00, open_price: 188.100, unrealized_pnl:   700.00 },
  { account_id: 'ACC_0089', symbol: 'EURUSD', volume: -1.00, open_price: 1.08920, unrealized_pnl: -1540.00 },
  { account_id: 'ACC_0089', symbol: 'AUDUSD', volume:  3.00, open_price: 0.64800, unrealized_pnl:   960.00 },
  { account_id: 'ACC_0089', symbol: 'NZDUSD', volume:  2.00, open_price: 0.59800, unrealized_pnl:  1080.00 },
  { account_id: 'ACC_0031', symbol: 'GBPJPY', volume:  3.00, open_price: 188.450, unrealized_pnl:  1280.00 },
  { account_id: 'ACC_0031', symbol: 'USDJPY', volume: -1.50, open_price: 150.200, unrealized_pnl:   570.00 },
  { account_id: 'ACC_0055', symbol: 'EURJPY', volume: -2.00, open_price: 162.340, unrealized_pnl:  2150.00 },
  { account_id: 'ACC_0055', symbol: 'EURUSD', volume:  2.50, open_price: 1.07900, unrealized_pnl:  1055.00 },
  { account_id: 'ACC_0073', symbol: 'AUDUSD', volume:  4.00, open_price: 0.65120, unrealized_pnl:  3620.00 },
  { account_id: 'ACC_0073', symbol: 'GBPUSD', volume:  1.00, open_price: 1.27100, unrealized_pnl:   240.00 },
  { account_id: 'ACC_0008', symbol: 'NZDUSD', volume:  2.00, open_price: 0.60100, unrealized_pnl:   480.00 },
  { account_id: 'ACC_0008', symbol: 'USDCHF', volume: -1.00, open_price: 0.89600, unrealized_pnl:   178.00 },
  { account_id: 'ACC_0061', symbol: 'EURUSD', volume:  3.00, open_price: 1.08050, unrealized_pnl:   756.00 },
  { account_id: 'ACC_0061', symbol: 'GBPJPY', volume: -1.00, open_price: 189.200, unrealized_pnl:   438.00 },
]

// spread_metrics：每个品种 8 条时间窗口记录（模拟时序聚合）
const RAW_SPREAD_METRICS = [
  { symbol: 'EURUSD', avg_spread: 0.00089, min_spread: 0.00050, max_spread: 0.00160 },
  { symbol: 'EURUSD', avg_spread: 0.00092, min_spread: 0.00055, max_spread: 0.00168 },
  { symbol: 'EURUSD', avg_spread: 0.00085, min_spread: 0.00048, max_spread: 0.00152 },
  { symbol: 'GBPUSD', avg_spread: 0.00156, min_spread: 0.00090, max_spread: 0.00280 },
  { symbol: 'GBPUSD', avg_spread: 0.00162, min_spread: 0.00095, max_spread: 0.00295 },
  { symbol: 'GBPUSD', avg_spread: 0.00148, min_spread: 0.00085, max_spread: 0.00268 },
  { symbol: 'USDJPY', avg_spread: 0.00198, min_spread: 0.00120, max_spread: 0.00340 },
  { symbol: 'USDJPY', avg_spread: 0.00205, min_spread: 0.00128, max_spread: 0.00358 },
  { symbol: 'USDJPY', avg_spread: 0.00188, min_spread: 0.00112, max_spread: 0.00322 },
  { symbol: 'GBPJPY', avg_spread: 0.00312, min_spread: 0.00180, max_spread: 0.00520 },
  { symbol: 'GBPJPY', avg_spread: 0.00325, min_spread: 0.00192, max_spread: 0.00548 },
  { symbol: 'GBPJPY', avg_spread: 0.00298, min_spread: 0.00168, max_spread: 0.00492 },
  { symbol: 'EURJPY', avg_spread: 0.00285, min_spread: 0.00160, max_spread: 0.00480 },
  { symbol: 'EURJPY', avg_spread: 0.00292, min_spread: 0.00168, max_spread: 0.00498 },
  { symbol: 'AUDUSD', avg_spread: 0.00134, min_spread: 0.00080, max_spread: 0.00240 },
  { symbol: 'AUDUSD', avg_spread: 0.00140, min_spread: 0.00085, max_spread: 0.00252 },
  { symbol: 'USDCHF', avg_spread: 0.00102, min_spread: 0.00060, max_spread: 0.00190 },
  { symbol: 'USDCHF', avg_spread: 0.00108, min_spread: 0.00065, max_spread: 0.00198 },
  { symbol: 'NZDUSD', avg_spread: 0.00178, min_spread: 0.00100, max_spread: 0.00310 },
  { symbol: 'NZDUSD', avg_spread: 0.00185, min_spread: 0.00108, max_spread: 0.00325 },
]

// execution_report：6 个客户，每个客户 3-4 笔成交
const RAW_EXECUTION_REPORT = [
  { client_id: 'CLI_001', symbol: 'EURUSD', side: 'BUY',  volume: 1.00, exec_price: 1.08401 },
  { client_id: 'CLI_001', symbol: 'GBPUSD', side: 'SELL', volume: 0.50, exec_price: 1.27496 },
  { client_id: 'CLI_001', symbol: 'USDJPY', side: 'SELL', volume: 1.00, exec_price: 149.820 },
  { client_id: 'CLI_001', symbol: 'AUDUSD', side: 'BUY',  volume: 2.00, exec_price: 0.65254 },
  { client_id: 'CLI_002', symbol: 'USDJPY', side: 'BUY',  volume: 2.00, exec_price: 150.018 },
  { client_id: 'CLI_002', symbol: 'EURUSD', side: 'BUY',  volume: 1.50, exec_price: 1.08391 },
  { client_id: 'CLI_002', symbol: 'NZDUSD', side: 'BUY',  volume: 2.00, exec_price: 0.60518 },
  { client_id: 'CLI_003', symbol: 'GBPJPY', side: 'SELL', volume: 1.00, exec_price: 188.762 },
  { client_id: 'CLI_003', symbol: 'EURJPY', side: 'BUY',  volume: 2.00, exec_price: 162.625 },
  { client_id: 'CLI_003', symbol: 'GBPUSD', side: 'BUY',  volume: 1.50, exec_price: 1.27340 },
  { client_id: 'CLI_004', symbol: 'AUDUSD', side: 'BUY',  volume: 3.00, exec_price: 0.65254 },
  { client_id: 'CLI_004', symbol: 'USDCHF', side: 'SELL', volume: 1.00, exec_price: 0.89522 },
  { client_id: 'CLI_004', symbol: 'EURUSD', side: 'SELL', volume: 1.00, exec_price: 1.08312 },
  { client_id: 'CLI_005', symbol: 'EURUSD', side: 'SELL', volume: 2.00, exec_price: 1.08312 },
  { client_id: 'CLI_005', symbol: 'GBPUSD', side: 'BUY',  volume: 1.00, exec_price: 1.27340 },
  { client_id: 'CLI_005', symbol: 'USDJPY', side: 'BUY',  volume: 3.00, exec_price: 149.958 },
  { client_id: 'CLI_006', symbol: 'EURUSD', side: 'BUY',  volume: 0.50, exec_price: 1.08418 },
  { client_id: 'CLI_006', symbol: 'GBPJPY', side: 'BUY',  volume: 1.50, exec_price: 188.538 },
  { client_id: 'CLI_006', symbol: 'EURJPY', side: 'SELL', volume: 1.00, exec_price: 162.782 },
]

const RAW_DATA: Record<string, Record<string, string | number>[]> = {
  execution_ladder:  RAW_EXECUTION_LADDER,
  lp_raw_quote:      RAW_LP_RAW_QUOTE,
  account_position:  RAW_ACCOUNT_POSITION,
  spread_metrics:    RAW_SPREAD_METRICS,
  execution_report:  RAW_EXECUTION_REPORT,
}

// ── 内存聚合引擎 ──────────────────────────────────────────────────────────────
function aggregate(
  rows: Record<string, string | number>[],
  dimensions: string[],
  metrics: { field: string; agg: string }[],
): Record<string, string | number>[] {
  if (rows.length === 0) return []

  // 无维度：全表聚合
  if (dimensions.length === 0) {
    const row: Record<string, string | number> = {}
    metrics.forEach(m => {
      const vals = rows.map(r => Number(r[m.field] ?? 0)).filter(v => !isNaN(v))
      const key = `${m.agg.toLowerCase()}_${m.field}`
      if (m.agg === 'COUNT') row[key] = rows.length
      else if (m.agg === 'SUM') row[key] = vals.reduce((a, b) => a + b, 0)
      else if (m.agg === 'AVG') row[key] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
      else if (m.agg === 'MIN') row[key] = Math.min(...vals)
      else if (m.agg === 'MAX') row[key] = Math.max(...vals)
    })
    return [row]
  }

  // 按维度分组
  const groups = new Map<string, Record<string, string | number>[]>()
  rows.forEach(r => {
    const key = dimensions.map(d => r[d] ?? '').join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  })

  return Array.from(groups.entries()).map(([, groupRows]) => {
    const row: Record<string, string | number> = {}
    // 填维度值
    dimensions.forEach(d => { row[d] = groupRows[0][d] ?? '' })
    // 计算指标
    metrics.forEach(m => {
      const vals = groupRows.map(r => Number(r[m.field] ?? 0)).filter(v => !isNaN(v))
      const key = `${m.agg.toLowerCase()}_${m.field}`
      if (m.agg === 'COUNT') row[key] = groupRows.length
      else if (m.agg === 'SUM') row[key] = +vals.reduce((a, b) => a + b, 0).toFixed(6)
      else if (m.agg === 'AVG') row[key] = +(vals.reduce((a, b) => a + b, 0) / (vals.length || 1)).toFixed(6)
      else if (m.agg === 'MIN') row[key] = +Math.min(...vals).toFixed(6)
      else if (m.agg === 'MAX') row[key] = +Math.max(...vals).toFixed(6)
    })
    return row
  })
}

function runMockQuery(
  dataset: string,
  dimensions: string[],
  metrics: { field: string; agg: string }[],
  _filters: FilterItem[],
): Record<string, string | number>[] {
  const rows = RAW_DATA[dataset] ?? []
  return aggregate(rows, dimensions, metrics)
}

// ── 类型 ──────────────────────────────────────────────────────────────────────
interface FilterItem {
  id: string
  field: string
  op: string
  value: string
}

type ChartType = 'table' | 'bar' | 'line'

// ── 子组件：配置区块 ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </Text>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function QueryBuilderPage() {
  const [dataset, setDataset]     = useState<string>('execution_ladder')
  const [dimensions, setDimensions] = useState<string[]>(['symbol'])
  const [metrics, setMetrics]     = useState<{ field: string; agg: string }[]>([
    { field: 'spread', agg: 'AVG' },
  ])
  const [filters, setFilters]     = useState<FilterItem[]>([
    { id: '1', field: 'created_at', op: '过去 24 小时', value: '' },
  ])
  const [chartType, setChartType] = useState<ChartType>('table')
  const [result, setResult]       = useState<Record<string, string | number>[] | null>(null)
  const [running, setRunning]     = useState(false)

  const ds = useMemo(() => DATASETS.find(d => d.name === dataset)!, [dataset])

  const dimFields = ds.fields.filter(f => f.dataType === 'varchar')
  const metricFields = ds.fields.filter(f => f.dataType === 'decimal')

  const addDimension = (field: string) => {
    if (!dimensions.includes(field)) setDimensions(prev => [...prev, field])
  }
  const removeDimension = (field: string) => setDimensions(prev => prev.filter(d => d !== field))

  const addMetric = (field: string) => {
    if (!metrics.find(m => m.field === field)) setMetrics(prev => [...prev, { field, agg: 'AVG' }])
  }
  const removeMetric = (field: string) => setMetrics(prev => prev.filter(m => m.field !== field))
  const updateMetricAgg = (field: string, agg: string) =>
    setMetrics(prev => prev.map(m => m.field === field ? { ...m, agg } : m))

  const addFilter = () => {
    const field = ds.fields[0].name
    const ops = FILTER_OPS[ds.fields[0].dataType] ?? ['=']
    setFilters(prev => [...prev, { id: Date.now().toString(), field, op: ops[0], value: '' }])
  }
  const removeFilter = (id: string) => setFilters(prev => prev.filter(f => f.id !== id))
  const updateFilter = (id: string, patch: Partial<FilterItem>) =>
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  const runQuery = async () => {
    if (!dataset || metrics.length === 0) return
    setRunning(true)
    await new Promise(r => setTimeout(r, 600))
    setResult(runMockQuery(dataset, dimensions, metrics, filters))
    setRunning(false)
  }

  // 生成 SQL 预览
  const sqlPreview = useMemo(() => {
    if (!dataset || metrics.length === 0) return ''
    const selects = [
      ...dimensions,
      ...metrics.map(m => `${m.agg}(${m.field}) AS ${m.agg.toLowerCase()}_${m.field}`),
    ].join(',\n       ')
    const where = filters.length
      ? '\nWHERE  ' + filters.map(f =>
          f.op.startsWith('过去') ? `${f.field} >= NOW() - INTERVAL '${f.op.replace('过去 ', '')}'`
          : `${f.field} ${f.op} '${f.value || '?'}'`
        ).join('\n   AND ')
      : ''
    const groupBy = dimensions.length ? `\nGROUP BY ${dimensions.join(', ')}` : ''
    return `SELECT ${selects}\nFROM   ${dataset}${where}${groupBy}`
  }, [dataset, dimensions, metrics, filters])

  // 图表数据 key 从实际结果推导，避免 metrics state 变化导致 key 不匹配
  const resultKeys = result ? Object.keys(result[0]) : []
  const dimKeys = dimensions.filter(d => resultKeys.includes(d))
  const metricKeys = resultKeys.filter(k => !dimensions.includes(k))
  const xKey = dimKeys[0] ?? metricKeys[0] ?? ''

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(600)
  useEffect(() => {
    if (!chartContainerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setChartWidth(w - 48)
    })
    ro.observe(chartContainerRef.current)
    return () => ro.disconnect()
  }, [])

  const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1']

  // Y 轴数值格式化：自动选择合适精度
  const formatYAxis = (v: number) => {
    if (Math.abs(v) === 0) return '0'
    if (Math.abs(v) < 0.01) return v.toExponential(2)
    if (Math.abs(v) < 1) return v.toPrecision(3)
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(2).replace(/\.?0+$/, '')
  }

  // Tooltip 数值格式化
  const formatTooltip = (v: number | string) => {
    if (typeof v !== 'number') return v
    if (Math.abs(v) < 0.001) return v.toExponential(4)
    return v.toFixed(6).replace(/\.?0+$/, '')
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* 顶部栏 */}
      <div style={{
        padding: '8px 16px', background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <FunctionOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        <Text strong style={{ fontSize: 14 }}>查询构建器</Text>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button
            size="small" icon={<SaveOutlined />}
            disabled={!result}
            onClick={() => {
              if (!result) return
              const cols = Object.keys(result[0]).filter(k => k !== '_key')
              saveToDashboard({
                title: `${ds.displayName} — ${metrics.map(m => `${m.agg}(${m.field})`).join(', ')}`,
                sql: sqlPreview,
                chartType,
                columns: cols,
                rows: result.map(r => cols.map(c => r[c])),
                source: 'query',
              })
              message.success('已保存到看板')
            }}
          >
            保存到看板
          </Button>
          <Button
            type="primary" size="small"
            icon={<PlayCircleOutlined />}
            loading={running}
            onClick={runQuery}
            disabled={metrics.length === 0}
          >
            执行查询
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧配置面板 */}
        <div style={{
          width: 300, flexShrink: 0,
          background: '#fff', borderRight: '1px solid #f0f0f0',
          overflowY: 'auto', padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>

          {/* 数据集 */}
          <div>
            <SectionLabel>数据集</SectionLabel>
            <Select
              value={dataset}
              style={{ width: '100%', marginTop: 8 }}
              onChange={val => {
                setDataset(val)
                setDimensions([])
                setMetrics([])
                setFilters([])
                setResult(null)
              }}
              options={DATASETS.map(d => ({ value: d.name, label: d.displayName }))}
            />
          </div>

          <Divider style={{ margin: 0 }} />

          {/* 维度 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SectionLabel>维度 (Group By)</SectionLabel>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {dimensions.map(d => (
                <Tag key={d} closable onClose={() => removeDimension(d)}
                  style={{ fontSize: 12, padding: '2px 8px' }}>
                  {d}
                </Tag>
              ))}
            </div>
            <Select
              placeholder="+ 添加维度"
              style={{ width: '100%' }}
              size="small"
              value={null}
              onChange={addDimension}
              options={dimFields
                .filter(f => !dimensions.includes(f.name))
                .map(f => ({ value: f.name, label: f.name }))}
            />
          </div>

          <Divider style={{ margin: 0 }} />

          {/* 指标 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SectionLabel>指标 (Aggregation)</SectionLabel>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {metrics.map(m => (
                <div key={m.field} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#f8fafc', borderRadius: 6, padding: '4px 8px',
                  border: '1px solid #e2e8f0',
                }}>
                  <Select
                    value={m.agg}
                    size="small"
                    style={{ width: 72 }}
                    onChange={agg => updateMetricAgg(m.field, agg)}
                    options={AGG_FUNCTIONS.map(a => ({ value: a, label: a }))}
                  />
                  <Text style={{ fontSize: 12, flex: 1 }}>{m.field}</Text>
                  <CloseOutlined
                    style={{ fontSize: 10, color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => removeMetric(m.field)}
                  />
                </div>
              ))}
            </div>
            <Select
              placeholder="+ 添加指标"
              style={{ width: '100%' }}
              size="small"
              value={null}
              onChange={addMetric}
              options={metricFields
                .filter(f => !metrics.find(m => m.field === f.name))
                .map(f => ({ value: f.name, label: f.name }))}
            />
          </div>

          <Divider style={{ margin: 0 }} />

          {/* 过滤条件 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SectionLabel>过滤条件</SectionLabel>
              <Button size="small" type="text" icon={<PlusOutlined />} onClick={addFilter}
                style={{ fontSize: 11, color: '#1677ff', padding: '0 4px' }}>
                添加
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filters.map(f => {
                const fieldDef = ds.fields.find(fd => fd.name === f.field)
                const ops = FILTER_OPS[fieldDef?.dataType ?? 'varchar'] ?? ['=']
                return (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Select
                        value={f.field}
                        size="small"
                        style={{ flex: 1 }}
                        onChange={field => {
                          const newDef = ds.fields.find(fd => fd.name === field)
                          const newOps = FILTER_OPS[newDef?.dataType ?? 'varchar'] ?? ['=']
                          updateFilter(f.id, { field, op: newOps[0], value: '' })
                        }}
                        options={ds.fields.map(fd => ({ value: fd.name, label: fd.name }))}
                      />
                      <CloseOutlined
                        style={{ fontSize: 10, color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => removeFilter(f.id)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Select
                        value={f.op}
                        size="small"
                        style={{ width: 110 }}
                        onChange={op => updateFilter(f.id, { op })}
                        options={ops.map(o => ({ value: o, label: o }))}
                      />
                      {!f.op.startsWith('过去') && (
                        <input
                          value={f.value}
                          onChange={e => updateFilter(f.id, { value: e.target.value })}
                          placeholder="值"
                          style={{
                            flex: 1, border: '1px solid #d9d9d9', borderRadius: 6,
                            padding: '1px 8px', fontSize: 12, outline: 'none',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* SQL 预览 */}
          {sqlPreview && (
            <div>
              <SectionLabel>SQL 预览</SectionLabel>
              <pre style={{
                marginTop: 8, padding: '10px 12px',
                background: '#1e293b', color: '#94a3b8',
                borderRadius: 6, fontSize: 10, lineHeight: 1.7,
                overflowX: 'auto', whiteSpace: 'pre-wrap',
                fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
              }}>
                {sqlPreview}
              </pre>
            </div>
          )}
        </div>

        {/* 右侧结果区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 图表类型切换 */}
          {result && (
            <div style={{
              padding: '8px 16px', background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Text style={{ fontSize: 12, color: '#64748b' }}>
                {result.length} 行结果
              </Text>
              <Radio.Group
                value={chartType}
                onChange={e => setChartType(e.target.value)}
                size="small"
                style={{ marginLeft: 'auto' }}
              >
                <Tooltip title="表格">
                  <Radio.Button value="table"><TableOutlined /></Radio.Button>
                </Tooltip>
                <Tooltip title="柱状图">
                  <Radio.Button value="bar"><BarChartOutlined /></Radio.Button>
                </Tooltip>
                <Tooltip title="折线图">
                  <Radio.Button value="line"><LineChartOutlined /></Radio.Button>
                </Tooltip>
              </Radio.Group>
            </div>
          )}

          <div ref={chartContainerRef} style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            {!result && !running && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                  description={
                    <div style={{ textAlign: 'center' }}>
                      <div>配置左侧条件后点击「执行查询」</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        选择数据集 → 添加维度和指标 → 设置过滤条件
                      </Text>
                    </div>
                  }
                >
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={runQuery}
                    disabled={metrics.length === 0}>
                    执行查询
                  </Button>
                </Empty>
              </div>
            )}

            {running && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                  <Text type="secondary">查询执行中...</Text>
                </div>
              </div>
            )}

            {result && !running && (
              <>
                {/* 表格视图 */}
                {chartType === 'table' && (
                  <Table
                    dataSource={result.map((r, i) => ({ ...r, _key: i }))}
                    rowKey="_key"
                    size="small"
                    pagination={false}
                    columns={Object.keys(result[0]).filter(k => k !== '_key').map(k => ({
                      title: k,
                      dataIndex: k,
                      key: k,
                      render: (v: string | number) => (
                        <span style={{
                          fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
                          fontSize: 12,
                          color: typeof v === 'number' && v < 0 ? '#ef4444'
                               : typeof v === 'number' && v > 0 ? '#16a34a' : undefined,
                        }}>
                          {typeof v === 'number' ? v.toFixed(5).replace(/\.?0+$/, '') : v}
                        </span>
                      ),
                    }))}
                    style={{ background: '#fff', borderRadius: 8 }}
                  />
                )}

                {/* 柱状图 */}
                {chartType === 'bar' && (
                  <div style={{ background: '#fff', borderRadius: 10, padding: '24px 16px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <BarChart width={chartWidth} height={400} data={result}
                      margin={{ top: 12, right: 32, left: 8, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey={xKey}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
                        angle={result.length > 6 ? -30 : 0}
                        textAnchor={result.length > 6 ? 'end' : 'middle'}
                        height={result.length > 6 ? 56 : 32}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                        tickFormatter={formatYAxis}
                      />
                      <RTooltip
                        formatter={formatTooltip}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      {metricKeys.map((k, i) => (
                        <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
                      ))}
                    </BarChart>
                  </div>
                )}

                {/* 折线图 */}
                {chartType === 'line' && (
                  <div style={{ background: '#fff', borderRadius: 10, padding: '24px 16px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <LineChart width={chartWidth} height={400} data={result}
                      margin={{ top: 12, right: 32, left: 8, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey={xKey}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
                        angle={result.length > 6 ? -30 : 0}
                        textAnchor={result.length > 6 ? 'end' : 'middle'}
                        height={result.length > 6 ? 56 : 32}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                        tickFormatter={formatYAxis}
                      />
                      <RTooltip
                        formatter={formatTooltip}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      {metricKeys.map((k, i) => (
                        <Line key={k} type="monotone" dataKey={k}
                          stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                          dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 7, strokeWidth: 0 }} />
                      ))}
                    </LineChart>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
