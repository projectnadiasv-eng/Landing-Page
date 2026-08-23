# Signal Pro — landing page

Single-page site, rebuilt as standalone HTML from ten Custom HTML/JavaScript
blocks in HighLevel (funnel "Signal Pro" → step "New Version").

No build step, no framework, no dependencies to install. Open `index.html`
in a browser and it runs.

## Files

```
index.html        the whole page — markup, styles, scripts and portraits inline
README.md         this file
```

All nine portraits are embedded directly in the HTML as base64 data URIs,
downscaled to 160px (they render at 46px and 38px). No image folder to keep
in sync, and nothing to place correctly on upload.

The eight members of Congress come from the GPO Member Guide via the
`unitedstates/images` collection — public domain, no attribution required.
The presidential portrait is an official White House photo, also a work of
the federal government.

## Page order

| # | Section | Anchor |
|---|---------|--------|
| 1 | Preloader — cream splash, removes itself after ~2.3s | — |
| 2 | Hero — scroll-expand video card, nav, "The Research Behind the Returns" | `#sehx2-root` |
| 3 | Market tape — dark scrolling ticker, equities + crypto | `#mktick-root` |
| 4 | Short film — play button, lazy-loaded video | `#spvsl-root` |
| 5 | Three questions — "before you finish your coffee" | `#sp3q-root` |
| 6 | Four screens — phone mockup carousel, drag to scrub | — |
| 7 | Social intelligence — X + Reddit feeds, sentiment dial | `#si-root` |
| 8 | Congressional trading — ranked cards | `#splive-root` |
| 9 | Pricing — Signal $27, Signal Pro $47 | `#sppricing-root` |
| 10 | Footer — legal, links, credits | `#spft-root` |

## Outstanding

### Media still hosted on HighLevel
Five assets load from `assets.cdn.filesafe.space`. They work today and break
if that account closes. Download from HighLevel → Media Storage, add to the
repo, update the paths.

- 3 videos — hero background, hero card, short film
- 1 image — beside the "3 questions" headline

Every portrait is now embedded. These four are all that remain external.

### Checkout leaves the site
The two pricing buttons point at HighLevel checkout pages. Edit the `LINKS`
object at the top of the pricing block's script to change them.

### Dead anchor
"Compare both plans in full" targets `#spsignup-root`, which doesn't exist on
this page. The code checks before scrolling, so the link does nothing.

### Placeholder social links
Both footer social icons point at `nadia-sv.com/app`. Marked `REPLACE` in the
source.

## Before this goes live

**Market ticker prices are simulated.** The tape ships with hardcoded values
and a `startDemoFeed()` function that moves them at random. It is labelled
"Live" and "Quotes delayed 15 min". Wire a real feed via
`window.mktickApplyTick(symbol, price)` and delete the demo call, or change
the labels.

**Named people carry unverified figures.** The congress cards and the phone
mockup attach specific profit numbers and "conflicts" counts to real,
identifiable politicians. Either source these from actual STOCK Act filings
or use fictional names.

**Photo licensing.** All nine embedded portraits are official government
photographs — public domain, free to use. This closes the licensing question
the original developer raised in a code comment.

## Credits

Built by Brandr. Rebuilt from HighLevel blocks into a standalone page.
