# Exist B&W

Black and white, done in the browser. Drop in a photo, get it back in monochrome. Nothing is uploaded, nothing is stored, and there is no account.

**[Open the app](https://existye4t.github.io/exist-bw/)**

## What it does

Every pixel is weighed by perceived brightness rather than averaged. Green carries most of the luminance, blue almost none, which is how the eye actually reads a scene. The formula is the Rec. 709 luma:

```
Y = 0.2126·R + 0.7152·G + 0.0722·B
```

Four modes shape that gray before it reaches the file:

| Mode | What it does |
| --- | --- |
| Standard | The luma value, untouched. |
| Soft | Lifts the shadows and pulls the highlights back. |
| High Contrast | Pushes darks darker and lights lighter. |
| Cinematic | An S-curve with the blacks eased down. |

Brightness, contrast and exposure sit on top of the mode, each from −100 to +100. Contrast pivots around mid-gray, so a gray card stays put while the ends spread. Exposure is measured in stops.

Drag the divider on the preview to compare the original against the result.

## Formats

| | Read | Write |
| --- | --- | --- |
| JPEG | yes | yes |
| PNG | yes, transparency kept | yes |
| WebP | yes | yes |
| GIF | yes, including animation | yes |
| BMP | yes | as PNG |
| TIFF | yes, first page | as PNG |
| AVIF / HEIC | yes | as PNG |

Animated GIFs are decoded frame by frame, composited the way a viewer would show them, converted, and encoded again with the original timing and loop count intact. A batch of files downloads as a single `.zip`.

TIFF and HEIC are decoded in the browser with `utif` and `libheif`. The decoders load only when a file of that type arrives, so they cost nothing otherwise.

## Privacy

Conversion runs entirely on your machine. A file is read into memory, drawn to a canvas, and handed back to you. The only network request the converter itself makes is none.

The page does load two things from outside: the typefaces, from Google Fonts, and the Discord presence card at the bottom, which opens a WebSocket to Lanyard. Neither receives your images.

## Languages

English and Turkish. The switch sits in the navigation bar and the choice is remembered. If you have never chosen, the page follows your browser language.

## Develop

Requires Node 20 or newer.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck, then bundle to dist/
npm run preview  # serve the production build
npm test         # grayscale math, no browser needed
```

### Layout

```
src/
  components/    React UI: converter, comparison slider, presence card
  utils/         grayscale math, image and GIF processing, downloads
  messages.ts    English and Turkish copy
  i18n.tsx       language state and persistence
public/          favicon and the GitHub Pages 404 page
tests/           regression tests for the conversion math
```

The conversion math lives in one file, `src/utils/grayscale.ts`. Everything else calls it. The tests in `tests/grayscale.test.mjs` mirror that file and run under plain Node, so a change to the formula fails there before it reaches a browser.

## Deployment

The site is published with GitHub Pages from the `main` branch. Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and deploys the `dist/` folder. The Vite `base` is `/exist-bw/`, matching the project-site URL.

The live address is [existye4t.github.io/exist-bw](https://existye4t.github.io/exist-bw/).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4. Image work uses the canvas API, `gifuct-js` and `gifenc` for GIFs, `utif` for TIFF, `heic2any` for HEIC, and `jszip` for batch downloads.

## License

MIT.
