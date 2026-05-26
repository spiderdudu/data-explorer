import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Typography, Space, Tooltip, Badge } from 'antd'
import { ContainerOutlined, CloudServerOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ontologyApi } from '@/api/ontology'
import type { OntEntity } from '@/types/ontology'

const { Text, Title } = Typography

const PLATFORM_TYPE_COLOR: Record<string, string> = {
  database: 'blue', stream: 'purple', file: 'orange', api: 'magenta', external: 'default',
}

export default function ContainersPage() {
  const { data: containers, isLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => ontologyApi.getContainers(),
  })
  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: () => ontologyApi.getInstances(),
  })
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => ontologyApi.getPlatforms(),
  })

  // 构建 instanceId → instance 映射（通过 CONTAINER_LINKS 反查，这里用 name 匹配）
  // Container 的 URN 里没有直接的 instanceId，通过 getInstanceTree 的父子关系推导
  // 简化：直接从 instance name 推断 platform
  const instanceMap = new Map((instances ?? []).map(i => [i.name, i]))
  const platformMap = new Map((platforms ?? []).map(p => [p.name, p]))

  // 根据 container name 推断归属 instance
  const containerToInstance: Record<string, OntEntity> = {
    'meta':       instanceMap.get('platform-rds-prod')!,
    'config':     instanceMap.get('platform-rds-prod')!,
    'public-ld':  instanceMap.get('ladder-db-prod-ld')!,
    'public-sg':  instanceMap.get('ladder-db-prod-sg')!,
    'LD':         instanceMap.get('mq-prod-ld')!,
    'SG':         instanceMap.get('mq-prod-sg')!,
    'reports':    instanceMap.get('acme-s3-prod')!,
    'onboarding': instanceMap.get('acme-s3-prod')!,
  }

  const columns: ColumnsType<OntEntity> = [
    {
      title: '容器',
      key: 'name',
      render: (_: unknown, record) => (
        <Space>
          <ContainerOutlined style={{ color: '#08979c' }} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{record.displayName ?? record.name}</Text>
            {record.displayName && record.displayName !== record.name && (
              <div><Text type="secondary" style={{ fontSize: 11 }}>({record.name})</Text></div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (d: string) => d
        ? <Tooltip title={d}><Text type="secondary" style={{ fontSize: 13 }}>{d}</Text></Tooltip>
        : '—',
    },
    {
      title: '归属实例',
      key: 'instance',
      width: 180,
      render: (_: unknown, record) => {
        const inst = containerToInstance[record.name]
        if (!inst) return '—'
        return (
          <Space size={4}>
            <CloudServerOutlined style={{ color: '#13c2c2', fontSize: 12 }} />
            <Text style={{ fontSize: 12 }}>{inst.displayName ?? inst.name}</Text>
          </Space>
        )
      },
    },
    {
      title: '平台',
      key: 'platform',
      width: 120,
      render: (_: unknown, record) => {
        const inst = containerToInstance[record.name]
        if (!inst) return '—'
        const plat = platformMap.get(inst.platform)
        if (!plat) return <Tag>{inst.platform}</Tag>
        const color = PLATFORM_TYPE_COLOR[plat.platformType] ?? 'default'
        return <Tag color={color}>{plat.displayName}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (s: number) => s === 1
        ? <Badge status="success" text="启用" />
        : <Badge status="default" text="停用" />,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>容器</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          实例内的物理分组，对应数据库 schema 或消息队列前缀
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={containers ?? []}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={false}
      />
    </div>
  )
}
