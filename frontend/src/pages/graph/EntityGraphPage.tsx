import { Empty } from 'antd'
import { ShareAltOutlined } from '@ant-design/icons'

export default function EntityGraphPage() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Empty
        image={<ShareAltOutlined style={{ fontSize: 48, color: '#722ed1' }} />}
        description="实体图谱 — 开发中（Phase 2）"
      />
    </div>
  )
}
