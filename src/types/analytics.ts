export type DateRange = '7d' | '30d' | '90d'

export type ViewMode = 'cards' | 'table'

export type SortColumn = 'name' | 'sessions' | 'activeUsers' | 'newUsers' | 'screenPageViews' | 'bounceRate' | 'averageSessionDuration'

export type SortDirection = 'asc' | 'desc'

export interface DailyMetric {
  date: string
  sessions: number
  activeUsers: number
}

export interface TrafficSource {
  channel: string
  sessions: number
}

export interface PropertyMetrics {
  sessions: number
  activeUsers: number
  newUsers: number
  screenPageViews: number
  bounceRate: number
  averageSessionDuration: number
  trend: DailyMetric[]
}

export interface PropertyResult {
  propertyId: string
  displayName: string
  metrics: PropertyMetrics | null
  sources: TrafficSource[]
  error: string | null
}

export interface ReportResponse {
  generatedAt: string
  dateRange: DateRange
  properties: PropertyResult[]
}

export interface PropertyInfo {
  propertyId: string
  displayName: string
}

export interface UserInfo {
  email: string
  name: string
  picture: string
}
