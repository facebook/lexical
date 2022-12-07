"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compare = compare;
var _colorUtils = require("./colorUtils");
var _imageChannel = require("./imageChannel");
var _stats = require("./stats");
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const SSIM_WINDOW_RADIUS = 5;
const VARIANCE_WINDOW_RADIUS = 1;
function drawPixel(width, data, x, y, r, g, b) {
  const idx = (y * width + x) * 4;
  data[idx + 0] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = 255;
}
function compare(actual, expected, diff, width, height, options) {
  const {
    maxColorDeltaE94
  } = options;
  const [r1, g1, b1] = _imageChannel.ImageChannel.intoRGB(width, height, expected);
  const [r2, g2, b2] = _imageChannel.ImageChannel.intoRGB(width, height, actual);
  const drawRedPixel = (x, y) => drawPixel(width, diff, x, y, 255, 0, 0);
  const drawYellowPixel = (x, y) => drawPixel(width, diff, x, y, 255, 255, 0);
  const drawGrayPixel = (x, y) => {
    const gray = (0, _colorUtils.rgb2gray)(r1.get(x, y), g1.get(x, y), b1.get(x, y));
    const value = (0, _colorUtils.blendWithWhite)(gray, 0.1);
    drawPixel(width, diff, x, y, value, value, value);
  };
  let fastR, fastG, fastB;
  let diffCount = 0;
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      // Fast-path: equal pixels.
      if (r1.get(x, y) === r2.get(x, y) && g1.get(x, y) === g2.get(x, y) && b1.get(x, y) === b2.get(x, y)) {
        drawGrayPixel(x, y);
        continue;
      }

      // Compare pixel colors using the dE94 color difference formulae.
      // The dE94 is normalized so that the value of 1.0 is the "just-noticeable-difference".
      // Color difference below 1.0 is not noticeable to a human eye, so we can disregard it.
      // See https://en.wikipedia.org/wiki/Color_difference
      const delta = (0, _colorUtils.colorDeltaE94)([r1.get(x, y), g1.get(x, y), b1.get(x, y)], [r2.get(x, y), g2.get(x, y), b2.get(x, y)]);
      if (delta <= maxColorDeltaE94) {
        drawGrayPixel(x, y);
        continue;
      }

      // if this pixel is a part of a flood fill of a 3x3 square then it cannot be
      // anti-aliasing pixel so it must be a pixel difference.
      if (!fastR || !fastG || !fastB) {
        fastR = new _stats.FastStats(r1, r2);
        fastG = new _stats.FastStats(g1, g2);
        fastB = new _stats.FastStats(b1, b2);
      }
      const [varX1, varY1] = r1.boundXY(x - VARIANCE_WINDOW_RADIUS, y - VARIANCE_WINDOW_RADIUS);
      const [varX2, varY2] = r1.boundXY(x + VARIANCE_WINDOW_RADIUS, y + VARIANCE_WINDOW_RADIUS);
      const var1 = fastR.varianceC1(varX1, varY1, varX2, varY2) + fastG.varianceC1(varX1, varY1, varX2, varY2) + fastB.varianceC1(varX1, varY1, varX2, varY2);
      const var2 = fastR.varianceC2(varX1, varY1, varX2, varY2) + fastG.varianceC2(varX1, varY1, varX2, varY2) + fastB.varianceC2(varX1, varY1, varX2, varY2);
      if (var1 === 0 && var2 === 0) {
        drawRedPixel(x, y);
        ++diffCount;
        continue;
      }
      const [ssimX1, ssimY1] = r1.boundXY(x - SSIM_WINDOW_RADIUS, y - SSIM_WINDOW_RADIUS);
      const [ssimX2, ssimY2] = r1.boundXY(x + SSIM_WINDOW_RADIUS, y + SSIM_WINDOW_RADIUS);
      const ssimRGB = ((0, _stats.ssim)(fastR, ssimX1, ssimY1, ssimX2, ssimY2) + (0, _stats.ssim)(fastG, ssimX1, ssimY1, ssimX2, ssimY2) + (0, _stats.ssim)(fastB, ssimX1, ssimY1, ssimX2, ssimY2)) / 3.0;
      const isAntialiassed = ssimRGB >= 0.99;
      if (isAntialiassed) {
        drawYellowPixel(x, y);
      } else {
        drawRedPixel(x, y);
        ++diffCount;
      }
    }
  }
  return diffCount;
}