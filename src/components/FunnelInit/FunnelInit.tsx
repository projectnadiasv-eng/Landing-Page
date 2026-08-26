'use client'

/* Fires the single 'pageview' event and starts the periodic/pagehide flush
   for src/lib/spro-analytics.ts. Renders nothing — this is the one place
   initFunnelTracking() gets called, so it runs exactly once regardless of
   how many other components later want to call track(). */

import { useEffect } from 'react'
import { initFunnelTracking } from '@/lib/spro-analytics'

export default function FunnelInit() {
  useEffect(() => initFunnelTracking(), [])
  return null
}
