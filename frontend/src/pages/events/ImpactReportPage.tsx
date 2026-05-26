import { Empty } from 'antd'
import { FileSearchOutlined } from '@ant-design/icons'

export default function ImpactReportPage() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Empty
        image={<FileSearchOutlined style={{ fontSize: 48, color: '#1677ff' }} />}
        description="影响报告 — 开发中（Phase 1）"
      />
    </div>
  )
}
