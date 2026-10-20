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

/** Headline metrics for one period. */
export interface PeriodTotals {
  sessions: number
  activeUsers: number
  newUsers: number
  screenPageViews: number
  bounceRate: number
  averageSessionDuration: number
}

export interface PropertyMetrics extends PeriodTotals {
  /** Same metrics for the equally long period before this one (for % change). */
  previous?: PeriodTotals
  trend: DailyMetric[]
}

/** Where a property's numbers come from. */
export type DataSource = 'ga4' | 'cloudflare'

export interface PropertyResult {
  propertyId: string
  displayName: string
  websiteUrl?: string
  /**
   * Missing = 'ga4'. Cloudflare sites only have real values for sessions
   * (= visits) and screenPageViews (= pageviews); their other metrics are 0
   * placeholders — check hasMetric() (src/lib/sources.ts) before showing one.
   */
  source?: DataSource
  metrics: PropertyMetrics | null
  sources: TrafficSource[]
  error: string | null
}

export interface ReportResponse {
  generatedAt: string
  dateRange: DateRange
  properties: PropertyResult[]
}

/** GET /api/cloudflare — Cloudflare Web Analytics sites as PropertyResults. */
export interface CloudflareReportResponse extends ReportResponse {
  /** One-line setup/status hint, only ever sent to the Cloudflare owner. */
  notice?: string | null
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

export interface PageStats {
  pagePath: string
  pageviews: number
  /** GA4 only — Cloudflare has no bounce rate. */
  bounceRate?: number
}

/** Cloudflare only: visits per referring host ("(direct)" = no referrer). */
export interface ReferrerStats {
  referrer: string
  sessions: number
}

export interface DeviceBreakdown {
  device: string
  sessions: number
}

export interface CountryStats {
  country: string
  sessions: number
}

export interface PropertyDetail {
  propertyId: string
  pages: PageStats[]
  devices: DeviceBreakdown[]
  countries: CountryStats[]
  /** Cloudflare only (GA4 shows channels from the overview instead). */
  referrers?: ReferrerStats[]
}

export interface DetailResponse {
  generatedAt: string
  dateRange: DateRange
  detail: PropertyDetail
}
