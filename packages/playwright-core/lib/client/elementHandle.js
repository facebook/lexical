"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertSelectOptionValues = convertSelectOptionValues;
exports.convertInputFiles = convertInputFiles;
exports.determineScreenshotType = determineScreenshotType;
exports.ElementHandle = void 0;

var _frame = require("./frame");

var _jsHandle = require("./jsHandle");

var _fs = _interopRequireDefault(require("fs"));

var mime = _interopRequireWildcard(require("mime"));

var _path = _interopRequireDefault(require("path"));

var _utils = require("../utils/utils");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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
class ElementHandle extends _jsHandle.JSHandle {
  static from(handle) {
    return handle._object;
  }

  static fromNullable(handle) {
    return handle ? ElementHandle.from(handle) : null;
  }

  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._elementChannel = void 0;
    this._elementChannel = this._channel;
  }

  asElement() {
    return this;
  }

  async ownerFrame() {
    return this._wrapApiCall(async channel => {
      return _frame.Frame.fromNullable((await channel.ownerFrame()).frame);
    });
  }

  async contentFrame() {
    return this._wrapApiCall(async channel => {
      return _frame.Frame.fromNullable((await channel.contentFrame()).frame);
    });
  }

  async getAttribute(name) {
    return this._wrapApiCall(async channel => {
      const value = (await channel.getAttribute({
        name
      })).value;
      return value === undefined ? null : value;
    });
  }

  async inputValue() {
    return this._wrapApiCall(async channel => {
      return (await channel.inputValue()).value;
    });
  }

  async textContent() {
    return this._wrapApiCall(async channel => {
      const value = (await channel.textContent()).value;
      return value === undefined ? null : value;
    });
  }

  async innerText() {
    return this._wrapApiCall(async channel => {
      return (await channel.innerText()).value;
    });
  }

  async innerHTML() {
    return this._wrapApiCall(async channel => {
      return (await channel.innerHTML()).value;
    });
  }

  async isChecked() {
    return this._wrapApiCall(async channel => {
      return (await channel.isChecked()).value;
    });
  }

  async isDisabled() {
    return this._wrapApiCall(async channel => {
      return (await channel.isDisabled()).value;
    });
  }

  async isEditable() {
    return this._wrapApiCall(async channel => {
      return (await channel.isEditable()).value;
    });
  }

  async isEnabled() {
    return this._wrapApiCall(async channel => {
      return (await channel.isEnabled()).value;
    });
  }

  async isHidden() {
    return this._wrapApiCall(async channel => {
      return (await channel.isHidden()).value;
    });
  }

  async isVisible() {
    return this._wrapApiCall(async channel => {
      return (await channel.isVisible()).value;
    });
  }

  async dispatchEvent(type, eventInit = {}) {
    return this._wrapApiCall(async channel => {
      await channel.dispatchEvent({
        type,
        eventInit: (0, _jsHandle.serializeArgument)(eventInit)
      });
    });
  }

  async scrollIntoViewIfNeeded(options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.scrollIntoViewIfNeeded(options);
    });
  }

  async hover(options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.hover(options);
    });
  }

  async click(options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.click(options);
    });
  }

  async dblclick(options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.dblclick(options);
    });
  }

  async tap(options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.tap(options);
    });
  }

  async selectOption(values, options = {}) {
    return this._wrapApiCall(async channel => {
      const result = await channel.selectOption({ ...convertSelectOptionValues(values),
        ...options
      });
      return result.values;
    });
  }

  async fill(value, options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.fill({
        value,
        ...options
      });
    });
  }

  async selectText(options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.selectText(options);
    });
  }

  async setInputFiles(files, options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.setInputFiles({
        files: await convertInputFiles(files),
        ...options
      });
    });
  }

  async focus() {
    return this._wrapApiCall(async channel => {
      await channel.focus();
    });
  }

  async type(text, options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.type({
        text,
        ...options
      });
    });
  }

  async press(key, options = {}) {
    return this._wrapApiCall(async channel => {
      await channel.press({
        key,
        ...options
      });
    });
  }

  async check(options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.check(options);
    });
  }

  async uncheck(options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.uncheck(options);
    });
  }

  async setChecked(checked, options) {
    if (checked) await this.check(options);else await this.uncheck(options);
  }

  async boundingBox() {
    return this._wrapApiCall(async channel => {
      const value = (await channel.boundingBox()).value;
      return value === undefined ? null : value;
    });
  }

  async screenshot(options = {}) {
    return this._wrapApiCall(async channel => {
      const copy = { ...options
      };
      if (!copy.type) copy.type = determineScreenshotType(options);
      const result = await channel.screenshot(copy);
      const buffer = Buffer.from(result.binary, 'base64');

      if (options.path) {
        await (0, _utils.mkdirIfNeeded)(options.path);
        await _fs.default.promises.writeFile(options.path, buffer);
      }

      return buffer;
    });
  }

  async $(selector) {
    return this._wrapApiCall(async channel => {
      return ElementHandle.fromNullable((await channel.querySelector({
        selector
      })).element);
    });
  }

  async $$(selector) {
    return this._wrapApiCall(async channel => {
      const result = await channel.querySelectorAll({
        selector
      });
      return result.elements.map(h => ElementHandle.from(h));
    });
  }

  async $eval(selector, pageFunction, arg) {
    return this._wrapApiCall(async channel => {
      const result = await channel.evalOnSelector({
        selector,
        expression: String(pageFunction),
        isFunction: typeof pageFunction === 'function',
        arg: (0, _jsHandle.serializeArgument)(arg)
      });
      return (0, _jsHandle.parseResult)(result.value);
    });
  }

  async $$eval(selector, pageFunction, arg) {
    return this._wrapApiCall(async channel => {
      const result = await channel.evalOnSelectorAll({
        selector,
        expression: String(pageFunction),
        isFunction: typeof pageFunction === 'function',
        arg: (0, _jsHandle.serializeArgument)(arg)
      });
      return (0, _jsHandle.parseResult)(result.value);
    });
  }

  async waitForElementState(state, options = {}) {
    return this._wrapApiCall(async channel => {
      return await channel.waitForElementState({
        state,
        ...options
      });
    });
  }

  async waitForSelector(selector, options = {}) {
    return this._wrapApiCall(async channel => {
      const result = await channel.waitForSelector({
        selector,
        ...options
      });
      return ElementHandle.fromNullable(result.element);
    });
  }

}

