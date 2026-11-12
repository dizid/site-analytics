/**
 * Runs `worker` over `items` with at most `limit` running at the same time,
 * keeping the results in input order.
 *
 * Once `deadline` (a Date.now() timestamp) has passed, no new item is started:
 * `onSkip` gives its result instead. Used by /api/analytics so an account with
 * hundreds of GA4 properties returns what it loaded before Netlify's 60 s
 * function limit, instead of timing out with nothing.
 *
 * `worker` should not throw (a throw rejects the whole run).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  options: { deadline?: number; onSkip?: (item: T, index: number) => R } = {}
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function lane(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      const item = items[index]
      if (options.deadline !== undefined && options.onSkip && Date.now() > options.deadline) {
        results[index] = options.onSkip(item, index)
        continue
      }
      results[index] = await worker(item, index)
    }
  }

  const laneCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: laneCount }, lane))
  return results
}
