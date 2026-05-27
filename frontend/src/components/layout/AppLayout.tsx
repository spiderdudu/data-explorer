import { useState } from 'react'
import { Layout, Typography, Divider } from 'antd'
import {
  DatabaseOutlined, MessageOutlined, BarChartOutlined,
  GlobalOutlined, FunctionOutlined, ThunderboltOutlined,
  TagsOutlined, CloudServerOutlined, ApiOutlined,
  BulbOutlined, PartitionOutlined, RadarChartOutlined,
  CompassOutlined, ApartmentOutlined,
  RobotOutlined, MonitorOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Sider, Content } = Layout
const { Text } = Typography

interface NavItem  { key: string; icon: React.ReactNode; label: string }
interface NavGroup { label: string; items: NavItem[] }
interface NavRole  { role: string; groups: NavGroup[] }

const NAV_ROLES: NavRole[] = [
  {
    role: 'Data Engineering',
    groups: [
      {
        label: 'Data Map',
        items: [
          { key: '/datasets',   icon: <DatabaseOutlined />,       label: 'Datasets' },
          { key: '/domains',    icon: <CompassOutlined />,        label: 'Domains' },
          { key: '/actions',    icon: <ApiOutlined />,            label: 'Actions' },
          { key: '/graph',      icon: <ApartmentOutlined />,      label: 'Graph' },
        ],
      },
      {
        label: 'Metadata',
        items: [
          { key: '/ontology/types',      icon: <TagsOutlined />,        label: 'Entity Types' },
          { key: '/ontology/dimensions', icon: <PartitionOutlined />,   label: 'Meta Model' },
          { key: '/ontology/physical',   icon: <CloudServerOutlined />, label: 'Data Sources' },
        ],
      },
    ],
  },
  {
    role: 'Business Analytics',
    groups: [
      {
        label: 'Operations',
        items: [
          { key: '/analytics/dashboard', icon: <BarChartOutlined />,    label: 'Dashboard' },
          { key: '/events',              icon: <ThunderboltOutlined />, label: 'Market Events' },
          { key: '/events/strategy',     icon: <RadarChartOutlined />,  label: 'Attribution' },
        ],
      },
      {
        label: 'Explore',
        items: [
          { key: '/explore/query', icon: <FunctionOutlined />, label: 'Query Builder' },
          { key: '/explore/chat',  icon: <MessageOutlined />,  label: 'Chat BI' },
          { key: '/explore/ai',    icon: <BulbOutlined />,     label: 'AI Explore' },
        ],
      },
    ],
  },
  {
    role: 'Agent Studio',
    groups: [
      {
        label: '',
        items: [
          { key: '/agent/pipeline', icon: <RobotOutlined />,   label: 'Agent Pipeline' },
          { key: '/agent/monitor',  icon: <MonitorOutlined />, label: 'Agent Monitor'  },
        ],
      },
    ],
  },
]

const ALL_KEYS = NAV_ROLES.flatMap(r => r.groups.flatMap(g => g.items.map(i => i.key)))

export default function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [collapsed, setCollapsed] = useState(false)

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
        width={188}
        style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
      >
        {/* Logo */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 24px' : '0 16px',
          gap: 8, borderBottom: '1px solid #f0f0f0', flexShrink: 0,
        }}>
          <GlobalOutlined style={{ fontSize: 18, color: '#1677ff', flexShrink: 0 }} />
          {!collapsed && (
            <div>
              <Text strong style={{ fontSize: 13, display: 'block', lineHeight: '18px' }}>Evo</Text>
              <Text type="secondary" style={{ fontSize: 10, lineHeight: '14px' }}>Ontology Platform</Text>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ paddingBottom: 16 }}>
          {NAV_ROLES.map((role, ri) => (
            <div key={role.role}>
              {ri > 0 && <Divider style={{ margin: '4px 0' }} />}

              {!collapsed && (
                <div style={{ padding: '10px 16px 2px' }}>
                  <Text style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#1677ff', opacity: 0.75,
                  }}>
                    {role.role}
                  </Text>
                </div>
              )}

              {role.groups.map(group => (
                <div key={group.label || '_'}>
                  {!collapsed && group.label && (
                    <div style={{ padding: '6px 16px 2px' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>{group.label}</Text>
                    </div>
                  )}
                  {group.items.map(item => {
                    const isSelected = selectedKey === item.key
                    return (
                      <div
                        key={item.key}
                        onClick={() => navigate(item.key)}
                        style={{
                          display: 'flex', alignItems: 'center',
                          gap: collapsed ? 0 : 8,
                          padding: collapsed ? '9px 0' : '7px 16px',
                          justifyContent: collapsed ? 'center' : undefined,
                          cursor: 'pointer',
                          background: isSelected ? '#e6f4ff' : undefined,
                          borderRight: isSelected ? '2px solid #1677ff' : '2px solid transparent',
                          color: isSelected ? '#1677ff' : '#595959',
                          fontSize: 13,
                          transition: 'background 0.15s',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5' }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '' }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Sider>

      <Layout style={{ flex: 1, minWidth: 0 }}>
        <Content style={{ overflow: 'auto', background: '#f5f5f5', height: '100%', position: 'relative' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
