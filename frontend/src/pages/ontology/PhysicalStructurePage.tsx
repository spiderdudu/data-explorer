import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Row, Col, Card, Tag, Typography, Space, Badge, Tree,
  Tooltip, List, Empty, Spin, Divider,
} from 'antd'
import type { TreeProps } from 'antd'
import {
  CloudServerOutlined, ContainerOutlined,
  DatabaseOutlined, FolderOutlined, FolderOpenOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { ContainerTreeNode, OntEntity } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

const CATEGORY_COLOR: Record<string, string> = {
  database: 'blue', stream: 'purple', file: 'orange', api: 'magenta', internal: 'cyan', external: 'default',
}
const CATEGORY_HEX: Record<string, string> = {
  blue: '#1677ff', purple: '#722ed1', orange: '#fa8c16', magenta: '#eb2f96', cyan: '#13c2c2', default: '#8c8c8c',
}

// ── Instance 下的 Container+Dataset 树 ────────────────────────────────────────
function toTreeData(
  nodes: ContainerTreeNode[],
  navigate: (path: string) => void,
): TreeProps['treeData'] {
  return nodes.map(node => {
    const isContainer = node.typeName === 'Container'
    const isDataset   = node.typeName === 'Dataset'

    return {
      key: String(node.id),
      title: (
        <Space size={4} style={{ userSelect: 'none' }}>
          <Text
            style={{
              fontSize: 13,
              cursor: isContainer || isDataset ? 'pointer' : 'default',
              color: isDataset ? '#1677ff' : undefined,
            }}
            onClick={() => {
              if (isContainer) navigate(`/datasets?container=${node.name}`)
              if (isDataset)   navigate(`/datasets/${node.id}`)
            }}
          >
            {node.displayName ?? node.name}
          </Text>
          {(node.datasetCount ?? 0) > 0 && isContainer && (
            <Tooltip title={`${node.datasetCount} 个数据集`}>
              <Badge count={node.datasetCount} color="geekblue" style={{ fontSize: 10 }} />
            </Tooltip>
          )}
          {node.description && (
            <Tooltip title={node.description}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                — {node.description.length > 24 ? node.description.slice(0, 24) + '…' : node.description}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
      icon: isDataset
        ? <DatabaseOutlined style={{ color: '#1677ff' }} />
        : (node.children?.length ?? 0) > 0
          ? ({ expanded }: { expanded: boolean }) =>
              expanded
                ? <FolderOpenOutlined style={{ color: '#08979c' }} />
                : <FolderOutlined     style={{ color: '#08979c' }} />
          : <ContainerOutlined style={{ color: '#08979c' }} />,
      children: node.children?.length
        ? toTreeData(node.children as ContainerTreeNode[], navigate)
        : undefined,
    }
  })
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function DataSourcePage() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: instances,   isLoading: iLoading } = useQuery({ queryKey: ['instances'],   queryFn: () => ontologyApi.getInstances() })
  const { data: instanceTree                      } = useQuery({ queryKey: ['instanceTree'], queryFn: () => ontologyApi.getInstanceTree() })
  const { data: dimensions                        } = useQuery({ queryKey: ['dimensions', 'platform'], queryFn: () => ontologyApi.getDimensions('platform') })

  const dimMap = new Map((dimensions ?? []).map(d => [d.name, d]))

  // 默认选中第一个
  const effectiveId = selectedId ?? instances?.[0]?.id ?? null

  // 选中的 instance 对应的树节点
  const selectedInstance = (instances ?? []).find(i => i.id === effectiveId)
  const selectedTree     = (instanceTree ?? []).find(n => n.id === effectiveId)

  // 按 category 分组
  const grouped = (instances ?? []).reduce<Record<string, OntEntity[]>>((acc, inst) => {
    const dim = dimMap.get(inst.platform)
    const cat = dim?.category ?? 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(inst)
    return acc
  }, {})

  const categoryOrder = ['database', 'stream', 'file', 'internal', 'api', 'external', 'other']
  const categoryLabel: Record<string, string> = {
    database: '数据库', stream: '消息流', file: '文件存储', internal: '内部服务', api: '外部 API', external: '其他', other: '其他',
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>

      {/* 左侧：数据源列表 */}
      <div style={{
        width: 260, flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        overflowY: 'auto',
        padding: '16px 0',
      }}>
        <div style={{ padding: '0 16px 12px' }}>
          <Text strong style={{ fontSize: 13 }}>数据源</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {instances?.length ?? 0} 个实例
          </Text>
        </div>

        {iLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}

        {!iLoading && categoryOrder.filter(cat => grouped[cat]?.length).map(cat => (
          <div key={cat}>
            <div style={{ padding: '4px 16px', background: '#fafafa' }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                {categoryLabel[cat]}
              </Text>
            </div>
            <List
              dataSource={grouped[cat]}
              renderItem={inst => {
                const dim = dimMap.get(inst.platform)
                const color = CATEGORY_COLOR[dim?.category ?? ''] ?? 'default'
                const isSelected = inst.id === effectiveId
                return (
                  <List.Item
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: isSelected ? '#e6f4ff' : undefined,
                      borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setSelectedId(inst.id)}
                  >
                    <Space size={8} style={{ width: '100%' }}>
                      <CloudServerOutlined style={{ color: CATEGORY_HEX[color] ?? '#13c2c2', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{inst.displayName ?? inst.name}</Text>
                        </div>
                        <div>
                          <Tag color={color} style={{ fontSize: 10, margin: 0 }}>{dim?.displayName ?? inst.platform}</Tag>
                          {inst.status === 0 && <Tag color="default" style={{ fontSize: 10, marginLeft: 4 }}>停用</Tag>}
                        </div>
                      </div>
                    </Space>
                  </List.Item>
                )
              }}
            />
          </div>
        ))}
      </div>

      {/* 右侧：实例详情 + 三层结构 */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 20 }}>
        {!selectedInstance && (
          <Empty
            description="选择左侧数据源查看详情"
            style={{ marginTop: 80 }}
            image={<CloudServerOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          />
        )}

        {selectedInstance && (
          <>
            {/* 实例信息卡片 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Space align="start">
                    <CloudServerOutlined style={{
                      fontSize: 28,
                      color: CATEGORY_HEX[CATEGORY_COLOR[dimMap.get(selectedInstance.platform)?.category ?? ''] ?? 'default'] ?? '#13c2c2',
                      marginTop: 2,
                    }} />
                    <div>
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>{selectedInstance.displayName ?? selectedInstance.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>({selectedInstance.name})</Text>
                        <Tag
                          color={CATEGORY_COLOR[dimMap.get(selectedInstance.platform)?.category ?? ''] ?? 'default'}
                          style={{ fontSize: 11 }}
                        >
                          {dimMap.get(selectedInstance.platform)?.displayName ?? selectedInstance.platform}
                        </Tag>
                        <Tag color={selectedInstance.env === 'prod' ? 'green' : 'orange'} style={{ fontSize: 11 }}>
                          {selectedInstance.env}
                        </Tag>
                      </Space>
                      {selectedInstance.description && (
                        <Paragraph type="secondary" style={{ fontSize: 13, margin: '4px 0 0' }}>
                          {selectedInstance.description}
                        </Paragraph>
                      )}
                    </div>
                  </Space>
                </Col>
                <Col>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {selectedInstance.urn}
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* 三层结构树 */}
            <Card
              size="small"
              title={
                <Space>
                  <FolderOutlined style={{ color: '#08979c' }} />
                  <Text strong style={{ fontSize: 13 }}>容器 / 数据集</Text>
                  {selectedTree?.children?.length && (
                    <Badge count={selectedTree.children.length} color="geekblue" style={{ fontSize: 10 }} />
                  )}
                </Space>
              }
            >
              {selectedTree?.children?.length
                ? <Tree
                    showIcon
                    defaultExpandAll
                    treeData={toTreeData(selectedTree.children as ContainerTreeNode[], navigate)}
                    style={{ fontSize: 13 }}
                  />
                : <Empty description="暂无容器数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              }
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
