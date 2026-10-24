# SILanding

Single-page landing site for **SketchUp Intelligence** — an AI modelling tool that turns
floor plans, geometry and reference imagery into 3D SketchUp models.

Static HTML, CSS and vanilla JavaScript. No build step, no dependencies.

## Running it

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8000
# http://localhost:8000
```

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Full page markup plus the enquiry modal |
| `styles.css` | All styling, including the responsive and modal rules |
| `app.js` | Scroll reveal, the pinned About section, and enquiry modal behaviour |
| `capabilities/*.html` | One detail page per capability, linked from the cards |
| `vercel.json` | Git deployments turned **off** (see below) |
| `assets/logo.png` | Brand mark, transparent |
| `assets/interior.jpg` | Hero artwork |
| `assets/einstein.png` | Mascot, cut out with an alpha channel |

## How the layout scales

The page is authored against a fixed **1672 × 941** reference composition. Every
measurement is written in reference pixels via a scale unit:

```css
:root { --s: 1px; }
@media (max-width: 1680px) { :root { --s: calc(100vw / 1672); } }

h1 { font-size: calc(81 * var(--s)); }
```

So the design is pixel-exact at 1672px wide and scales proportionally below it,
which keeps the hero composition intact instead of reflowing. Below **1024px** a
separate stacked layout takes over and `--s` resets to `1px`.

If you are changing hero spacing, edit the reference numbers — not the computed
values — so the proportions hold at every width.

## Enquiry modal

`Get Started` opens the modal. `app.js` handles open/close (button, backdrop,
`Escape`), body scroll locking, focus management and trapping, inline validation
and the success state.

`index.html#get-started` deep-links straight to the open modal, which is handy
when working on it.

### Wiring up submissions

The form currently validates and shows a success panel but **sends nothing**.
To connect a backend, POST the payload in the submit handler in `app.js`:

```js
var payload = Object.fromEntries(new FormData(form).entries());
// fetch('/api/enquiries', { method: 'POST', body: JSON.stringify(payload) })
```

## The pinned About section

`01 / About the Intelligence` holds still while you scroll past it, and the two
claim cards fly in from the bottom corners during the hold. `.intro-pin` is the
runway — the height it has over `100vh` is how long the section stays put — and
`.intro-stick` is what sticks.

The flight is driven from `app.js`, not by a CSS scroll timeline, so it behaves
the same in every browser. `hold()` returns 0 the moment the section locks and 1
as it lets go; the cards travel between 8% and 62% of that. The module takes the
two cards off the reveal module by removing their `data-reveal`, so only one
thing ever moves them, and it drops its inline transform once a card lands so
the hover lift works again.

It only engages above `681px` wide and `640px` tall, and never under
`prefers-reduced-motion`. Anywhere else the cards keep the ordinary timed
reveal. `window.__introScrub` exposes `frame()` and `hold()` so the animation
can be stepped through without faking scroll events.

Note that `.intro` uses `overflow: clip`, not `hidden` — `hidden` would make it
a scroll container and the sticky element inside would have nothing to stick
against.

## Capability pages

Each card in the capabilities grid has an arrow button linking to its own page
under `capabilities/`. Those pages are plain static HTML — there is no build
step — but they were generated from a single template so they stay consistent.
If you change the shared layout, change it in every file, or regenerate them.

## Deployments

`vercel.json` sets `git.deploymentEnabled: true`, so pushing to `main`
triggers a Vercel deployment. Set it to `false` to pause them.

Note that the dashboard is the authoritative control: if a project has branch
tracking disabled, Vercel may ignore `vercel.json` entirely. Project → Settings
→ Git is the place to check if a push does not deploy as expected.

## Notes

- Fonts are Archivo (headings) and Inter (body), loaded from Google Fonts.
- The modal has a compact variant under `@media (max-height: 680px)` so the form
  fits short windows without scrolling. If you add fields, re-check both variants.
