export {}

declare global {
  interface Window {
    /** legacy:987 — integration seam for a real quote feed. Assign in an effect, delete on teardown. */
    mktickApplyTick?: (symbol: string, price: number) => void
    /** legacy:1287 */
    vslsecPlay?: () => void
  }
}
