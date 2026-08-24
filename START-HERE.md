# Start here

Everything from the rebuild, in one folder.

## What to put in your GitHub repo

Only these three:

```
index.html
README.md
videos/signal-pro.mp4        ← keep it inside the videos folder
```

Drag the `videos` folder itself when you upload, not the file inside it.
If the mp4 lands in the root instead, the hero goes black.

## What NOT to upload

**preview-with-video.html** — a viewing copy with a 12-second clip baked
into it, so the hero plays without a separate video file. Useful for
checking the design on your own machine. Not for the repo.

**source-blocks/** — the ten original Custom HTML/JavaScript blocks copied
out of HighLevel, one file per block, in page order. `index.html` is built
from these. Keep them somewhere safe as a backup; you don't need them on
the site. If a section ever needs changing, the matching block file is the
cleanest place to start.

| File | Section |
|------|---------|
| block01 | Preloader |
| block02 | Hero — scroll-expand video |
| block03 | Market ticker |
| block04 | Short film |
| block05 | Three questions |
| block06 | Four screens carousel |
| block07 | Social intelligence |
| block08 | Congressional trading |
| block09 | Pricing |
| block10 | Footer |

## To see it before uploading

Double-click `preview-with-video.html`. It opens in your browser and runs
with no setup.

`index.html` also works by double-clicking, as long as the `videos` folder
is sitting next to it.

## Then

Read `README.md` — it lists what still needs doing before this points at a
real domain.
