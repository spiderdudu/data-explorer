import { useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Spin } from 'antd'
import { ApartmentOutlined, ShareAltOutlined, BranchesOutlined } from '@ant-design/icons'
import LinkTypesTab   from './tabs/LinkTypesTab'
import EntityLinksTab from './tabs/EntityLinksTab'

// 血缘画布较重，懒加载
const LineageTab = lazy(() => import('./tabs/LineageTab'))

type TabKey = 'link-types' | 'entity-links' | 'lineage'

export default function GraphPage() {
  const { urn }    = useParams<{ urn?: string }>()
  const navigate   = useNavigate()
  const focusUrn   = urn ? decodeURIComponent(urn) : undefined

  // 有 urn 时默认进血缘 tab
  const [activeTab, setActiveTab] = useState<TabKey>(focusUrn ? 'lineage' : 'link-types')

  const onTabChange = (key: string) => {
    setActiveTab(key as TabKey)
    // 切离血缘 tab 时清除 urn
    if (key !== 'lineage' && focusUrn) navigate('/graph')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' }}>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        style={{ background: '#fff', paddingLeft: 20, marginBottom: 0, flexShrink: 0 }}
        tabBarStyle={{ marginBottom: 0 }}
        items={[
          {
            key: 'link-types',
            label: <span><ApartmentOutlined /> 类型关联</span>,
          },
          {
            key: 'entity-links',
            label: <span><ShareAltOutlined /> 实体关联</span>,
          },
          {
            key: 'lineage',
            label: <span><BranchesOutlined /> 字段血缘</span>,
          },
        ]}
      />

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {activeTab === 'link-types'   && <LinkTypesTab />}
        {activeTab === 'entity-links' && <EntityLinksTab />}
        {activeTab === 'lineage' && (
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Spin size="large" />
            </div>
          }>
            <LineageTab focusUrn={focusUrn} onNavigate={u => navigate(`/graph/${encodeURIComponent(u)}`)} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
