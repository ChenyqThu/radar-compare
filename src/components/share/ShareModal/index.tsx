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
} from 'antd'
import {
  LinkOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  LockOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import {
  createShareLink,
  getProjectShares,
  deleteShareLink,
  getShareUrl,
  isShareLinkValid,
  type ShareLink,
  type ShareType,
  type CreateShareOptions,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/locales'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

export function ShareModal({ open, onClose, projectId, projectName }: ShareModalProps) {
  const { user } = useAuthStore()
  const { t } = useI18n()
  const [form] = Form.useForm()
  const [shares, setShares] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Load existing shares
  useEffect(() => {
    if (open && projectId) {
      loadShares()
    }
  }, [open, projectId])

  const loadShares = async () => {
    setLoading(true)
    const result = await getProjectShares(projectId)
    setShares(result)
    setLoading(false)
  }

  const handleCreateShare = async (values: {
    shareType: ShareType
    password?: string
    expiresAt?: Date
    maxViews?: number
  }) => {
    setCreating(true)

    const options: CreateShareOptions = {
      projectId,
      shareType: values.shareType,
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

  const renderShareStatus = (share: ShareLink) => {
    const { valid, reason } = isShareLinkValid(share)
    if (valid) {
      return <Tag color="success">{t.share?.active || '有效'}</Tag>
    }
    return <Tag color="default">{reason || t.share?.inactive || '已失效'}</Tag>
  }

  if (!user) {
    return (
      <Modal
        title={t.share?.title || '分享项目'}
        open={open}
        onCancel={onClose}
        footer={null}
        width={500}
      >
        <Empty
          description={t.share?.loginRequired || '请先登录后再分享项目'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
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
                  <Space>
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
          {t.share?.title || '分享项目'}
          <Typography.Text type="secondary">- {projectName}</Typography.Text>
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
