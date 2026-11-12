import { describe, it, expect, vi, afterEach } from 'vitest'
import { mapWithConcurrency } from '../netlify/functions/lib/pool'

const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

describe('mapWithConcurrency', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps results in input order even when later items finish first', async () => {
    const results = await mapWithConcurrency([30, 5, 15, 1], 4, async (ms) => {
      await tick(ms)
      return ms * 2
    })
    expect(results).toEqual([60, 10, 30, 2])
  })

  it('never runs more than `limit` workers at once, and runs them in parallel', async () => {
    let running = 0
    let maxRunning = 0
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 8, async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await tick(2)
      running--
      return null
    })
    expect(maxRunning).toBe(8)
  })

  it('handles an empty list and a limit larger than the list', async () => {
    expect(await mapWithConcurrency([], 8, async () => 1)).toEqual([])
    expect(await mapWithConcurrency(['a'], 8, async (x) => x.toUpperCase())).toEqual(['A'])
  })

  it('skips items not started before the deadline, using onSkip', async () => {
    const started: number[] = []
    const deadline = Date.now() + 25
    const results = await mapWithConcurrency(
      [0, 1, 2, 3, 4, 5],
      2,
      async (i) => {
        started.push(i)
        await tick(20)
        return `loaded ${i}`
      },
      { deadline, onSkip: (i) => `skipped ${i}` }
    )
    // Lanes start 0+1, then 2+3 (~20 ms, before the deadline), then 4+5 after it
    expect(results.slice(0, 2)).toEqual(['loaded 0', 'loaded 1'])
    expect(results.slice(4)).toEqual(['skipped 4', 'skipped 5'])
    expect(started).not.toContain(4)
    expect(started).not.toContain(5)
  })

  it('without onSkip the deadline is ignored', async () => {
    const results = await mapWithConcurrency([1, 2], 1, async (x) => x, { deadline: 0 })
    expect(results).toEqual([1, 2])
  })
})
