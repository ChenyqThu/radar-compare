import React, { useMemo, useState } from 'react'
import { Popover, Button, Checkbox, Input, Empty } from 'antd'
import { DownOutlined, SearchOutlined } from '@ant-design/icons'
import styles from './FilterDropdown.module.css'

interface FilterDropdownProps {
    label: string
    icon?: React.ReactNode
    options: { label: React.ReactNode; value: string; searchKey?: string }[]
    selectedValues: Set<string>
    onChange: (values: Set<string>) => void
    color?: string
}

export function FilterDropdown({
    label,
    icon,
    options,
    selectedValues,
    onChange,
    color = '#1890ff', // Active color
}: FilterDropdownProps) {
    const [open, setOpen] = useState(false)
    const [searchText, setSearchText] = useState('')

    const isActive = selectedValues.size > 0

    const triggerLabel = useMemo(() => {
        if (!isActive) return label

        // Find labels for selected values
        const selectedLabels = options
            .filter(o => selectedValues.has(o.value))
            .map(o => typeof o.label === 'string' ? o.label : o.value)

        if (selectedLabels.length === 0) return label

        const first = selectedLabels[0]
        const count = selectedLabels.length

        if (count === 1) return `${label}: ${first}`
        return `${label}: ${first} +${count - 1}`
    }, [isActive, label, options, selectedValues])

    const filteredOptions = useMemo(() => {
        if (!searchText) return options
        const lower = searchText.toLowerCase()
        return options.filter(o =>
            (o.searchKey || String(o.label)).toLowerCase().includes(lower)
        )
    }, [options, searchText])

    const content = (
        <div className={styles.dropdownContent}>
            <Input
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder={`Search ${label}...`}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={styles.searchInput}
                bordered={false}
            />
            <div className={styles.menu}>
                {filteredOptions.length > 0 ? (
                    filteredOptions.map(opt => {
                        const checked = selectedValues.has(opt.value)
                        return (
                            <div
                                key={opt.value}
                                className={styles.menuItem}
                                onClick={() => {
                                    const next = new Set(selectedValues)
                                    if (checked) next.delete(opt.value)
                                    else next.add(opt.value)
                                    onChange(next)
                                }}
                            >
                                <Checkbox checked={checked} style={{ marginRight: 8 }} />
                                <span className={styles.itemLabel}>{opt.label}</span>
                            </div>
                        )
                    })
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No options" className={styles.empty} />
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
            overlayClassName={styles.popover}
        >
            <Button
                type={isActive ? 'text' : 'text'}
                className={`${styles.trigger} ${isActive ? styles.active : ''} ${open ? styles.open : ''}`}
                style={isActive ? { color: color, background: '#e6f7ff' } : {}}
                icon={icon}
            >
                <span>{triggerLabel}</span>
                <DownOutlined className={styles.arrow} style={{ fontSize: 10, marginLeft: 4 }} />
            </Button>
        </Popover>
    )
}
