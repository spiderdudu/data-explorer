import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Typography, Input, Button, Popconfirm, Spin, Empty, Tag, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons'
import { ontologyApi } from '@/api/ontology'

const { Text } = Typography

interface Props {
  fieldId: number
}

export default function FieldExtraPanel({ fieldId }: Props) {
  const queryClient = useQueryClient()
  const qKey = ['fieldExtra', fieldId]

  const { data: extras, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => ontologyApi.getFieldExtra(fieldId),
  })

  const upsertMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      ontologyApi.upsertFieldExtra(fieldId, key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => ontologyApi.deleteFieldExtra(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  })

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editKey, setEditKey]     = useState('')
  const [editValue, setEditValue] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newKey, setNewKey]       = useState('')
  const [newValue, setNewValue]   = useState('')

  const startEdit = (id: number, key: string, value: string) => {
    setEditingId(id); setEditKey(key); setEditValue(value)
  }
  const cancelEdit = () => { setEditingId(null); setEditKey(''); setEditValue('') }
  const saveEdit = () => {
    if (!editKey.trim()) return
    upsertMut.mutate({ key: editKey.trim(), value: editValue.trim() })
    cancelEdit()
  }
  const saveNew = () => {
    if (!newKey.trim()) return
    upsertMut.mutate({ key: newKey.trim(), value: newValue.trim() })
    setAddingNew(false); setNewKey(''); setNewValue('')
  }
  const cancelNew = () => { setAddingNew(false); setNewKey(''); setNewValue('') }

  if (isLoading) return <Spin size="small" />

  return (
    <div style={{ padding: '4px 0' }}>
      {(extras ?? []).length === 0 && !addingNew && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无自定义标注"
          style={{ margin: '4px 0' }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(extras ?? []).map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px', background: '#fafafa',
              borderRadius: 4, border: '1px solid #f0f0f0',
            }}
          >
            {editingId === item.id ? (
              <>
                <Input size="small" value={editKey} onChange={e => setEditKey(e.target.value)}
                  style={{ width: 140, fontFamily: 'monospace', fontSize: 11 }} placeholder="key" />
                <Text type="secondary" style={{ fontSize: 11 }}>:</Text>
                <Input size="small" value={editValue} onChange={e => setEditValue(e.target.value)}
                  style={{ flex: 1, fontSize: 11 }} placeholder="value"
                  onPressEnter={saveEdit} autoFocus />
                <Button size="small" type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={saveEdit} />
                <Button size="small" type="text" icon={<CloseOutlined />} style={{ color: '#8c8c8c' }} onClick={cancelEdit} />
              </>
            ) : (
              <>
                <Tag style={{ fontFamily: 'monospace', fontSize: 10, margin: 0, flexShrink: 0 }}>{item.key}</Tag>
                <Text style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.value}
                </Text>
                <Tooltip title={`更新于 ${new Date(item.updatedAt).toLocaleDateString()}`}>
                  <Text type="secondary" style={{ fontSize: 10, flexShrink: 0 }}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </Text>
                </Tooltip>
                <Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#8c8c8c', flexShrink: 0 }}
                  onClick={() => startEdit(item.id, item.key, item.value)} />
                <Popconfirm title="确认删除此标注？" onConfirm={() => deleteMut.mutate(item.id)}
                  okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                  <Button size="small" type="text" icon={<DeleteOutlined />} style={{ color: '#ff4d4f', flexShrink: 0 }} />
                </Popconfirm>
              </>
            )}
          </div>
        ))}

        {addingNew && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 8px', background: '#f0f5ff',
            borderRadius: 4, border: '1px dashed #91caff',
          }}>
            <Input size="small" value={newKey} onChange={e => setNewKey(e.target.value)}
              style={{ width: 140, fontFamily: 'monospace', fontSize: 11 }} placeholder="key" autoFocus />
            <Text type="secondary" style={{ fontSize: 11 }}>:</Text>
            <Input size="small" value={newValue} onChange={e => setNewValue(e.target.value)}
              style={{ flex: 1, fontSize: 11 }} placeholder="value" onPressEnter={saveNew} />
            <Button size="small" type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={saveNew} />
            <Button size="small" type="text" icon={<CloseOutlined />} style={{ color: '#8c8c8c' }} onClick={cancelNew} />
          </div>
        )}
      </div>

      {!addingNew && (
        <Button size="small" type="dashed" icon={<PlusOutlined />}
          style={{ marginTop: 6, width: '100%', fontSize: 11 }}
          onClick={() => setAddingNew(true)}>
          添加标注
        </Button>
      )}
    </div>
  )
}
