# Kopi Order

\*[한국어](README.md) · **English\***

Learn how to order coffee at a Singapore hawker centre by tapping buttons.
It shows how an order like `Kopi C Siu Dai Peng` gets assembled, and what each word actually does to the drink in the cup.

**👉 Live: https://kopi-order.kopi-order-sg.workers.dev**

![The cup morphing into an iced glass and then a takeaway bag](public/demo.gif)

## Why

In Singapore the name of your coffee _is_ the recipe. `O` means no milk, `C` means evaporated milk, `Kosong` means no sugar, `Peng` means ice. String the words together in the right order and you have an order — but the first time you hear it, it sounds like a password.

Every explainer I found was a lookup table. It seemed like you'd understand it much faster if you could press a button and watch the cup change.

## What it does

- Pick a drink, milk, sweetness, strength, temperature and takeaway, and the order sentence assembles itself in the order a stall actually expects
- A cross-section of the cup fills with coffee, a band of milk, sugar cubes and ice, and updates live as you choose
- Hot drinks steam in a mug; ask for ice and the vessel morphs into a tall glass; ask for takeaway and it becomes a bag with a straw in it
- Choose condensed milk and the milk and sweetness sliders move together, because condensed milk _is_ the sugar. The app points out traps like this in a line under the cup
- There are two cats. The cream one sits to the right looking up at the cup — it breathes, flicks its tail and ears, and its eyes follow your cursor. When an ingredient goes in it leans toward the cup, then hops because it's pleased with itself
- The other one is asleep on the left. It only breathes. Hawker centres have cats lying around; that's just accurate
- Korean phonetic spellings plus browser text-to-speech, which prefers whichever installed voice sounds closest to Singlish
- Switches between Korean and English based on your browser language
- Etymology for every word, with the Chinese characters, pronunciation and meaning together — e.g. `少甜 (siu dai, less sweet)`

## How it's built

One HTML file and [GSAP](https://gsap.com). No build step, no framework.

When Webflow acquired GSAP, the plugins that used to cost money became free, and this app is designed around them. They're all vendored into `public/vendor/`, so it runs without a CDN. Only the fonts come from Google Fonts, and it falls back to system fonts if they're blocked.

Every drawing is inline SVG written by hand. There isn't a single raster image, so nothing goes soft on a high-density screen. The cats are meant to look drawn rather than plotted: their outlines carry an irregular `stroke-dasharray` so the line breaks up in places, with a very light turbulence warp (`feTurbulence` + `feDisplacementMap`) on top to take the ruled-edge look off the vectors.

- **MorphSVG** — the mug, the iced glass and the takeaway bag aren't three drawings. **One path travels between three shapes.** The `clipPath` that cuts the liquid to the inside of the vessel references that same path through `<use>`, so when the vessel morphs, the region the liquid is clipped to follows on its own.
- **Flip** — the selection marker isn't one per chip. **A single pill flies between them.** Move it in the DOM and Flip measures where it was and where it landed, then fills in the journey.
- **SplitText** — when the order changes, the sentence is split into characters that stand up one at a time, so it reads as something being assembled.
- **DrawSVG** — the counter line and the cup draw themselves on first load, and the pour stream runs down and retracts the same way. Not the cats, though: DrawSVG drives `stroke-dasharray` for its own purposes, and the cats are using that exact property for their broken outlines, so the two together erase the hand-drawn look. The cats rise into place instead.
- **Physics2D** — droplets that hit the surface are thrown by gravity, and ice cubes and sugar cubes fall, tumble and settle.
- **CustomEase · CustomBounce · CustomWiggle** — button press, the cup settling down, the ripple across the surface, the ear flick. None of those curves exist in the stock easings, so they're drawn by hand.
- **ScrollTrigger** — the glossary at the bottom rises into view a row at a time.

A few other decisions worth knowing about:

- The hand-wobble filter is applied **inside** the groups that move, not around them. That way the browser rasterises the filter once and just transforms the cached result. Put it on the outside and the turbulence is recomputed on every breath, and the frame rate goes with it. Breathing is a small translation rather than a scale for the same reason.
- Cup state updates immediately, independent of any animation. The animation is decoration, not the source of truth.
- New input kills the running timeline and rebuilds it, so hammering the buttons never leaves the cat in a half-finished pose.
- It only pours when the contents of the cup actually changed. Toggling takeaway has nothing to pour, so nothing pours.
- Anyone with `prefers-reduced-motion` on gets the result instantly, with no choreography.

## Running it locally

You can open `public/index.html` straight from disk. The speak button only works over HTTPS or on `localhost`.

```bash
npm install
npm run dev        # http://localhost:8787
```

## Tests

The suite launches real Chromium, clicks the actual chips, and checks that the vessel morphed to the right shape, the ice and sugar cube counts are correct, rapid clicking doesn't corrupt state, and no particles are left behind once the animation finishes.

```bash
npx playwright install chromium   # once
npm test
```

There's no jsdom here on purpose. This app leans on path length, `getBBox` and layout coordinates through MorphSVG, DrawSVG and Flip. A test that passes against a fake DOM wouldn't tell you anything.

After bumping GSAP, run `npm run vendor` to refresh `public/vendor/`.

## Deploying

It goes to Cloudflare Workers as static assets. Requests for static files aren't billed, so the free tier covers it comfortably.

```bash
npm run login      # opens a browser; no copying tokens around
npm run deploy     # about 30 seconds later, https://kopi-order.kopi-order-sg.workers.dev
```

After the first deploy, connect the repo under Cloudflare dashboard → Workers & Pages → kopi-order → Settings → Builds, and from then on a push is a deploy.

A custom domain attaches from Domains & Routes on the same screen.

## Caveats

- Prices are approximate. They vary by stall and they keep going up.
- `C` coming from Hainanese 鮮 is the most widely accepted account, but the etymology isn't settled.
- No browser ships a Singapore English voice. The app fakes one by respelling words phonetically and speaking them one at a time, so results depend on which voices your device has.

## License

MIT
