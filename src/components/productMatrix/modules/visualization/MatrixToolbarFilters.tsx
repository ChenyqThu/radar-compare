import { useMemo } from 'react'
import { Popover, Button, Slider, Space } from 'antd'
import { DollarOutlined, TeamOutlined, AppstoreOutlined } from '@ant-design/icons'
import { NotionIcon } from '../../common/NotionIcon'
import { useI18n } from '@/locales'
import { MatrixDimension, MatrixVendor, PRODUCT_STATUS_CONFIG, ProductStatus } from '@/types/productMatrix'
import styles from './MatrixChart.module.css'
import { FilterDropdown } from '../../common/FilterDropdown'

export interface FilterState {
    status: Set<ProductStatus>
    priceRange: [number, number] | null
    tags: Record<string, Set<string>>
}

interface MatrixToolbarFiltersProps {
    dimensions: MatrixDimension[]
    vendors: MatrixVendor[]
    xAxisId: string
    yAxisId: string
    filters: FilterState
    onFilterChange: (newFilters: FilterState) => void
    hiddenVendors: Set<string>
    onSetVisibleVendors: (visibleIds: string[]) => void
    minPrice: number
    maxPrice: number
}

// Helper getIcon removed (NotionIcon used directly)

export function MatrixToolbarFilters({
    dimensions,
    vendors,
    xAxisId,
    yAxisId,
    filters,
    onFilterChange,
    hiddenVendors,
    onSetVisibleVendors,
    minPrice,
    maxPrice,
}: MatrixToolbarFiltersProps) {
    const { t } = useI18n()

    // --- Status Filter ---
    const statusParams = useMemo(() => {
        const options = Object.entries(PRODUCT_STATUS_CONFIG).map(([key, config]) => ({
            label: (
                <Space>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.color, display: 'inline-block' }} />
                    {config.label}
                </Space>
            ),
            value: key,
            searchKey: config.label, // For searching
        }))
        return { options }
    }, [])

    const handleStatusChange = (vals: Set<string>) => {
        onFilterChange({ ...filters, status: new Set(vals as unknown as ProductStatus[]) })
    }

    // --- Vendor Filter ---
    const vendorParams = useMemo(() => {
        const options = vendors.map(v => ({
            label: v.name,
            value: v.id,
        }))
        return { options }
    }, [vendors])

    const visibleVendorIds = useMemo(() => {
        return new Set(vendors.filter(v => !hiddenVendors.has(v.id)).map(v => v.id))
    }, [vendors, hiddenVendors])

    const handleVendorChange = (visibleSet: Set<string>) => {
        // visibleSet contains IDs of visible vendors
        onSetVisibleVendors(Array.from(visibleSet))
    }

    // --- Dynamic Dimension Filters ---
    const unusedDimensions = useMemo(() => {
        return dimensions.filter(d =>
            d.id !== xAxisId &&
            d.id !== yAxisId &&
            d.type === 'discrete' &&
            d.options && d.options.length > 0
        )
    }, [dimensions, xAxisId, yAxisId])

    const handleTagChange = (dimId: string, vals: Set<string>) => {
        const newTags = { ...filters.tags }
        if (vals.size === 0) {
            delete newTags[dimId]
        } else {
            newTags[dimId] = vals
        }
        onFilterChange({ ...filters, tags: newTags })
    }

    // --- Price Popover Content ---
    const priceContent = (
        <div style={{ padding: '8px 16px', width: 220 }}>
            <Slider
                range
                min={minPrice}
                max={maxPrice}
                value={filters.priceRange || [minPrice, maxPrice]}
                onChange={(val) => onFilterChange({ ...filters, priceRange: val as [number, number] })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#999', fontSize: 12 }}>
                <span>{filters.priceRange?.[0] ?? minPrice}</span>
                <span>{filters.priceRange?.[1] ?? maxPrice}</span>
            </div>
        </div>
    )

    const priceLabel = filters.priceRange
        ? `${t.productMatrix?.price || 'Price'}: ${filters.priceRange[0]} - ${filters.priceRange[1]}`
        : t.productMatrix?.price || 'Price'

    // Customize Price Trigger to match FilterDropdown style
    const PriceTrigger = (
        <Button
            type="text"
            icon={<DollarOutlined />}
            className={`${filters.priceRange ? styles.activeFilter : ''}`} // We might need to match inline styles from FilterDropdown manually or export styles
            style={filters.priceRange ? { color: '#1890ff', background: '#e6f7ff', borderRadius: 4 } : { borderRadius: 4, color: '#37352f' }}
        >
            {priceLabel}
        </Button>
    )

    return (
        <Space wrap>
            {/* 1. Vendor */}
            <FilterDropdown
                label={t.productMatrix?.allVendors || 'Vendors'}
                icon={<TeamOutlined />}
                options={vendorParams.options}
                selectedValues={visibleVendorIds}
                onChange={handleVendorChange}
            />

            {/* 2. Status */}
            <FilterDropdown
                label={t.productMatrix?.allStatuses || 'Status'}
                icon={<AppstoreOutlined />}
                options={statusParams.options}
                selectedValues={new Set(Array.from(filters.status))}
                onChange={handleStatusChange}
            />

            {/* 3. Dynamic Dimensions */}
            {unusedDimensions.map(dim => (
                <FilterDropdown
                    key={dim.id}
                    label={dim.name}
                    icon={<NotionIcon icon={dim.icon} variant="text" size={18} iconSize={13} />}
                    options={(dim.options || []).map(o => ({ label: o.label, value: o.value }))}
                    selectedValues={filters.tags[dim.id] || new Set()}
                    onChange={(vals) => handleTagChange(dim.id, vals)}
                />
            ))}

            {/* 4. Price (Special) */}
            <Popover content={priceContent} trigger="click" placement="bottomLeft">
                {PriceTrigger}
            </Popover>
        </Space>
    )
}
