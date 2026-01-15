// Demo data for Landing Page radar chart showcase
// Supports both English and Chinese

export interface DemoDimension {
  id: string
  name: string
  nameZh: string
  weight: number
}

export interface DemoVendor {
  id: string
  name: string
  nameZh: string
  color: string
  scores: Record<string, number>
}

export const DEMO_DIMENSIONS: DemoDimension[] = [
  { id: 'd1', name: 'Performance', nameZh: '性能', weight: 20 },
  { id: 'd2', name: 'Security', nameZh: '安全性', weight: 20 },
  { id: 'd3', name: 'Scalability', nameZh: '可扩展性', weight: 15 },
  { id: 'd4', name: 'User Experience', nameZh: '用户体验', weight: 20 },
  { id: 'd5', name: 'Integration', nameZh: '集成能力', weight: 15 },
  { id: 'd6', name: 'Cost Efficiency', nameZh: '成本效益', weight: 10 },
]

export const DEMO_VENDORS: DemoVendor[] = [
  {
    id: 'v1',
    name: 'Product A',
    nameZh: '产品 A',
    color: '#5470c6',
    scores: { d1: 8.5, d2: 7.2, d3: 9.0, d4: 6.8, d5: 7.5, d6: 8.0 },
  },
  {
    id: 'v2',
    name: 'Product B',
    nameZh: '产品 B',
    color: '#91cc75',
    scores: { d1: 7.0, d2: 8.8, d3: 6.5, d4: 8.2, d5: 9.0, d6: 6.5 },
  },
  {
    id: 'v3',
    name: 'Product C',
    nameZh: '产品 C',
    color: '#fac858',
    scores: { d1: 9.2, d2: 6.5, d3: 7.8, d4: 7.5, d5: 6.0, d6: 9.0 },
  },
]
