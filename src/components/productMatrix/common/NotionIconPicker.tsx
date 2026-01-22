import { useState, useMemo } from 'react'
import { Popover, Input, Empty } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import * as AntdIcons from '@ant-design/icons'
// Import a larger set of icons manually or filter from AntdIcons keys
// For safety and bundle size, we usually pick a curated list, but here we can try to pick a broad set.
// We will filter AntdIcons for "Outlined" icons to keep style consistent.

// Notion-like Colors
const NOTION_COLORS = [
    '#999999', // Default Gray
    '#E06C75', // Red
    '#E5C07B', // Yellow
    '#98C379', // Green
    '#61AFEF', // Blue
    '#C678DD', // Purple
    '#56B6C2', // Cyan
    '#D19A66', // Orange
    '#ABB2BF', // Light Gray
    '#F0F0F0', // Very Light Gray
]

// Common Icons (Curated list for relevance)
const ICON_KEYS = [
    'TagOutlined', 'TagsOutlined', 'AppstoreOutlined', 'BarsOutlined',
    'UserOutlined', 'TeamOutlined', 'SolutionOutlined', 'ShopOutlined',
    'BankOutlined', 'CameraOutlined', 'CloudOutlined', 'CodeOutlined',
    'CoffeeOutlined', 'CommentOutlined', 'CompassOutlined', 'CreditCardOutlined',
    'DashboardOutlined', 'DatabaseOutlined', 'DeleteOutlined', 'DesktopOutlined',
    'DollarOutlined', 'EditOutlined', 'EnvironmentOutlined', 'ExperimentOutlined',
    'EyeOutlined', 'FileOutlined', 'FileTextOutlined', 'FireOutlined',
    'FlagOutlined', 'FolderOutlined', 'FolderOpenOutlined', 'FrownOutlined',
    'FunnelPlotOutlined', 'GiftOutlined', 'GlobalOutlined', 'GoldOutlined',
    'HeartOutlined', 'HomeOutlined', 'HourglassOutlined', 'IdcardOutlined',
    'InboxOutlined', 'InfoCircleOutlined', 'KeyOutlined', 'LaptopOutlined',
    'LayoutOutlined', 'LikeOutlined', 'LinkOutlined', 'LoadingOutlined',
    'LockOutlined', 'MailOutlined', 'ManOutlined', 'MehOutlined',
    'MenuOutlined', 'MessageOutlined', 'MobileOutlined', 'MoneyCollectOutlined',
    'MonitorOutlined', 'MoreOutlined', 'NotificationOutlined', 'NumberOutlined',
    'PaperClipOutlined', 'PercentageOutlined', 'PhoneOutlined', 'PictureOutlined',
    'PieChartOutlined', 'PlayCircleOutlined', 'PlusOutlined', 'PoweroffOutlined',
    'PrinterOutlined', 'ProjectOutlined', 'PushpinOutlined', 'QuestionCircleOutlined',
    'ReadOutlined', 'ReloadOutlined', 'RestOutlined', 'RobotOutlined',
    'RocketOutlined', 'SaveOutlined', 'ScanOutlined', 'ScheduleOutlined',
    'SearchOutlined', 'SendOutlined', 'SettingOutlined', 'ShareAltOutlined',
    'ShoppingCartOutlined', 'SkinOutlined', 'SmileOutlined', 'SoundOutlined',
    'StarOutlined', 'StockOutlined', 'StopOutlined', 'SyncOutlined',
    'TableOutlined', 'TabletOutlined', 'ThunderboltOutlined', 'ToolOutlined',
    'TrophyOutlined', 'UnlockOutlined', 'UploadOutlined', 'UsbOutlined',
    'VideoCameraOutlined', 'WalletOutlined', 'WarningOutlined', 'WifiOutlined',
    'WomanOutlined', 'ZoomInOutlined', 'ZoomOutOutlined'
]

interface NotionIconPickerProps {
    icon: string
    color: string
    onChange: (icon: string, color: string) => void
    variant?: 'filled' | 'text'
}

export function NotionIconPicker({ icon, color, onChange, variant = 'filled' }: NotionIconPickerProps) {
    const [open, setOpen] = useState(false)
    const [searchText, setSearchText] = useState('')

    // Render selected icon
    const SelectedIconCmp = (AntdIcons as any)[icon] || AntdIcons.TagOutlined
    const isText = variant === 'text'

    const filteredIcons = useMemo(() => {
        if (!searchText) return ICON_KEYS
        const lower = searchText.toLowerCase()
        return ICON_KEYS.filter(k => k.toLowerCase().includes(lower))
    }, [searchText])

    const content = (
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', height: isText ? 240 : 320 }}>
            {/* Search */}
            <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Search icons..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 12, borderRadius: 4 }}
            />

            {/* Colors (Top Section) - Only show if not text variant */}
            {!isText && (
                <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Background Color</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {NOTION_COLORS.map(c => (
                            <div
                                key={c}
                                onClick={() => onChange(icon, c)}
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    backgroundColor: c,
                                    cursor: 'pointer',
                                    border: color === c ? '2px solid #1890ff' : '1px solid rgba(0,0,0,0.1)',
                                    boxShadow: color === c ? '0 0 0 1px #fff inset' : 'none'
                                }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Icons Grid */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Icons</div>
                {filteredIcons.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {filteredIcons.map(iconKey => {
                            const IconCmp = (AntdIcons as any)[iconKey]
                            const isSelected = icon === iconKey
                            return (
                                <div
                                    key={iconKey}
                                    onClick={() => onChange(iconKey, color)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 32,
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? 'rgba(0,0,0,0.05)' : 'transparent',
                                        fontSize: 18,
                                        color: '#333'
                                    }}
                                    title={iconKey}
                                >
                                    <IconCmp />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No icons found" />
                )}
            </div>
        </div>
    )

    return (
        <Popover
            content={content}
            trigger="click"
            placement="bottomLeft"
            open={open}
            onOpenChange={setOpen}
            overlayInnerStyle={{ padding: 12 }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isText ? 20 : 24,
                    height: isText ? 20 : 24,
                    borderRadius: 4,
                    backgroundColor: isText ? 'transparent' : color,
                    cursor: 'pointer',
                    color: isText ? '#666' : '#fff', // Use gray for text variant trigger
                    fontSize: 14,
                    transition: 'all 0.2s'
                }}
            >
                <SelectedIconCmp />
            </div>
        </Popover>
    )
}
