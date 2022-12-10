"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ElementHandle = void 0;
exports.convertInputFiles = convertInputFiles;
exports.convertSelectOptionValues = convertSelectOptionValues;
exports.determineScreenshotType = determineScreenshotType;
var _frame = require("./frame");
var _jsHandle = require("./jsHandle");
var _fs = _interopRequireDefault(require("fs"));
var _utilsBundle = require("../utilsBundle");
var _path = _interopRequireDefault(require("path"));
var _utils = require("../utils");
var _fileUtils = require("../utils/fileUtils");
var _writableStream = require("./writableStream");
var _stream = require("stream");
var _util = require("util");
var _debugLogger = require("../common/debugLogger");
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

const pipelineAsync = (0, _util.promisify)(_stream.pipeline);
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
    return _frame.Frame.fromNullable((await this._elementChannel.ownerFrame()).frame);
  }
  async contentFrame() {
    return _frame.Frame.fromNullable((await this._elementChannel.contentFrame()).frame);
  }
  async getAttribute(name) {
    const value = (await this._elementChannel.getAttribute({
      name
    })).value;
    return value === undefined ? null : value;
  }
  async inputValue() {
    return (await this._elementChannel.inputValue()).value;
  }
  async textContent() {
    const value = (await this._elementChannel.textContent()).value;
    return value === undefined ? null : value;
  }
  async innerText() {
    return (await this._elementChannel.innerText()).value;
  }
  async innerHTML() {
    return (await this._elementChannel.innerHTML()).value;
  }
  async isChecked() {
    return (await this._elementChannel.isChecked()).value;
  }
  async isDisabled() {
    return (await this._elementChannel.isDisabled()).value;
  }
  async isEditable() {
    return (await this._elementChannel.isEditable()).value;
  }
  async isEnabled() {
    return (await this._elementChannel.isEnabled()).value;
  }
  async isHidden() {
    return (await this._elementChannel.isHidden()).value;
  }
  async isVisible() {
    return (await this._elementChannel.isVisible()).value;
  }
  async dispatchEvent(type, eventInit = {}) {
    await this._elementChannel.dispatchEvent({
      type,
      eventInit: (0, _jsHandle.serializeArgument)(eventInit)
    });
  }
  async scrollIntoViewIfNeeded(options = {}) {
    await this._elementChannel.scrollIntoViewIfNeeded(options);
  }
  async hover(options = {}) {
    await this._elementChannel.hover(options);
  }
  async click(options = {}) {
    return await this._elementChannel.click(options);
  }
  async dblclick(options = {}) {
    return await this._elementChannel.dblclick(options);
  }
  async tap(options = {}) {
    return await this._elementChannel.tap(options);
  }
  async selectOption(values, options = {}) {
    const result = await this._elementChannel.selectOption({
      ...convertSelectOptionValues(values),
      ...options
    });
    return result.values;
  }
  async fill(value, options = {}) {
    return await this._elementChannel.fill({
      value,
      ...options
    });
  }
  async selectText(options = {}) {
    await this._elementChannel.selectText(options);
  }
  async setInputFiles(files, options = {}) {
    const frame = await this.ownerFrame();
    if (!frame) throw new Error('Cannot set input files to detached element');
    const converted = await convertInputFiles(files, frame.page().context());
    if (converted.files) {
      await this._elementChannel.setInputFiles({
        files: converted.files,
        ...options
      });
    } else {
      _debugLogger.debugLogger.log('api', 'switching to large files mode');
      await this._elementChannel.setInputFilePaths({
        ...converted,
        ...options
      });
    }
  }
  async focus() {
    await this._elementChannel.focus();
  }
  async type(text, options = {}) {
    await this._elementChannel.type({
      text,
      ...options
    });
  }
  async press(key, options = {}) {
    await this._elementChannel.press({
      key,
      ...options
    });
  }
  async check(options = {}) {
    return await this._elementChannel.check(options);
  }
  async uncheck(options = {}) {
    return await this._elementChannel.uncheck(options);
  }
  async setChecked(checked, options) {
    if (checked) await this.check(options);else await this.uncheck(options);
  }
  async boundingBox() {
    const value = (await this._elementChannel.boundingBox()).value;
    return value === undefined ? null : value;
  }
  async screenshot(options = {}) {
    const copy = {
      ...options,
      mask: undefined
    };
    if (!copy.type) copy.type = determineScreenshotType(options);
    if (options.mask) {
      copy.mask = options.mask.map(locator => ({
        frame: locator._frame._channel,
        selector: locator._selector
      }));
    }
    const result = await this._elementChannel.screenshot(copy);
    if (options.path) {
      await (0, _fileUtils.mkdirIfNeeded)(options.path);
      await _fs.default.promises.writeFile(options.path, result.binary);
    }
    return result.binary;
  }
  async $(selector) {
    return ElementHandle.fromNullable((await this._elementChannel.querySelector({
      selector
    })).element);
  }
  async $$(selector) {
    const result = await this._elementChannel.querySelectorAll({
      selector
    });
    return result.elements.map(h => ElementHandle.from(h));
  }
  async $eval(selector, pageFunction, arg) {
    const result = await this._elementChannel.evalOnSelector({
      selector,
      expression: String(pageFunction),
      isFunction: typeof pageFunction === 'function',
      arg: (0, _jsHandle.serializeArgument)(arg)
    });
    return (0, _jsHandle.parseResult)(result.value);
  }
  async $$eval(selector, pageFunction, arg) {
    const result = await this._elementChannel.evalOnSelectorAll({
      selector,
      expression: String(pageFunction),
      isFunction: typeof pageFunction === 'function',
      arg: (0, _jsHandle.serializeArgument)(arg)
    });
    return (0, _jsHandle.parseResult)(result.value);
  }
  async waitForElementState(state, options = {}) {
    return await this._elementChannel.waitForElementState({
      state,
      ...options
    });
  }
  async waitForSelector(selector, options = {}) {
    const result = await this._elementChannel.waitForSelector({
      selector,
      ...options
    });
    return ElementHandle.fromNullable(result.element);
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
async function convertInputFiles(files, context) {
  const items = Array.isArray(files) ? files.slice() : [files];
  const sizeLimit = 50 * 1024 * 1024;
  const hasLargeBuffer = items.find(item => typeof item === 'object' && item.buffer && item.buffer.byteLength > sizeLimit);
  if (hasLargeBuffer) throw new Error('Cannot set buffer larger than 50Mb, please write it to a file and pass its path instead.');
  const stats = await Promise.all(items.filter(_utils.isString).map(item => _fs.default.promises.stat(item)));
  const hasLargeFile = !!stats.find(s => s.size > sizeLimit);
  if (hasLargeFile) {
    if (context._connection.isRemote()) {
      const streams = await Promise.all(items.map(async item => {
        (0, _utils.assert)((0, _utils.isString)(item));
        const {
          writableStream: stream
        } = await context._channel.createTempFile({
          name: _path.default.basename(item)
        });
        const writable = _writableStream.WritableStream.from(stream);
        await pipelineAsync(_fs.default.createReadStream(item), writable.stream());
        return stream;
      }));
      return {
        streams
      };
    }
    return {
      localPaths: items.map(f => _path.default.resolve(f))
    };
  }
  const filePayloads = await Promise.all(items.map(async item => {
    if (typeof item === 'string') {
      return {
        name: _path.default.basename(item),
        buffer: await _fs.default.promises.readFile(item)
      };
    } else {
      return {
        name: item.name,
        mimeType: item.mimeType,
        buffer: item.buffer
      };
    }
  }));
  return {
    files: filePayloads
  };
}
function determineScreenshotType(options) {
  if (options.path) {
    const mimeType = _utilsBundle.mime.getType(options.path);
    if (mimeType === 'image/png') return 'png';else if (mimeType === 'image/jpeg') return 'jpeg';
    throw new Error(`path: unsupported mime type "${mimeType}"`);
  }
  return options.type;
}