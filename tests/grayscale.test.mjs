import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of src/utils/grayscale.ts. This file is the regression net for the
// conversion math; it runs under plain Node with no DOM. Keep the two in sync.

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const clamp = (v) => {
  const rounded = Math.round(v);
  return rounded < 0 ? 0 : rounded > 255 ? 255 : rounded;
};

function applyMode(gray, mode) {
  if (mode === 'soft') return gray * 0.9 + 25;
  if (mode === 'high-contrast') return clamp(gray < 128 ? gray * 0.75 : gray * 1.25 + 20);
  if (mode === 'cinematic') {
    const n = gray / 255;
    const curved = n < 0.5 ? 2 * n * n : 1 - Math.pow(-2 * n + 2, 2) / 2;
    return Math.max(0, curved * 255 - 8);
  }
  return gray;
}

function toneMap(gray, a) {
  const contrastIn = (a.contrast / 100) * 255;
  const contrastFactor = (259 * (contrastIn + 255)) / (255 * (259 - contrastIn));
  let v = applyMode(gray, a.mode) + (a.brightness / 100) * 255;
  v = contrastFactor * (v - 128) + 128;
  v = v * Math.pow(2, a.exposure / 50);
  return clamp(v);
}

const neutral = { mode: 'standard', brightness: 0, contrast: 0, exposure: 0 };

describe('perceptual grayscale', () => {
  it('weights green far above red and blue', () => {
    assert.ok(Math.abs(luma(0, 255, 0) - 182.376) < 1e-6);
    assert.ok(luma(255, 0, 0) < luma(0, 255, 0));
    assert.ok(luma(0, 0, 255) < luma(255, 0, 0));
  });

  it('maps pure white, black and mid-gray exactly with neutral controls', () => {
    assert.equal(toneMap(luma(255, 255, 255), neutral), 255);
    assert.equal(toneMap(luma(0, 0, 0), neutral), 0);
    assert.equal(toneMap(128, neutral), 128);
  });

  it('collapses red, green and blue of one pixel to a single gray', () => {
    const v = toneMap(luma(200, 40, 90), neutral);
    assert.ok(v > 60 && v < 100);
  });

  it('raises brightness without touching a zero setting', () => {
    assert.equal(toneMap(100, { ...neutral, brightness: 50 }), 228);
    assert.equal(toneMap(100, neutral), 100);
  });

  it('keeps mid-gray fixed when only contrast changes', () => {
    assert.equal(toneMap(128, { ...neutral, contrast: 80 }), 128);
    assert.ok(toneMap(200, { ...neutral, contrast: 80 }) > 200);
    assert.ok(toneMap(40, { ...neutral, contrast: 80 }) < 40);
  });

  it('doubles exposure at +50 and clamps at the top', () => {
    assert.ok(Math.abs(toneMap(60, { ...neutral, exposure: 50 }) - 120) < 1e-6);
    assert.equal(toneMap(200, { ...neutral, exposure: 50 }), 255);
  });

  it('soft mode lifts the shadows', () => {
    assert.ok(toneMap(0, { ...neutral, mode: 'soft' }) > 20);
  });

  it('high contrast pushes darks down and lights up', () => {
    assert.ok(toneMap(100, { ...neutral, mode: 'high-contrast' }) < 100);
    assert.ok(toneMap(180, { ...neutral, mode: 'high-contrast' }) > 180);
  });

  it('never leaves the 0-255 byte range', () => {
    for (const mode of ['standard', 'soft', 'high-contrast', 'cinematic']) {
      for (const brightness of [-100, 0, 100]) {
        for (const gray of [0, 1, 127, 128, 254, 255]) {
          const v = toneMap(gray, { mode, brightness, contrast: 100, exposure: 100 });
          assert.ok(v >= 0 && v <= 255, `${mode} ${brightness} ${gray} -> ${v}`);
        }
      }
    }
  });
});
