"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ImageChannel = void 0;
var _colorUtils = require("./colorUtils");
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

class ImageChannel {
  static intoRGB(width, height, data) {
    const r = new Uint8Array(width * height);
    const g = new Uint8Array(width * height);
    const b = new Uint8Array(width * height);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const index = y * width + x;
        const offset = index * 4;
        const alpha = data[offset + 3] === 255 ? 1 : data[offset + 3] / 255;
        r[index] = (0, _colorUtils.blendWithWhite)(data[offset], alpha);
        g[index] = (0, _colorUtils.blendWithWhite)(data[offset + 1], alpha);
        b[index] = (0, _colorUtils.blendWithWhite)(data[offset + 2], alpha);
      }
    }
    return [new ImageChannel(width, height, r), new ImageChannel(width, height, g), new ImageChannel(width, height, b)];
  }
  constructor(width, height, data) {
    this.data = void 0;
    this.width = void 0;
    this.height = void 0;
    this.data = data;
    this.width = width;
    this.height = height;
  }
  get(x, y) {
    return this.data[y * this.width + x];
  }
  boundXY(x, y) {
    return [Math.min(Math.max(x, 0), this.width - 1), Math.min(Math.max(y, 0), this.height - 1)];
  }
}
exports.ImageChannel = ImageChannel;