import { Modal, Card, Typography, Space, Button, Tag } from 'antd'
import { CloudOutlined, DesktopOutlined, CheckOutlined } from '@ant-design/icons'
import { useSyncStore } from '@/stores/syncStore'
import { useI18n } from '@/locales'
import styles from './ConflictModal.module.css'

export function ConflictModal() {
  const { conflicts, resolveConflict } = useSyncStore()
  const { t } = useI18n()

  const currentConflict = conflicts[0]

  if (!currentConflict) return null

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleResolve = async (resolution: 'local' | 'remote') => {
    await resolveConflict(currentConflict.projectId, resolution)
  }

  return (
    <Modal
      title={
        <Space>
          <span>{t.sync?.conflictTitle || '数据冲突'}</span>
          <Tag color="warning">{conflicts.length} {t.sync?.conflictsCount || '个冲突'}</Tag>
        </Space>
      }
      open={!!currentConflict}
      footer={null}
      closable={false}
      maskClosable={false}
      width={600}
      centered
    >
      <div className={styles.container}>
        <Typography.Paragraph type="secondary">
          {t.sync?.conflictDescription || '项目在本地和云端都有更新，请选择保留哪个版本：'}
        </Typography.Paragraph>

        <Typography.Title level={5}>
          {currentConflict.projectName}
        </Typography.Title>

        <div className={styles.cards}>
          <Card
            className={styles.versionCard}
            hoverable
            onClick={() => handleResolve('local')}
          >
            <div className={styles.cardHeader}>
              <DesktopOutlined className={styles.icon} />
              <Typography.Text strong>
                {t.sync?.localVersion || '本地版本'}
              </Typography.Text>
            </div>
            <Typography.Text type="secondary" className={styles.time}>
              {t.sync?.updatedAt || '更新时间'}: {formatDate(currentConflict.localUpdatedAt)}
            </Typography.Text>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              block
              className={styles.selectBtn}
            >
              {t.sync?.keepLocal || '保留本地'}
            </Button>
          </Card>

          <Card
            className={styles.versionCard}
            hoverable
            onClick={() => handleResolve('remote')}
          >
            <div className={styles.cardHeader}>
              <CloudOutlined className={styles.icon} />
              <Typography.Text strong>
                {t.sync?.cloudVersion || '云端版本'}
              </Typography.Text>
            </div>
            <Typography.Text type="secondary" className={styles.time}>
              {t.sync?.updatedAt || '更新时间'}: {formatDate(currentConflict.remoteUpdatedAt)}
            </Typography.Text>
            <Button
              type="default"
              icon={<CheckOutlined />}
              block
              className={styles.selectBtn}
            >
              {t.sync?.keepCloud || '使用云端'}
            </Button>
          </Card>
        </div>

        <Typography.Text type="secondary" className={styles.hint}>
          {t.sync?.conflictHint || '提示：未选中的版本将被覆盖，此操作不可撤销'}
        </Typography.Text>
      </div>
    </Modal>
  )
}