exports.ElementHandle = ElementHandle;

function convertSelectOptionValues(values) {
  if (values === null) return {};
  if (!Array.isArray(values)) values = [values];
  if (!values.length) return {};

  for (let i = 0; i < values.length; i++) (0, _utils.assert)(values[i] !== null, `options[${i}]: expected object, got null`);

  if (values[0] instanceof ElementHandle) return {
    elements: values.map(v => v._elementChannel)
  };
  if ((0, _utils.isString)(values[0])) return {
    options: values.map(value => ({
      value
    }))
  };
  return {
    options: values
  };
}

async function convertInputFiles(files) {
  const items = Array.isArray(files) ? files : [files];
  const filePayloads = await Promise.all(items.map(async item => {
    if (typeof item === 'string') {
      return {
        name: _path.default.basename(item),
        buffer: (await _fs.default.promises.readFile(item)).toString('base64')
      };
    } else {
      return {
        name: item.name,
        mimeType: item.mimeType,
        buffer: item.buffer.toString('base64')
      };
    }
  }));
  return filePayloads;
}

function determineScreenshotType(options) {
  if (options.path) {
    const mimeType = mime.getType(options.path);
    if (mimeType === 'image/png') return 'png';else if (mimeType === 'image/jpeg') return 'jpeg';
    throw new Error(`path: unsupported mime type "${mimeType}"`);
  }

  return options.type;
}