import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Tag, Typography, Space, Badge, Tree, Tooltip } from 'antd'
import type { TreeProps } from 'antd'
import { AppstoreOutlined, FolderOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { DomainTreeNode } from '@/types/ontology'

const { Title, Text } = Typography

const DOMAIN_COLOR: Record<string, string> = {
  Trading: 'blue', Market: 'green', Risk: 'red', System: 'default',
  Spot: 'blue', Forward: 'blue', FX: 'green', Metals: 'green', Exposure: 'red',
}

const DOMAIN_HEX: Record<string, string> = {
  blue: '#1677ff', green: '#52c41a', red: '#f5222d', default: '#8c8c8c',
}

// ── 截断描述，超过 20 字用 tooltip ────────────────────────────────────────────
function ShortDesc({ text }: { text?: string }) {
  if (!text) return null
  const short = text.length > 20 ? text.slice(0, 20) + '…' : text
  return (
    <Tooltip title={text.length > 20 ? text : undefined}>
      <Text type="secondary" style={{ fontSize: 11 }}>— {short}</Text>
    </Tooltip>
  )
}

// ── Domain 树节点 ─────────────────────────────────────────────────────────────
function toDomainTreeData(
  nodes: DomainTreeNode[],
  navigate: (path: string) => void,
): TreeProps['treeData'] {
  return nodes.map(node => {
    const hasChildren = (node.children?.length ?? 0) > 0
    const colorKey = DOMAIN_COLOR[node.name] ?? 'default'
    const hex = DOMAIN_HEX[colorKey]

    return {
      key: String(node.id),
      title: (
        <Space size={4} style={{ userSelect: 'none' }}>
          <Text
            strong={!hasChildren}
            style={{ fontSize: 13, cursor: 'pointer', color: hex }}
            onClick={() => navigate(`/datasets?domain=${node.name}`)}
          >
            {node.displayName ?? node.name}
          </Text>
          {(node.datasetCount ?? 0) > 0 && (
            <Tooltip title={`${node.datasetCount} 个数据集`}>
              <Badge count={node.datasetCount} color="geekblue" style={{ fontSize: 10 }} />
            </Tooltip>
          )}
          <ShortDesc text={node.description} />
        </Space>
      ),
      icon: hasChildren
        ? ({ expanded }: { expanded: boolean }) =>
            expanded ? <FolderOpenOutlined style={{ color: hex }} />
                     : <FolderOutlined     style={{ color: hex }} />
        : <AppstoreOutlined style={{ color: hex }} />,
      children: node.children?.length
        ? toDomainTreeData(node.children as DomainTreeNode[], navigate)
        : undefined,
    }
  })
}

// ── 树形卡片 ──────────────────────────────────────────────────────────────────
function TreeCard({ title, icon, color, treeData }: {
  title: string
  icon: React.ReactNode
  color: string
  treeData: TreeProps['treeData']
}) {
  return (
    <Card
      size="small"
      styles={{ header: { borderBottom: `2px solid ${color}` } }}
      title={
        <Space>
          <span style={{ color, fontSize: 16 }}>{icon}</span>
          <Text strong style={{ fontSize: 14 }}>{title}</Text>
        </Space>
      }
    >
      <Tree showIcon defaultExpandAll treeData={treeData} style={{ fontSize: 13 }} />
    </Card>
  )
}

export default function DomainsPage() {
  const navigate = useNavigate()

  const { data: domainTree } = useQuery({ queryKey: ['domainTree'], queryFn: () => ontologyApi.getDomainTree() })

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>域管理</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          按业务语义对数据集进行逻辑分组，支持嵌套子域
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {(domainTree ?? []).map(root => {
          const colorKey = DOMAIN_COLOR[root.name] ?? 'default'
          const hex = DOMAIN_HEX[colorKey]
          return (
            <Col span={12} key={root.id}>
              <TreeCard
                title={root.displayName ?? root.name}
                icon={<AppstoreOutlined />}
                color={hex}
                treeData={toDomainTreeData([root], navigate)}
              />
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
