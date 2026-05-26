import { useState } from 'react'
import { Layout, Menu, Typography } from 'antd'
import {
  DatabaseOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  MessageOutlined,
  BarChartOutlined,
  GlobalOutlined,
  FunctionOutlined,
  ThunderboltOutlined,
  FileSearchOutlined,
  ShareAltOutlined,
  TagsOutlined,
  CloudServerOutlined,
  ApiOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Sider, Content } = Layout
const { Text } = Typography

const NAV_ITEMS = [
  {
    type: 'group' as const,
    label: '数据地图',
    children: [
      { key: '/datasets',   icon: <DatabaseOutlined />,  label: '数据集' },
      { key: '/actions',    icon: <ApiOutlined />,       label: 'Action' },
      { key: '/strategies', icon: <RobotOutlined />,     label: 'Strategy' },
      { key: '/graph',      icon: <ShareAltOutlined />,  label: '关系图谱' },
    ],
  },
  {
    type: 'group' as const,
    label: '运营分析',
    children: [
      { key: '/events',          icon: <ThunderboltOutlined />, label: '市场事件' },
      { key: '/events/strategy', icon: <RobotOutlined />,       label: '策略归因' },
    ],
  },
  {
    type: 'group' as const,
    label: '数据探索',
    children: [
      { key: '/explore/query',     icon: <FunctionOutlined />, label: '查询构建器' },
      { key: '/explore/chat',      icon: <MessageOutlined />,  label: 'Chat BI' },
      { key: '/explore/dashboard', icon: <BarChartOutlined />, label: '看板' },
    ],
  },
  {
    type: 'group' as const,
    label: '本体管理',
    children: [
      { key: '/ontology/types',      icon: <TagsOutlined />,        label: '实体类型' },
      { key: '/ontology/dimensions', icon: <AppstoreOutlined />,    label: '类型体系' },
      { key: '/ontology/physical',   icon: <CloudServerOutlined />, label: '数据源管理' },
      { key: '/domains',             icon: <AppstoreOutlined />,    label: '域管理' },
    ],
  },
]

// 所有叶子路由 key，用于匹配当前选中项
const ALL_KEYS = NAV_ITEMS.flatMap(g => g.children.map(c => c.key))

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  // 精确匹配优先，再降级到前缀匹配
  const selectedKey =
    ALL_KEYS.find(k => location.pathname === k) ??
    ALL_KEYS.find(k => k !== '/' && location.pathname.startsWith(k + '/')) ??
    ALL_KEYS.find(k => location.pathname.startsWith(k)) ??
    '/datasets'

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={180}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        {/* Logo */}
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 24px' : '0 16px',
          gap: 8,
          borderBottom: '1px solid #f0f0f0',
        }}>
          <GlobalOutlined style={{ fontSize: 18, color: '#1677ff', flexShrink: 0 }} />
          {!collapsed && (
            <div>
              <Text strong style={{ fontSize: 13, display: 'block', lineHeight: '18px' }}>
                Acme
              </Text>
              <Text type="secondary" style={{ fontSize: 10, lineHeight: '14px' }}>
                Ontology Platform
              </Text>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          style={{ borderRight: 0, marginTop: 4, fontSize: 13 }}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout style={{ flex: 1, minWidth: 0 }}>
        <Content style={{ overflow: 'auto', background: '#f5f5f5', height: '100%', position: 'relative' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
