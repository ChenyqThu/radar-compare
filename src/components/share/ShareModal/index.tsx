import { useState, useEffect } from 'react'
import {
  Modal,
  Tabs,
  Form,
  Radio,
  DatePicker,
  InputNumber,
  Input,
  Button,
  List,
  Typography,
  Space,
  Tag,
  message,
  Tooltip,
  Popconfirm,
  Empty,
  Alert,
  Avatar,
} from 'antd'
import {
  LinkOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  LockOutlined,
  ClockCircleOutlined,
  FileOutlined,
  RadarChartOutlined,
  HistoryOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  createShareLink,
  getProjectShares,
  deleteShareLink,
  getShareUrl,
  isShareLinkValid,
  getProjectCollaborators,
  removeCollaborator,
  isProjectOwner,
  type ShareLink,
  type CreateShareOptions,
} from '@/services/supabase'
import type { ShareType } from '@/types/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import { isVersionTimeline } from '@/types/versionTimeline'
import { isTimelineRadar } from '@/types'
import styles from './ShareModal.module.css'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function ShareModal({ open, onClose, projectId }: ShareModalProps) {
  const { user } = useAuthStore()
  const { currentProject } = useRadarStore()
  const { t } = useI18n()
  const [form] = Form.useForm()
  const [shares, setShares] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [collaborators, setCollaborators] = useState<Array<{
    id: string
    userId: string
    role: string
    joinedAt: string
    email?: string
    name?: string
  }>>([])
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false)

  // Get current active tab
  const activeTabId = currentProject?.activeRadarId
  const activeTab = currentProject?.radarCharts.find(r => r.id === activeTabId)

  // Check ownership and load data
  useEffect(() => {
    if (open && projectId) {
      checkOwnership()
    }
  }, [open, projectId])

  const checkOwnership = async () => {
    const ownerStatus = await isProjectOwner(projectId)
    setIsOwner(ownerStatus)
    if (ownerStatus) {
      loadShares()
      loadCollaborators()
    }
  }

  const loadShares = async () => {
    setLoading(true)
    const result = await getProjectShares(projectId)
    setShares(result)
    setLoading(false)
  }

  const loadCollaborators = async () => {
    setCollaboratorsLoading(true)
    const result = await getProjectCollaborators(projectId)
    setCollaborators(result)
    setCollaboratorsLoading(false)
  }

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    const success = await removeCollaborator(projectId, collaboratorId)
    if (success) {
      message.success(t.share?.deleteSuccess || '已移除')
      await loadCollaborators()
    } else {
      message.error(t.share?.deleteFailed || '移除失败')
    }
  }

  const handleCreateShare = async (values: {
    shareType: ShareType
    password?: string
    expiresAt?: Date
    maxViews?: number
  }) => {
    if (!activeTabId) {
      message.warning(t.share?.noActiveTab || '请先选择一个 Tab')
      return
    }

    setCreating(true)

    const options: CreateShareOptions = {
      projectId,
      shareType: values.shareType,
      shareScope: 'tabs',
      sharedTabIds: [activeTabId],
      password: values.password,
      expiresAt: values.expiresAt,
      maxViews: values.maxViews,
    }

    const result = await createShareLink(options)

    if (result) {
      message.success(t.share?.createSuccess || '分享链接已创建')
      form.resetFields()
      await loadShares()

      // Copy link to clipboard
      const url = getShareUrl(result.shareToken)
      await navigator.clipboard.writeText(url)
      message.info(t.share?.linkCopied || '链接已复制到剪贴板')
    } else {
      message.error(t.share?.createFailed || '创建分享链接失败')
    }

    setCreating(false)
  }

  const handleCopyLink = async (share: ShareLink) => {
    const url = getShareUrl(share.shareToken)
    await navigator.clipboard.writeText(url)
    message.success(t.share?.linkCopied || '链接已复制到剪贴板')
  }

  const handleDelete = async (shareId: string) => {
    const success = await deleteShareLink(shareId)
    if (success) {
      message.success(t.share?.deleteSuccess || '链接已删除')
      await loadShares()
    } else {
      message.error(t.share?.deleteFailed || '删除失败')
    }
  }

  const getTabIcon = (tab: { id: string }) => {
    const chart = currentProject?.radarCharts.find(r => r.id === tab.id)
    if (!chart) return <RadarChartOutlined />
    if (isVersionTimeline(chart)) return <HistoryOutlined />
    if (isTimelineRadar(chart)) return <HistoryOutlined />
    return <RadarChartOutlined />
  }

  const renderShareStatus = (share: ShareLink) => {
    const { valid, reason } = isShareLinkValid(share)
    if (valid) {
      return <Tag color="success">{t.share?.active || '有效'}</Tag>
    }
    return <Tag color="default">{reason || t.share?.inactive || '已失效'}</Tag>
  }

  const getSharedTabNames = (share: ShareLink) => {
    if (!share.sharedTabIds || share.sharedTabIds.length === 0) return null
    const tabNames = share.sharedTabIds
      .map(id => currentProject?.radarCharts.find(r => r.id === id)?.name)
      .filter(Boolean)
    return tabNames.join(', ')
  }

  if (!user) {
    return (
      <Modal
        title={t.share?.title || '分享'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={500}
      >
        <Empty
          description={t.share?.loginRequired || '请先登录后再分享'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Modal>
    )
  }

  // Show loading state while checking ownership
  if (isOwner === null) {
    return (
      <Modal
        title={t.share?.title || '分享'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={500}
      >
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">
            {t.common?.loading || '加载中...'}
          </Typography.Text>
        </div>
      </Modal>
    )
  }

  // Show message for non-owners
  if (!isOwner) {
    return (
      <Modal
        title={t.share?.title || '分享'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={500}
      >
        <Alert
          type="warning"
          showIcon
          message={t.share?.notOwner || '您不是此项目的所有者'}
          description={t.share?.notOwnerHint || '只有项目所有者可以创建和管理分享链接'}
        />
      </Modal>
    )
  }

  const tabItems = [
    {
      key: 'create',
      label: t.share?.createLink || '创建链接',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateShare}
          initialValues={{ shareType: 'readonly' }}
        >
          {/* Current Tab Info */}
          <Form.Item label={t.share?.sharingTab || '分享内容'}>
            <div className={styles.currentTabInfo}>
              {activeTab ? (
                <Tag icon={getTabIcon({ id: activeTab.id })} color="blue">
                  {activeTab.name}
                </Tag>
              ) : (
                <Typography.Text type="secondary">
                  {t.share?.noActiveTab || '未选择 Tab'}
                </Typography.Text>
              )}
            </div>
          </Form.Item>

          {/* Share Type */}
          <Form.Item
            name="shareType"
            label={t.share?.shareType || '分享类型'}
          >
            <Radio.Group>
              <Radio.Button value="readonly">
                <EyeOutlined /> {t.share?.readonly || '只读'}
              </Radio.Button>
              <Radio.Button value="editable">
                <EditOutlined /> {t.share?.editable || '可编辑'}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Editable share hint */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.shareType !== curr.shareType}>
            {({ getFieldValue }) =>
              getFieldValue('shareType') === 'editable' && (
                <Alert
                  type="info"
                  showIcon
                  message={t.share?.editableHint || '可编辑分享需要协作者登录后才能访问，修改会同步到原项目'}
                  style={{ marginBottom: 16 }}
                />
              )
            }
          </Form.Item>

          <Form.Item
            name="password"
            label={t.share?.password || '访问密码（可选）'}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t.share?.passwordPlaceholder || '留空则无需密码'}
            />
          </Form.Item>

          <Form.Item
            name="expiresAt"
            label={t.share?.expiry || '过期时间（可选）'}
          >
            <DatePicker
              showTime
              placeholder={t.share?.expiryPlaceholder || '留空则永不过期'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="maxViews"
            label={t.share?.maxViews || '最大访问次数（可选）'}
          >
            <InputNumber
              min={1}
              max={10000}
              placeholder={t.share?.maxViewsPlaceholder || '留空则不限制'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              icon={<LinkOutlined />}
              block
            >
              {t.share?.createAndCopy || '创建并复制链接'}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'manage',
      label: (
        <Space>
          {t.share?.manageLinks || '管理链接'}
          {shares.length > 0 && <Tag>{shares.length}</Tag>}
        </Space>
      ),
      children: (
        <List
          loading={loading}
          dataSource={shares}
          locale={{ emptyText: t.share?.noLinks || '暂无分享链接' }}
          renderItem={(share) => (
            <List.Item
              actions={[
                <Tooltip key="copy" title={t.share?.copyLink || '复制链接'}>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyLink(share)}
                  />
                </Tooltip>,
                <Popconfirm
                  key="delete"
                  title={t.share?.confirmDelete || '确定删除此链接？'}
                  onConfirm={() => handleDelete(share.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space wrap>
                    <Typography.Text code>
                      {share.shareToken}
                    </Typography.Text>
                    {renderShareStatus(share)}
                    <Tag color={share.shareType === 'readonly' ? 'blue' : 'green'}>
                      {share.shareType === 'readonly'
                        ? t.share?.readonly || '只读'
                        : t.share?.editable || '可编辑'}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    {getSharedTabNames(share) && (
                      <span>
                        <FileOutlined /> {getSharedTabNames(share)}
                      </span>
                    )}
                    <Space size="large">
                      <span>
                        <EyeOutlined /> {share.viewCount}
                        {share.maxViews && ` / ${share.maxViews}`}
                      </span>
                      {share.expiresAt && (
                        <span>
                          <ClockCircleOutlined /> {new Date(share.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {share.password && (
                        <span>
                          <LockOutlined /> {t.share?.hasPassword || '有密码'}
                        </span>
                      )}
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'collaborators',
      label: (
        <Space>
          <TeamOutlined />
          {t.share?.collaborators || '协作者'}
          {collaborators.length > 0 && <Tag>{collaborators.length}</Tag>}
        </Space>
      ),
      children: (
        <List
          loading={collaboratorsLoading}
          dataSource={collaborators}
          locale={{ emptyText: t.share?.noCollaborators || '暂无协作者' }}
          renderItem={(collab) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="remove"
                  title={t.share?.confirmRemoveCollaborator || '确定移除此协作者？'}
                  onConfirm={() => handleRemoveCollaborator(collab.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    <Typography.Text>{collab.name || collab.email || collab.userId}</Typography.Text>
                    <Tag color={collab.role === 'editor' ? 'green' : 'blue'}>
                      {collab.role === 'editor'
                        ? (t.share?.editable || '可编辑')
                        : (t.share?.readonly || '只读')}
                    </Tag>
                  </Space>
                }
                description={
                  <Space>
                    {collab.email && <span>{collab.email}</span>}
                    <span>
                      {t.share?.joinedAt || '加入时间'}: {new Date(collab.joinedAt).toLocaleDateString()}
                    </span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined />
          {t.share?.title || '分享'}
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Tabs items={tabItems} />
    </Modal>
  )
}
