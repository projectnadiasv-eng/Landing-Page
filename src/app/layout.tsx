import type { Metadata } from 'next'
import './globals.css'
/* Loaded AFTER globals so the navy variable remap sits last. It only redefines
 * custom properties on each block's root id — see the file header. */
import './theme-navy.css'

/* Metadata lifted verbatim from legacy/index.html lines 6-10. */
export const metadata: Metadata = {
  title: 'Signal Pro | Understand what you own',
  description:
    'Signal Pro turns filings, earnings, insider activity and institutional flow into plain English for everyday investors. Not financial advice, educational purposes only.',
  openGraph: {
    title: 'Signal Pro | Understand what you own',
    description:
      'Filings, earnings, insider activity and institutional flow, explained in plain English.',
    type: 'website',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

/*
 * Fonts ship as a plain Google Fonts <link>, consolidated from the 11 requests
 * in legacy/index.html into one. This is deliberate and temporary.
 *
 * next/font generates a HASHED family name, so a module rule saying
 * font-family:'JetBrains Mono' would silently fall through to monospace with no
 * error. That is the highest silent-fidelity risk in this migration, so fonts
 * are held constant until every block is ported and the parity harness is green.
 * Migrating to next/font is its own phase, with a grep gate. See CLAUDE.md.
 */
const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600' +
  '&family=JetBrains+Mono:wght@400;500;600;700' +
  '&family=IBM+Plex+Mono:wght@400;500;600' +
  '&family=IBM+Plex+Sans:wght@400;500;600;700' +
  '&family=Inter:wght@400;500;600;700;800' +
  '&display=swap'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS} />
      </head>
      <body>{children}</body>
    </html>
  )
}
