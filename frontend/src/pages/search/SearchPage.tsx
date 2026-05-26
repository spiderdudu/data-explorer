import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Input, List, Tag, Typography, Space, Empty, Spin, Breadcrumb } from 'antd'
import { DatabaseOutlined, SearchOutlined } from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'
import type { SearchResult } from '@/types/ontology'

const { Title, Text, Paragraph } = Typography

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
    if (!q.trim()) { setResults([]); return }

    setLoading(true)
    ontologyApi.search({ query: q })
      .then(r => setResults(r.items))
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleSearch = (q: string) => {
    if (q.trim()) setSearchParams({ q })
    else setSearchParams({})
  }

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb items={[{ title: 'Data Map' }, { title: '搜索' }]} style={{ marginBottom: 16 }} />
      <Title level={4} style={{ marginBottom: 16 }}>搜索</Title>

      <Input.Search
        size="large"
        placeholder="搜索数据集名称、描述、标签..."
        prefix={<SearchOutlined />}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        allowClear
        style={{ maxWidth: 600, marginBottom: 24 }}
        enterButton
      />

      {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}

      {!loading && query && results.length === 0 && (
        <Empty description={`没有找到与 "${query}" 相关的结果`} />
      )}

      {!loading && results.length > 0 && (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            找到 {results.length} 个结果
          </Text>
          <List
            dataSource={results}
            renderItem={item => (
              <List.Item
                style={{
                  background: '#fff',
                  padding: '16px 20px',
                  marginBottom: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: '1px solid #f0f0f0',
                }}
                onClick={() => navigate(`/datasets/${item.entityId}`)}
              >
                <List.Item.Meta
                  avatar={<DatabaseOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 4 }} />}
                  title={
                    <Space>
                      <Text strong>{item.name}</Text>
                      {item.displayName && item.displayName !== item.name && (
                        <Text type="secondary">({item.displayName})</Text>
                      )}
                      <Tag color="blue">{item.typeDisplayName}</Tag>
                      <Tag color={item.env === 'prod' ? 'green' : 'orange'}>{item.env}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      {item.description && (
                        <Paragraph
                          type="secondary"
                          ellipsis={{ rows: 2 }}
                          style={{ margin: 0, fontSize: 13 }}
                        >
                          {item.description}
                        </Paragraph>
                      )}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.urn}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  )
}
