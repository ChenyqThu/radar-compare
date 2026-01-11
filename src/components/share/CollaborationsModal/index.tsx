import { useState, useEffect } from 'react'
import {
  Modal,
  List,
  Typography,
  Space,
  Tag,
  Button,
  Empty,
  Tooltip,
  Popconfirm,
  message,
  Spin,
} from 'antd'
import {
  TeamOutlined,
  EditOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExportOutlined,
  DeleteOutlined,
  RadarChartOutlined,
} from '@ant-design/icons'
import {
  getMyCollaborations,
  leaveCollaboration,
  getShareUrl,
  type CollaborationDetail,
} from '@/services/supabase'
import { useI18n } from '@/locales'
import styles from './CollaborationsModal.module.css'

interface CollaborationsModalProps {
  open: boolean
  onClose: () => void
}

export function CollaborationsModal({ open, onClose }: CollaborationsModalProps) {
  const { t } = useI18n()
  const [collaborations, setCollaborations] = useState<CollaborationDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadCollaborations()
    }
  }, [open])

  const loadCollaborations = async () => {
    setLoading(true)
    const result = await getMyCollaborations()
    setCollaborations(result)
    setLoading(false)
  }

  const handleLeave = async (projectId: string) => {
    const success = await leaveCollaboration(projectId)
    if (success) {
      message.success(t.share?.leaveSuccess || '已离开协作')
      await loadCollaborations()
    } else {
      message.error(t.share?.leaveFailed || '离开协作失败')
    }
  }

  const handleVisit = (shareToken: string) => {
    const url = getShareUrl(shareToken)
    window.location.href = url
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  const getExpiryStatus = (expiresAt?: string) => {
    if (!expiresAt) return null

    const expiry = new Date(expiresAt)
    const now = new Date()
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft <= 0) {
      return <Tag color="red">{t.share?.expired || '已过期'}</Tag>
    } else if (daysLeft <= 7) {
      return (
        <Tag color="orange">
          {t.collaborations?.expiresIn?.replace('{days}', String(daysLeft)) || `${daysLeft} 天后过期`}
        </Tag>
      )
    }
    return null
  }

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          {t.collaborations?.title || '我的协作'}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
    >
      {loading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : collaborations.length === 0 ? (
        <Empty
          description={t.collaborations?.empty || '暂无协作项目'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={collaborations}
          renderItem={(collab) => (
            <List.Item
              className={styles.listItem}
              actions={[
                <Tooltip key="visit" title={t.collaborations?.visit || '访问'}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<ExportOutlined />}
                    onClick={() => handleVisit(collab.shareToken)}
                  >
                    {t.collaborations?.visit || '访问'}
                  </Button>
                </Tooltip>,
                <Popconfirm
                  key="leave"
                  title={t.share?.confirmLeave || '确定离开协作？'}
                  description={t.share?.leaveHint || '离开后将无法再编辑此项目'}
                  onConfirm={() => handleLeave(collab.projectId)}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <Tag icon={<RadarChartOutlined />} color="blue">
                      {collab.tabName}
                    </Tag>
                    <Typography.Text type="secondary">
                      {collab.projectName}
                    </Typography.Text>
                    <Tag color="green" icon={<EditOutlined />}>
                      {t.share?.editable || '可编辑'}
                    </Tag>
                    {getExpiryStatus(collab.expiresAt)}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4} className={styles.description}>
                    {/* Meta info */}
                    <Space size="large" wrap>
                      {collab.ownerName && (
                        <span className={styles.metaItem}>
                          <UserOutlined /> {collab.ownerName}
                        </span>
                      )}
                      <span className={styles.metaItem}>
                        <ClockCircleOutlined /> {t.collaborations?.joinedAt || '加入时间'}: {formatDate(collab.joinedAt)}
                      </span>
                      {collab.expiresAt && (
                        <span className={styles.metaItem}>
                          <ClockCircleOutlined /> {t.collaborations?.expiresAt || '过期时间'}: {formatDate(collab.expiresAt)}
                        </span>
                      )}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  )
}
