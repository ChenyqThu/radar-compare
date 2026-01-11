import { Modal, Button, Divider, Form, Input, Tabs, message } from 'antd'
import { GoogleOutlined, MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/locales'
import styles from './LoginModal.module.css'

// Notion icon component
function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.454-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  )
}

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithNotion, signInWithEmail, signUpWithEmail, isLoading, error, clearError } = useAuthStore()
  const { t } = useI18n()
  const [form] = Form.useForm()

  const handleGoogleLogin = async () => {
    await signInWithGoogle()
  }

  const handleNotionLogin = async () => {
    await signInWithNotion()
  }

  const handleEmailLogin = async (values: { email: string; password: string }) => {
    await signInWithEmail(values.email, values.password)
    if (!useAuthStore.getState().error) {
      message.success(t.auth?.loginSuccess || '登录成功')
      onClose()
    }
  }

  const handleEmailSignUp = async (values: { email: string; password: string }) => {
    await signUpWithEmail(values.email, values.password)
    if (!useAuthStore.getState().error) {
      message.success(t.auth?.signUpSuccess || '注册成功，请查收验证邮件')
      onClose()
    }
  }

  const handleClose = () => {
    clearError()
    form.resetFields()
    onClose()
  }

  const tabItems = [
    {
      key: 'login',
      label: t.auth?.login || '登录',
      children: (
        <Form form={form} onFinish={handleEmailLogin} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t.auth?.emailRequired || '请输入邮箱' },
              { type: 'email', message: t.auth?.emailInvalid || '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t.auth?.emailPlaceholder || '邮箱'}
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t.auth?.passwordRequired || '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t.auth?.passwordPlaceholder || '密码'}
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
              {t.auth?.login || '登录'}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'signup',
      label: t.auth?.signUp || '注册',
      children: (
        <Form form={form} onFinish={handleEmailSignUp} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t.auth?.emailRequired || '请输入邮箱' },
              { type: 'email', message: t.auth?.emailInvalid || '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t.auth?.emailPlaceholder || '邮箱'}
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: t.auth?.passwordRequired || '请输入密码' },
              { min: 6, message: t.auth?.passwordMinLength || '密码至少 6 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t.auth?.passwordPlaceholder || '密码'}
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
              {t.auth?.signUp || '注册'}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ]

  return (
    <Modal
      title={t.auth?.loginTitle || '登录到 Radar Compare'}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={400}
      centered
    >
      <div className={styles.container}>
        <div className={styles.oauthButtons}>
          <Button
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            loading={isLoading}
            block
            size="large"
            className={styles.googleBtn}
          >
            {t.auth?.continueWithGoogle || '使用 Google 登录'}
          </Button>
          <Button
            icon={<NotionIcon />}
            onClick={handleNotionLogin}
            loading={isLoading}
            block
            size="large"
            className={styles.notionBtn}
          >
            {t.auth?.continueWithNotion || '使用 Notion 登录'}
          </Button>
        </div>

        <Divider plain>{t.auth?.orContinueWith || '或'}</Divider>

        <Tabs items={tabItems} centered />

        {error && <div className={styles.error}>{error}</div>}

        <p className={styles.hint}>
          {t.auth?.offlineHint || '未登录时数据仅保存在本地'}
        </p>
      </div>
    </Modal>
  )
}
