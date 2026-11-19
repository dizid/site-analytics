/**
 * POST /api/csp-report (T-0634)
 *
 * Collects Content-Security-Policy violation reports from browsers. The policy
 * runs in report-only mode first (netlify.toml), so nothing is blocked: this
 * endpoint only writes one short line per violation to the Netlify function
 * log, to see what a stricter policy would break before enforcing it.
 *
 * Accepts the classic `report-uri` body ({"csp-report": {...}}) and the newer
 * Reporting API body ([{ type: "csp-violation", body: {...} }]). Always answers
 * 204: browsers ignore the response, and a reporter must never get an error page.
 */

import type { Config } from '@netlify/functions'

// Bodies are small; anything larger is not a real CSP report.
const MAX_BODY_BYTES = 16_000

type Report = Record<string, unknown>

/** Keep log lines short and single-line (report fields are browser/attacker controlled). */
function clean(value: unknown, maxLength = 160): string {
  return String(value ?? '-').replace(/[\r\n\t]+/g, ' ').slice(0, maxLength)
}

/** Drop query strings and fragments: URLs in reports can carry tokens. */
function stripQuery(value: unknown): string {
  const text = clean(value, 300)
  return text.split(/[?#]/)[0]
}

function toReports(payload: unknown): Report[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is { type?: unknown; body?: unknown } => typeof item === 'object' && item !== null)
      .filter((item) => item.type === 'csp-violation' && typeof item.body === 'object' && item.body !== null)
      .map((item) => item.body as Report)
  }
  if (typeof payload === 'object' && payload !== null && 'csp-report' in payload) {
    const report = (payload as Record<string, unknown>)['csp-report']
    return typeof report === 'object' && report !== null ? [report as Report] : []
  }
  return []
}

export default async (request: Request): Promise<Response> => {
  const noContent = new Response(null, { status: 204 })
  if (request.method !== 'POST') return noContent

  const text = await request.text().catch(() => '')
  if (!text || text.length > MAX_BODY_BYTES) return noContent

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    return noContent
  }

  // Max 5 lines per request, so one big batch can't flood the log.
  for (const report of toReports(payload).slice(0, 5)) {
    const directive = report['effective-directive'] ?? report.effectiveDirective ?? report['violated-directive']
    const blocked = report['blocked-uri'] ?? report.blockedURL
    const page = report['document-uri'] ?? report.documentURL
    const source = report['source-file'] ?? report.sourceFile
    const line = report['line-number'] ?? report.lineNumber
    const sample = report['script-sample'] ?? report.sample
    console.warn(
      `csp-report: ${clean(report.disposition ?? 'report')} ${clean(directive, 40)}` +
        ` blocked=${stripQuery(blocked)} page=${stripQuery(page)}` +
        ` source=${stripQuery(source)}:${clean(line, 8)} sample=${clean(sample, 60)}`
    )
  }
  return noContent
}

export const config: Config = {
  path: '/api/csp-report',
  // Per visitor: real pages send a handful of reports; stops log flooding.
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] }
}
