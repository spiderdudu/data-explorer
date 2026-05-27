import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Breadcrumb, Descriptions, Tag, Space, Typography, Button,
  Tabs, Table, Spin, Alert, Divider, Card, Badge, Tooltip, Drawer,
} from 'antd'
import {
  ApartmentOutlined, ArrowLeftOutlined, DatabaseOutlined,
  TagOutlined, AppstoreAddOutlined, LockOutlined, KeyOutlined,
  ThunderboltOutlined, PartitionOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import EntityExtraPanel from '@/components/entity/EntityExtraPanel'
import FieldExtraPanel from '@/components/entity/FieldExtraPanel'
import type { OntEntityField } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatCount(n?: number): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const SENSITIVITY_COLOR: Record<string, string> = {
  public: 'default', internal: 'blue', confidential: 'orange', restricted: 'red',
}

// ── 字段 Drawer ───────────────────────────────────────────────────────────────

function FieldDrawer({ field, onClose }: { field: OntEntityField | null; onClose: () => void }) {
  if (!field) return null

  const flags = [
    field.isPk           && { icon: <KeyOutlined />,         color: '#d48806', label: 'Primary Key' },
    field.isPartitionKey && { icon: <PartitionOutlined />,   color: '#1677ff', label: '分区键' },
    field.isIndexed      && { icon: <ThunderboltOutlined />, color: '#52c41a', label: '已建索引' },
    field.isPii          && { icon: <LockOutlined />,        color: '#cf1322', label: `PII · ${field.sensitivityLevel ?? 'confidential'}` },
  ].filter(Boolean) as { icon: React.ReactNode; color: string; label: string }[]

  return (
    <Drawer
      title={
        <Space size={6}>
          <Text code style={{ fontSize: 13 }}>{field.name}</Text>
          {flags.map(f => (
            <Tooltip key={f.label} title={f.label}>
              <span style={{ color: f.color, fontSize: 13 }}>{f.icon}</span>
            </Tooltip>
          ))}
        </Space>
      }
      width={440}
      open={!!field}
      onClose={onClose}
      styles={{ body: { padding: '12px 20px', background: '#fafafa' } }}
    >
      {/* 基础信息 */}
      <Card size="small" style={{ marginBottom: 12 }}
        title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>基础信息</Text>}
        styles={{ header: { minHeight: 36, padding: '0 12px' }, body: { padding: '8px 12px' } }}
      >
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="类型" span={2}>
            <Text code style={{ fontSize: 12 }}>{field.dataType}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Nullable">
            {field.isNullable ? <Badge status="default" text="YES" /> : <Badge status="processing" text="NO" />}
          </Descriptions.Item>
          <Descriptions.Item label="默认值">
            {field.defaultValue ? <Text code style={{ fontSize: 11 }}>{field.defaultValue}</Text> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Primary Key">
            {field.isPk ? <Badge status="warning" text="是" /> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="分区键">
            {field.isPartitionKey ? <Badge status="processing" text="是" /> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="索引">
            {field.isIndexed ? <Badge status="success" text="是" /> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="敏感级别">
            {field.sensitivityLevel
              ? <Tag color={SENSITIVITY_COLOR[field.sensitivityLevel]} style={{ fontSize: 11, margin: 0 }}>{field.sensitivityLevel}</Tag>
              : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          {field.tags && field.tags.length > 0 && (
            <Descriptions.Item label="标签" span={2}>
              <Space size={2} wrap>
                {field.tags.map(t => <Tag key={t} style={{ fontSize: 10, margin: 0 }}>{t}</Tag>)}
              </Space>
            </Descriptions.Item>
          )}
          {field.description && (
            <Descriptions.Item label="描述" span={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>{field.description}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 数据质量统计 */}
      <Card size="small" style={{ marginBottom: 12 }}
        title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>数据质量统计</Text>}
        styles={{ header: { minHeight: 36, padding: '0 12px' }, body: { padding: '8px 12px' } }}
      >
        {field.statsUpdatedAt ? (
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Distinct">
              <Text style={{ fontSize: 12 }}>{formatCount(field.distinctCount)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Nulls">
              <Text style={{ fontSize: 12 }}>{formatCount(field.nullCount)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Min">
              <Text style={{ fontSize: 12 }}>{field.minValue ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Max">
              <Text style={{ fontSize: 12 }}>{field.maxValue ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Avg" span={2}>
              <Text style={{ fontSize: 12 }}>{field.avgValue ?? '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="统计时间" span={2}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {new Date(field.statsUpdatedAt).toLocaleString('zh-CN')}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>暂无统计数据</Text>
        )}
      </Card>

      {/* 自定义标注 */}
      <Card size="small"
        title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>自定义标注</Text>}
        styles={{ header: { minHeight: 36, padding: '0 12px' }, body: { padding: '8px 12px' } }}
      >
        <FieldExtraPanel fieldId={field.id} />
      </Card>
    </Drawer>
  )
}

// ── 字段表格列 ────────────────────────────────────────────────────────────────

function buildFieldColumns(onDetail: (f: OntEntityField) => void) {
  return [
    {
      title: '#',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 40,
      render: (n: number) => <Text type="secondary" style={{ fontSize: 11 }}>{n}</Text>,
    },
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, r: OntEntityField) => (
        <Space size={4}>
          <Text code style={{ fontSize: 12 }}>{name}</Text>
          {r.isPk           && <Tooltip title="Primary Key"><KeyOutlined style={{ color: '#d48806', fontSize: 11 }} /></Tooltip>}
          {r.isPartitionKey && <Tooltip title="分区键"><PartitionOutlined style={{ color: '#1677ff', fontSize: 11 }} /></Tooltip>}
          {r.isIndexed      && <Tooltip title="已建索引"><ThunderboltOutlined style={{ color: '#52c41a', fontSize: 11 }} /></Tooltip>}
          {r.isPii          && <Tooltip title={`PII · ${r.sensitivityLevel ?? 'confidential'}`}><LockOutlined style={{ color: '#cf1322', fontSize: 11 }} /></Tooltip>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 150,
      render: (t: string) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
    },
    {
      title: 'Nullable',
      dataIndex: 'isNullable',
      key: 'isNullable',
      width: 80,
      render: (v: boolean) => v
        ? <Badge status="default" text="YES" />
        : <Badge status="processing" text="NO" />,
    },
    {
      title: 'Distinct',
      dataIndex: 'distinctCount',
      key: 'distinctCount',
      width: 80,
      align: 'right' as const,
      render: (v?: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{formatCount(v)}</Text>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 160,
      render: (tags?: string[]) => tags?.length
        ? <Space size={2} wrap>{tags.map(t => <Tag key={t} style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>{t}</Tag>)}</Space>
        : null,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (d?: string) => d
        ? <Text type="secondary" style={{ fontSize: 12 }}>{d}</Text>
        : <Text style={{ fontSize: 12, color: '#d9d9d9' }}>—</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 36,
      render: (_: unknown, r: OntEntityField) => (
        <Tooltip title="详情 / 自定义标注">
          <Button
            type="text" size="small"
            icon={<InfoCircleOutlined />}
            style={{ color: '#bfbfbf' }}
            onClick={e => { e.stopPropagation(); onDetail(r) }}
          />
        </Tooltip>
      ),
    },
  ]
}

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedField, setSelectedField] = useState<OntEntityField | null>(null)

  const { data: dataset, isLoading, isError } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => ontologyApi.getDataset(Number(id)),
    enabled: !!id,
  })

  const { data: fields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['entityFields', id],
    queryFn: () => ontologyApi.getEntityFields(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>
  if (isError || !dataset) return <Alert type="error" message="数据集不存在" style={{ margin: 24 }} />

  const PLATFORM_COLOR: Record<string, string> = {
    postgresql: 'blue', timescaledb: 'geekblue', redis: 'red',
    s3: 'orange', file: 'orange', mq: 'purple',
    reuters: 'magenta', bloomberg: 'magenta', grpc: 'cyan',
  }

  const tabItems = [
    {
      key: 'schema',
      label: `字段${fields.length ? ` (${fields.length})` : ''}`,
      children: (
        <>
          {fields.length > 0 && (
            <Space size={16} style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                PK: <Text strong style={{ fontSize: 12 }}>{fields.filter(f => f.isPk).map(f => f.name).join(', ') || '—'}</Text>
              </Text>
              {fields.some(f => f.isPartitionKey) && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  分区键: <Text strong style={{ fontSize: 12 }}>{fields.filter(f => f.isPartitionKey).map(f => f.name).join(', ')}</Text>
                </Text>
              )}
              {fields.some(f => f.isPii) && (
                <Tag color="red" style={{ fontSize: 11 }}>
                  <LockOutlined /> {fields.filter(f => f.isPii).length} 个 PII 字段
                </Tag>
              )}
              {fields[0]?.statsUpdatedAt && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  统计更新: {new Date(fields[0].statsUpdatedAt).toLocaleDateString('zh-CN')}
                </Text>
              )}
            </Space>
          )}
          <Table
            columns={buildFieldColumns(setSelectedField)}
            dataSource={fields}
            rowKey="id"
            size="small"
            loading={fieldsLoading}
            pagination={false}
            locale={{ emptyText: '暂无字段定义' }}
            onRow={(r: OntEntityField) => ({
              onClick: () => setSelectedField(r),
              style: { cursor: 'pointer' },
            })}
          />
          <FieldDrawer field={selectedField} onClose={() => setSelectedField(null)} />
        </>
      ),
    },
    {
      key: 'lineage',
      label: '血缘',
      children: (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Button
            type="primary"
            icon={<ApartmentOutlined />}
            onClick={() => navigate(`/graph/${encodeURIComponent(dataset.urn)}`)}
          >
            在血缘图谱中查看
          </Button>
        </div>
      ),
    },
    {
      key: 'extra',
      label: <span><AppstoreAddOutlined /> 自定义属性</span>,
      children: (
        <div style={{ padding: '16px 0' }}>
          <EntityExtraPanel entityId={dataset.id} />
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        items={[
          { title: 'Data Map' },
          { title: <span style={{ cursor: 'pointer' }} onClick={() => navigate('/datasets')}>数据集</span> },
          { title: dataset.name },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/datasets')}>返回</Button>
      </Space>

      {/* 头部卡片：所有元数据 */}
      <Card style={{ marginBottom: 16 }}>
        {/* 顶行：图标 + 名称 + 版本 + 按钮 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DatabaseOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>{dataset.name}</Title>
              {dataset.displayName && dataset.displayName !== dataset.name && (
                <Text type="secondary" style={{ fontSize: 13 }}>{dataset.displayName}</Text>
              )}
              <Badge count={`v${dataset.currentVersion}`} color="geekblue" style={{ fontSize: 10 }} />
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {dataset.domainName && <Tag color="blue" style={{ margin: 0 }}>{dataset.domainName}</Tag>}
              {dataset.tags && dataset.tags.length > 0 && (
                <>
                  <Divider type="vertical" style={{ margin: '0 2px', borderColor: '#d9d9d9' }} />
                  {dataset.tags.map(t => (
                    <Tag key={t} icon={<TagOutlined />} style={{ fontSize: 11, margin: 0, color: '#595959', borderColor: '#d9d9d9', background: '#fafafa' }}>{t}</Tag>
                  ))}
                </>
              )}
            </div>
            {dataset.description && (
              <Paragraph type="secondary" style={{ margin: '10px 0 0', fontSize: 13 }}>
                {dataset.description}
              </Paragraph>
            )}
          </div>
          <Button
            icon={<ApartmentOutlined />}
            onClick={() => navigate(`/graph/${encodeURIComponent(dataset.urn)}`)}
            style={{ flexShrink: 0 }}
          >
            查看血缘
          </Button>
        </div>

        <Divider style={{ margin: '16px 0 12px' }} />

        <Descriptions size="small" layout="horizontal" column={4}>
          {/* 行1：物理位置 */}
          <Descriptions.Item label="Platform">
            <Tag color={PLATFORM_COLOR[dataset.platform] ?? 'default'} style={{ margin: 0 }}>{dataset.platform}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="位置" span={3}>
            <Text code style={{ fontSize: 11 }}>
              {(dataset.platform === 'postgresql' || dataset.platform === 'timescaledb')
                ? [dataset.instanceName, dataset.containerName, dataset.table].filter(Boolean).join(' · ')
                : dataset.platform === 'mq'
                ? [dataset.instanceName, dataset.containerName, dataset.topic].filter(Boolean).join(' · ')
                : dataset.platform === 'grpc'
                ? [dataset.instanceName, dataset.containerName, dataset.grpcService, dataset.grpcMethod].filter(Boolean).join(' · ')
                : (dataset.platform === 's3' || dataset.platform === 'file')
                ? dataset.filePath ?? [dataset.instanceName, dataset.containerName].filter(Boolean).join(' · ')
                : [dataset.instanceName, dataset.containerName].filter(Boolean).join(' · ') || '—'}
            </Text>
          </Descriptions.Item>

          {/* 行2：平台专属（按需） */}
          {(dataset.platform === 'postgresql' || dataset.platform === 'timescaledb') && (
            <Descriptions.Item label="PK" span={4}><Text code style={{ fontSize: 11 }}>{dataset.pk ?? '—'}</Text></Descriptions.Item>
          )}
          {dataset.platform === 'grpc' && (
            <Descriptions.Item label="Payload" span={4}><Text code style={{ fontSize: 11 }}>{dataset.grpcPayload ?? '—'}</Text></Descriptions.Item>
          )}

          {/* 行3：数据特征 */}
          <Descriptions.Item label="数据时效">
            {dataset.freshness
              ? <Tag color={{ realtime: 'green', minute: 'cyan', daily: 'orange', request: 'default' }[dataset.freshness] ?? 'default'} style={{ margin: 0 }}>{dataset.freshness}</Tag>
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="记录数">
            <Text>{dataset.rowCount != null ? dataset.rowCount.toLocaleString() : '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="数据大小">
            <Text>{dataset.sizeBytes != null ? formatSize(dataset.sizeBytes) : '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="保留期">
            <Text>{dataset.retention ?? '—'}</Text>
          </Descriptions.Item>

          {/* 行4：归属 */}
          <Descriptions.Item label="管理员">
            <Text>{dataset.owner ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="团队">
            <Text>{dataset.team ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="更新" span={2}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(dataset.updatedAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs defaultActiveKey="schema" items={tabItems} />
      </Card>
    </div>
  )
}
