import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Breadcrumb, Descriptions, Tag, Space, Typography, Button,
  Tabs, Table, Spin, Alert, Divider, Card, Badge,
} from 'antd'
import {
  ApartmentOutlined, ArrowLeftOutlined, DatabaseOutlined,
  TagOutlined, AppstoreAddOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import EntityExtraPanel from '@/components/entity/EntityExtraPanel'

const { Title, Text, Paragraph } = Typography

function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

// Mock 字段数据（后端就绪后从 ont_entity_property_value 读取）
const MOCK_FIELDS = [
  { name: 'id',          type: 'bigint',      nullable: false, pk: true,  description: '主键' },
  { name: 'account_id',  type: 'varchar(50)', nullable: false, pk: false, description: '账户 ID' },
  { name: 'symbol',      type: 'varchar(20)', nullable: false, pk: false, description: '品种，如 EURUSD' },
  { name: 'volume',      type: 'decimal',     nullable: false, pk: false, description: '持仓量（手）' },
  { name: 'open_price',  type: 'decimal',     nullable: true,  pk: false, description: '开仓均价' },
  { name: 'unrealized_pnl', type: 'decimal',  nullable: true,  pk: false, description: '浮动盈亏（USD）' },
  { name: 'created_at',  type: 'timestamptz', nullable: false, pk: false, description: '创建时间' },
  { name: 'updated_at',  type: 'timestamptz', nullable: false, pk: false, description: '更新时间' },
]

const FIELD_COLUMNS = [
  {
    title: '字段名',
    dataIndex: 'name',
    key: 'name',
    render: (name: string, record: typeof MOCK_FIELDS[0]) => (
      <Space>
        <Text code style={{ fontSize: 12 }}>{name}</Text>
        {record.pk && <Tag color="gold" style={{ fontSize: 10 }}>PK</Tag>}
      </Space>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 140,
    render: (t: string) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
  },
  {
    title: 'Nullable',
    dataIndex: 'nullable',
    key: 'nullable',
    width: 90,
    render: (v: boolean) => v
      ? <Badge status="default" text="YES" />
      : <Badge status="processing" text="NO" />,
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    render: (d: string) => <Text type="secondary" style={{ fontSize: 13 }}>{d}</Text>,
  },
]

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: dataset, isLoading, isError } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => ontologyApi.getDataset(Number(id)),
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
      label: '字段',
      children: (
        <Table
          columns={FIELD_COLUMNS}
          dataSource={MOCK_FIELDS}
          rowKey="name"
          size="small"
          pagination={false}
        />
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
