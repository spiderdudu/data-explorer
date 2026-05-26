import { Typography, Empty, Button } from 'antd'
import { PlusOutlined, BarChartOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function DashboardPage() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <div style={{
        padding: '10px 20px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <BarChartOutlined style={{ color: '#1677ff', fontSize: 16 }} />
        <Text strong style={{ fontSize: 14 }}>看板</Text>
        <Button size="small" type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }}>
          新建看板
        </Button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty
          description={
            <span>
              暂无看板<br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                在 Chat BI 中保存查询结果，或手动创建看板
              </Text>
            </span>
          }
        />
      </div>
    </div>
  )
}
