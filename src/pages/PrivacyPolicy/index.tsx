import { Typography, Divider, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import styles from './PrivacyPolicy.module.css'
import { useI18n } from '@/locales'

const { Title, Paragraph, Text } = Typography

export function PrivacyPolicy() {
    const navigate = useNavigate()
    const { t } = useI18n()

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/')}
                    className={styles.backBtn}
                >
                    {t.auth?.backToLogin || 'Back'}
                </Button>
            </div>

            <div className={styles.content}>
                <Typography>
                    <Title level={1}>Privacy Policy</Title>
                    <Paragraph>
                        Last updated: {new Date().toLocaleDateString()}
                    </Paragraph>

                    <Divider />

                    <Title level={2}>1. Introduction</Title>
                    <Paragraph>
                        Welcome to Prism ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
                    </Paragraph>

                    <Title level={2}>2. Information We Collect</Title>
                    <Paragraph>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                    </Paragraph>
                    <ul>
                        <li>
                            <Text strong>Identity Data</Text> includes first name, last name, username or similar identifier.
                        </li>
                        <li>
                            <Text strong>Contact Data</Text> includes email address.
                        </li>
                        <li>
                            <Text strong>Technical Data</Text> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform and other technology on the devices you use to access this website.
                        </li>
                    </ul>

                    <Title level={2}>3. How We Use Your Data</Title>
                    <Paragraph>
                        We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                    </Paragraph>
                    <ul>
                        <li>To register you as a new customer.</li>
                        <li>To provide and maintain our service.</li>
                        <li>To manage our relationship with you.</li>
                    </ul>

                    <Title level={2}>4. Third-Party Services</Title>
                    <Paragraph>
                        We use third-party services for authentication and data storage:
                    </Paragraph>
                    <ul>
                        <li>
                            <Text strong>Supabase</Text>: We use Supabase for authentication and database services. Your data is stored securely on Supabase servers.
                        </li>
                        <li>
                            <Text strong>Google & GitHub</Text>: We use Google and GitHub OAuth for authentication. We only access your basic profile information (name, email, avatar) to create your account.
                        </li>
                    </ul>

                    <Title level={2}>5. Data Security</Title>
                    <Paragraph>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                    </Paragraph>

                    <Title level={2}>6. Contact Us</Title>
                    <Paragraph>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at our GitHub repository.
                    </Paragraph>
                </Typography>
            </div>
        </div>
    )
}
