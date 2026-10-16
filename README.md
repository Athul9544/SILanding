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
| `app.js` | Enquiry modal behaviour (the only script on the page) |
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

## Notes

- Fonts are Archivo (headings) and Inter (body), loaded from Google Fonts.
- The modal has a compact variant under `@media (max-height: 680px)` so the form
  fits short windows without scrolling. If you add fields, re-check both variants.
