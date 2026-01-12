import { Modal, Button, Divider, Form, Input, message } from 'antd'
import { GoogleOutlined, GithubOutlined, MailOutlined, LockOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/locales'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './LoginModal.module.css'
import logoNew from '@/assets/logo_new.png'

// Notion icon component
function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.454-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  )
}

interface LoginModalProps {
  open: boolean
  onClose: () => void
  embedded?: boolean
}

type Mode = 'login' | 'signup'

export function LoginModal({ open, onClose, embedded = false }: LoginModalProps) {
  const { signInWithGoogle, signInWithGithub, signInWithNotion, signInWithEmail, signUpWithEmail, isLoading, error, clearError } = useAuthStore()
  const { t } = useI18n()
  const [form] = Form.useForm()
  const [mode, setMode] = useState<Mode>('login')

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setMode('login')
      form.resetFields()
      clearError()
    }
  }, [open, form, clearError])

  const handleGoogleLogin = async () => {
    await signInWithGoogle()
  }

  const handleGithubLogin = async () => {
    await signInWithGithub()
  }

  const handleNotionLogin = async () => {
    await signInWithNotion()
  }

  const handleEmailAuth = async (values: any) => {
    if (mode === 'login') {
      await signInWithEmail(values.email, values.password)
      if (!useAuthStore.getState().error) {
        message.success(t.auth?.loginSuccess || 'Logged in successfully')
        onClose()
      }
    } else {
      await signUpWithEmail(values.email, values.password, values.name)
      if (!useAuthStore.getState().error) {
        message.success(t.auth?.signUpSuccess || 'Registration successful, please check your email')
        onClose()
      }
    }
  }

  const switchMode = (newMode: Mode) => {
    clearError()
    setMode(newMode)
  }

  // Common Social Login Buttons
  const SocialButtons = () => (
    <div className={styles.socialSection}>
      <Divider plain className={styles.divider}>
        {t.auth?.orContinueWith || 'Or continue with'}
      </Divider>
      <div className={styles.oauthButtons}>
        <Button
          icon={<GoogleOutlined />}
          onClick={handleGoogleLogin}
          loading={isLoading}
          block
          size="large"
          className={styles.googleBtn}
        >
          {t.auth?.continueWithGoogle || 'Google'}
        </Button>
        <Button
          icon={<GithubOutlined />}
          onClick={handleGithubLogin}
          loading={isLoading}
          block
          size="large"
          className={styles.googleBtn} // Reusing googleBtn style (outline style)
        >
          {t.auth?.continueWithGithub || 'GitHub'}
        </Button>
        <Button
          icon={<NotionIcon />}
          onClick={handleNotionLogin}
          loading={isLoading}
          block
          size="large"
          className={styles.notionBtn}
        >
          {t.auth?.continueWithNotion || 'Notion'}
        </Button>
      </div>
    </div>
  )

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src={logoNew} alt="Logo" className={styles.logo} />
        <h2 className={styles.title}>{t.app?.productName || 'Product Evolution Platform'}</h2>
      </div>

      <div className={styles.slideContainer}>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'login' ? (
            <motion.div
              key="login"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={styles.formWrapper}
            >
              <Form form={form} onFinish={handleEmailAuth} layout="vertical" requiredMark={false}>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: '' },
                    { type: 'email', message: 'Invalid email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined className={styles.inputIcon} />}
                    placeholder={t.auth?.emailPlaceholder || 'Email'}
                    size="large"
                    className={styles.input}
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined className={styles.inputIcon} />}
                    placeholder={t.auth?.passwordPlaceholder || 'Password'}
                    size="large"
                    className={styles.input}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading} block size="large" className={styles.submitBtn}>
                  {t.auth?.login || 'Sign In'}
                </Button>
              </Form>

              <SocialButtons />

              <div className={styles.footer}>
                <span className={styles.footerText}>{t.auth?.noAccount || "Don't have an account?"}</span>
                <Button type="link" onClick={() => switchMode('signup')} className={styles.linkBtn}>
                  {t.auth?.signUp || 'Sign Up'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={styles.formWrapper}
            >
              <div className={styles.backBtnWrapper}>
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => switchMode('login')} className={styles.backBtn}>
                  {t.auth?.backToLogin || 'Back to Login'}
                </Button>
              </div>

              <Form form={form} onFinish={handleEmailAuth} layout="vertical" requiredMark={false}>
                <Form.Item
                  name="name"
                  rules={[{ required: true, message: t.auth?.nameRequired || 'Please enter your name' }]}
                >
                  <Input
                    prefix={<UserOutlined className={styles.inputIcon} />}
                    placeholder={t.auth?.fullName || 'Full Name'}
                    size="large"
                    className={styles.input}
                  />
                </Form.Item>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: t.auth?.emailRequired || 'Please enter email' },
                    { type: 'email', message: t.auth?.emailInvalid || 'Invalid email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined className={styles.inputIcon} />}
                    placeholder={t.auth?.emailPlaceholder || 'Email'}
                    size="large"
                    className={styles.input}
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: t.auth?.passwordRequired || 'Please enter password' },
                    { min: 6, message: t.auth?.passwordMinLength || 'Min 6 chars' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className={styles.inputIcon} />}
                    placeholder={t.auth?.passwordPlaceholder || 'Password'}
                    size="large"
                    className={styles.input}
                  />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: t.auth?.passwordRequired || 'Please confirm password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(t.auth?.passwordMatchError || 'Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className={styles.inputIcon} />}
                    placeholder={t.auth?.confirmPassword || 'Confirm Password'}
                    size="large"
                    className={styles.input}
                  />
                </Form.Item>

                <Button type="primary" htmlType="submit" loading={isLoading} block size="large" className={styles.submitBtn}>
                  {t.auth?.createAccount || 'Create Account'}
                </Button>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  )

  if (embedded) return content

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      className={styles.modal}
      maskClosable={true}
      destroyOnClose
    >
      {content}
    </Modal>
  )
}
