import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Input, Tag, Space, Typography, Badge, Tooltip,
  Checkbox, Divider, List, Spin, Empty,
} from 'antd'
import {
  DatabaseOutlined, SearchOutlined,
  UserOutlined, FilterOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { DatasetEntity } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

const PLATFORM_COLOR: Record<string, string> = {
  postgresql: 'blue', timescaledb: 'geekblue', redis: 'red',
  s3: 'orange', file: 'orange', mq: 'purple',
  reuters: 'magenta', bloomberg: 'magenta', grpc: 'cyan',
}

const DOMAIN_COLOR: Record<string, string> = {
  Trading: 'blue', Market: 'green', Risk: 'red', System: 'default',
}

const ENV_COLOR: Record<string, string> = {
  prod: 'green', uat: 'orange', dev: 'default',
}

// ── 左侧过滤面板 ──────────────────────────────────────────────────────────────
function FilterSection({
  title, options, selected, onChange,
}: {
  title: string
  options: Array<{ value: string; label: string; count: number }>
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Text strong style={{ fontSize: 12, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Text>
      <div style={{ marginTop: 8 }}>
        {options.map(opt => (
          <div
            key={opt.value}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '3px 0', cursor: 'pointer',
            }}
            onClick={() => {
              const next = selected.includes(opt.value)
                ? selected.filter(v => v !== opt.value)
                : [...selected, opt.value]
              onChange(next)
            }}
          >
            <Space size={6}>
              <Checkbox checked={selected.includes(opt.value)} />
              <Text style={{ fontSize: 13 }}>{opt.label}</Text>
            </Space>
            <Badge
              count={opt.count}
              color={selected.includes(opt.value) ? '#1677ff' : '#d9d9d9'}
              style={{ fontSize: 10 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 单条数据集结果 ─────────────────────────────────────────────────────────────
function DatasetItem({ dataset, onClick }: { dataset: DatasetEntity; onClick: () => void }) {
  return (
    <List.Item
      style={{
        display: 'block',
        padding: '14px 16px',
        background: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        cursor: 'pointer',
        border: '1px solid #f0f0f0',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      onClick={onClick}
    >
      {/* 行1：图标 + 名称 + displayName + 描述 + tags + version */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <DatabaseOutlined style={{ color: '#1677ff', fontSize: 15, flexShrink: 0 }} />
        <Text strong style={{ fontSize: 14, color: '#1677ff' }}>{dataset.name}</Text>
        {dataset.displayName && dataset.displayName !== dataset.name && (
          <Text type="secondary" style={{ fontSize: 12 }}>{dataset.displayName}</Text>
        )}
        {dataset.description && (
          <Text type="secondary" ellipsis style={{ fontSize: 12, flex: 1, minWidth: 0 }}>
            — {dataset.description}
          </Text>
        )}
        <div style={{ flexShrink: 0 }} />
        {dataset.tags?.map(t => (
          <Tag key={t} style={{ fontSize: 10, margin: 0, color: '#8c8c8c', borderColor: '#d9d9d9', background: '#fafafa' }}>{t}</Tag>
        ))}
        <Badge count={`v${dataset.currentVersion}`} color="geekblue" style={{ fontSize: 10, flexShrink: 0 }} />
      </div>

      {/* 行2：技术定位 ｜ 业务属性 ｜ 归属 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 23, flexWrap: 'wrap' }}>

        {/* ── 技术定位 ── */}
        <Tag color={PLATFORM_COLOR[dataset.platform] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
          {dataset.platform}
        </Tag>
        {(dataset.instanceName || dataset.containerName) && (
          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
            {[dataset.instanceName, dataset.containerName].filter(Boolean).join(' · ')}
          </Text>
        )}

        {/* ── 分隔 ── */}
        {dataset.domainName && <Divider type="vertical" style={{ margin: '0 2px', borderColor: '#e0e0e0' }} />}

        {/* ── 业务属性 ── */}
        {dataset.domainName && (
          <Tag color={DOMAIN_COLOR[dataset.domainName] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
            {dataset.domainName}
          </Tag>
        )}

        {/* ── 推到右侧 ── */}
        <div style={{ flex: 1 }} />

        {/* 新鲜度 / 记录数 / 大小 */}
        {dataset.freshness && (
          <Tooltip title={[
            dataset.frequency && `频率：${dataset.frequency}`,
            dataset.retention   && `保留期：${dataset.retention}`,
          ].filter(Boolean).join('　|　')}>
            <Tag color={{ realtime: 'green', 'minute': 'cyan', daily: 'orange', 'request': 'default' }[dataset.freshness] ?? 'default'}
              style={{ fontSize: 11, margin: 0, cursor: 'default' }}>
              新鲜度: {dataset.freshness}
            </Tag>
          </Tooltip>
        )}
        {dataset.rowCount != null && (
          <Tag style={{ fontSize: 11, margin: 0, color: '#595959', borderColor: '#d9d9d9', background: '#fafafa' }}>
            记录数: {dataset.rowCount >= 1_000_000
              ? `${(dataset.rowCount / 1_000_000).toFixed(0)}M`
              : dataset.rowCount >= 1_000
              ? `${(dataset.rowCount / 1_000).toFixed(0)}K`
              : dataset.rowCount}
          </Tag>
        )}
        {dataset.sizeBytes != null && (
          <Tag style={{ fontSize: 11, margin: 0, color: '#595959', borderColor: '#d9d9d9', background: '#fafafa' }}>
            大小: {formatSize(dataset.sizeBytes)}
          </Tag>
        )}

        {/* 归属 */}
        {(dataset.team || dataset.owner) && (
          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, marginLeft: 4 }}>
            <UserOutlined style={{ marginRight: 3, fontSize: 10 }} />
            {[dataset.team, dataset.owner]
              .filter(Boolean)
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .join(' / ')}
          </Text>
        )}
      </div>
    </List.Item>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function DatasetList() {
  const navigate = useNavigate()
  const [search, setSearch]               = useState('')
  const [domainFilter, setDomainFilter]   = useState<string[]>([])
  const [platformFilter, setPlatformFilter] = useState<string[]>([])
  const [envFilter, setEnvFilter]         = useState<string[]>([])

  const { data: stats }     = useQuery({ queryKey: ['datasetStats'],          queryFn: () => ontologyApi.getDatasetStats() })
  const { data: platforms } = useQuery({ queryKey: ['dimensions', 'platform'], queryFn: () => ontologyApi.getClassifierValues('platform') })
  const { data: domains }   = useQuery({ queryKey: ['domains'],                queryFn: () => ontologyApi.getDomains() })

  // 每次过滤条件变化都重新请求（多选用第一个值，后端接入后改为数组传参）
  const { data, isLoading } = useQuery({
    queryKey: ['datasets', domainFilter, platformFilter, envFilter, search],
    queryFn: async () => {
      // 多选：分别请求再合并去重（mock 阶段简化处理）
      if (domainFilter.length === 0 && platformFilter.length === 0 && envFilter.length === 0 && !search) {
        return ontologyApi.getDatasets({ query: search || undefined })
      }
      const results = await ontologyApi.getDatasets({ query: search || undefined })
      let items = results.items
      if (domainFilter.length > 0)   items = items.filter(d => d.domainName   && domainFilter.includes(d.domainName))
      if (platformFilter.length > 0) items = items.filter(d => platformFilter.includes(d.platform))
      if (envFilter.length > 0)      items = items.filter(d => envFilter.includes(d.env))
      return { ...results, items, total: items.length }
    },
  })

  const datasets = data?.items ?? []
  const total    = data?.total ?? 0

  // 过滤选项（带全量计数）
  const domainOptions = Object.entries(stats?.byDomain ?? {}).map(([k, v]) => ({
    value: k, label: k, count: v,
  }))
  const platformOptions = (platforms ?? [])
    .filter(p => p.status === 1 && (stats?.byPlatform ?? {})[p.name])
    .map(p => ({ value: p.name, label: p.displayName, count: (stats?.byPlatform ?? {})[p.name] ?? 0 }))
  const envOptions = [
    { value: 'prod', label: 'prod', count: (data?.items ?? []).filter(d => d.env === 'prod').length || (stats?.total ?? 0) },
    { value: 'uat',  label: 'uat',  count: 0 },
    { value: 'dev',  label: 'dev',  count: 0 },
  ].filter(e => e.count > 0 || e.value === 'prod')

  const hasFilter = domainFilter.length > 0 || platformFilter.length > 0 || envFilter.length > 0 || !!search

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>

      {/* 左侧过滤栏 */}
      <div style={{
        width: 220, flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        padding: '20px 16px',
        overflowY: 'auto',
      }}>
        <Space style={{ marginBottom: 16 }}>
          <FilterOutlined style={{ color: '#8c8c8c' }} />
          <Text strong style={{ fontSize: 13 }}>过滤</Text>
          {hasFilter && (
            <Text
              type="secondary"
              style={{ fontSize: 12, cursor: 'pointer', color: '#1677ff' }}
              onClick={() => { setDomainFilter([]); setPlatformFilter([]); setEnvFilter([]) }}
            >
              清除
            </Text>
          )}
        </Space>

        <FilterSection
          title="域"
          options={domainOptions}
          selected={domainFilter}
          onChange={setDomainFilter}
        />
        <Divider style={{ margin: '0 0 16px' }} />
        <FilterSection
          title="平台"
          options={platformOptions}
          selected={platformFilter}
          onChange={setPlatformFilter}
        />
        <Divider style={{ margin: '0 0 16px' }} />
        <FilterSection
          title="环境"
          options={envOptions}
          selected={envFilter}
          onChange={setEnvFilter}
        />
      </div>

      {/* 右侧内容区 */}
      <div style={{ flex: 1, minWidth: 0, padding: 20, overflowY: 'auto' }}>
        {/* 搜索栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Input
            placeholder="搜索数据集名称、描述、标签..."
            prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
            style={{ flex: 1, maxWidth: 480 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            size="middle"
          />
          <Text type="secondary" style={{ fontSize: 13, flexShrink: 0 }}>
            {isLoading ? '加载中...' : `${total} 个数据集`}
          </Text>
        </div>

        {/* 已选过滤标签 */}
        {hasFilter && (
          <Space style={{ marginBottom: 12 }} wrap>
            {domainFilter.map(v => (
              <Tag key={v} closable color="blue" onClose={() => setDomainFilter(f => f.filter(x => x !== v))}>
                域: {v}
              </Tag>
            ))}
            {platformFilter.map(v => (
              <Tag key={v} closable color={PLATFORM_COLOR[v] ?? 'default'} onClose={() => setPlatformFilter(f => f.filter(x => x !== v))}>
                平台: {v}
              </Tag>
            ))}
            {envFilter.map(v => (
              <Tag key={v} closable color={ENV_COLOR[v] ?? 'default'} onClose={() => setEnvFilter(f => f.filter(x => x !== v))}>
                环境: {v}
              </Tag>
            ))}
          </Space>
        )}

        {/* 结果列表 */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
        )}
        {!isLoading && datasets.length === 0 && (
          <Empty description="没有找到匹配的数据集" style={{ marginTop: 64 }} />
        )}
        {!isLoading && datasets.length > 0 && (
          <List
            dataSource={datasets}
            renderItem={item => (
              <DatasetItem
                key={item.id}
                dataset={item}
                onClick={() => navigate(`/datasets/${item.id}`)}
              />
            )}
          />
        )}
      </div>
    </div>
  )
}
