"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Locator = void 0;

var util = _interopRequireWildcard(require("util"));

var _utils = require("../utils/utils");

var _elementHandle = require("./elementHandle");

var _jsHandle = require("./jsHandle");

let _custom;

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

_custom = util.inspect.custom;

class Locator {
  constructor(frame, selector) {
    this._frame = void 0;
    this._selector = void 0;
    this._frame = frame;
    this._selector = selector;
  }

  async _withElement(task, timeout) {
    timeout = this._frame.page()._timeoutSettings.timeout({
      timeout
    });
    const deadline = timeout ? (0, _utils.monotonicTime)() + timeout : 0;
    return this._frame._wrapApiCall(async channel => {
      const result = await channel.waitForSelector({
        selector: this._selector,
        strict: true,
        state: 'attached',
        timeout
      });

      const handle = _elementHandle.ElementHandle.fromNullable(result.element);

      if (!handle) throw new Error(`Could not resolve ${this._selector} to DOM Element`);

      try {
        return await task(handle, deadline ? deadline - (0, _utils.monotonicTime)() : 0);
      } finally {
        await handle.dispose();
      }
    });
  }

  async boundingBox(options) {
    return this._withElement(h => h.boundingBox(), options === null || options === void 0 ? void 0 : options.timeout);
  }

  async check(options = {}) {
    return this._frame.check(this._selector, {
      strict: true,
      ...options
    });
  }

  async click(options = {}) {
    return this._frame.click(this._selector, {
      strict: true,
      ...options
    });
  }

  async dblclick(options = {}) {
    return this._frame.dblclick(this._selector, {
      strict: true,
      ...options
    });
  }

  async dispatchEvent(type, eventInit = {}, options) {
    return this._frame.dispatchEvent(this._selector, type, eventInit, {
      strict: true,
      ...options
    });
  }

  async evaluate(pageFunction, arg, options) {
    return this._withElement(h => h.evaluate(pageFunction, arg), options === null || options === void 0 ? void 0 : options.timeout);
  }

  async evaluateAll(pageFunction, arg) {
    return this._frame.$$eval(this._selector, pageFunction, arg);
  }

  async evaluateHandle(pageFunction, arg, options) {
    return this._withElement(h => h.evaluateHandle(pageFunction, arg), options === null || options === void 0 ? void 0 : options.timeout);
  }

  async fill(value, options = {}) {
    return this._frame.fill(this._selector, value, {
      strict: true,
      ...options
    });
  }

  locator(selector) {
    return new Locator(this._frame, this._selector + ' >> ' + selector);
  }

  async elementHandle(options) {
    return await this._frame.waitForSelector(this._selector, {
      strict: true,
      state: 'attached',
      ...options
    });
  }

  async elementHandles() {
    return this._frame.$$(this._selector);
  }

  first() {
    return new Locator(this._frame, this._selector + ' >> nth=0');
  }

  last() {
    return new Locator(this._frame, this._selector + ` >> nth=-1`);
  }

  nth(index) {
    return new Locator(this._frame, this._selector + ` >> nth=${index}`);
  }

  async focus(options) {
    return this._frame.focus(this._selector, {
      strict: true,
      ...options
    });
  }

  async count() {
    return this.evaluateAll(ee => ee.length);
  }

  async getAttribute(name, options) {
    return this._frame.getAttribute(this._selector, name, {
      strict: true,
      ...options
    });
  }

  async hover(options = {}) {
    return this._frame.hover(this._selector, {
      strict: true,
      ...options
    });
  }

  async innerHTML(options) {
    return this._frame.innerHTML(this._selector, {
      strict: true,
      ...options
    });
  }

  async innerText(options) {
    return this._frame.innerText(this._selector, {
      strict: true,
      ...options
    });
  }

  async inputValue(options) {
    return this._frame.inputValue(this._selector, {
      strict: true,
      ...options
    });
  }

  async isChecked(options) {
    return this._frame.isChecked(this._selector, {
      strict: true,
      ...options
    });
  }

  async isDisabled(options) {
    return this._frame.isDisabled(this._selector, {
      strict: true,
      ...options
    });
  }

  async isEditable(options) {
    return this._frame.isEditable(this._selector, {
      strict: true,
      ...options
    });
  }

  async isEnabled(options) {
    return this._frame.isEnabled(this._selector, {
      strict: true,
      ...options
    });
  }

  async isHidden(options) {
    return this._frame.isHidden(this._selector, {
      strict: true,
      ...options
    });
  }

  async isVisible(options) {
    return this._frame.isVisible(this._selector, {
      strict: true,
      ...options
    });
  }

  async press(key, options = {}) {
    return this._frame.press(this._selector, key, {
      strict: true,
      ...options
    });
  }

  async screenshot(options = {}) {
    return this._withElement((h, timeout) => h.screenshot({ ...options,
      timeout
    }), options.timeout);
  }

  async scrollIntoViewIfNeeded(options = {}) {
    return this._withElement((h, timeout) => h.scrollIntoViewIfNeeded({ ...options,
      timeout
    }), options.timeout);
  }

  async selectOption(values, options = {}) {
    return this._frame.selectOption(this._selector, values, {
      strict: true,
      ...options
    });
  }

  async selectText(options = {}) {
    return this._withElement((h, timeout) => h.selectText({ ...options,
      timeout
    }), options.timeout);
  }

  async setChecked(checked, options) {
    if (checked) await this.check(options);else await this.uncheck(options);
  }

  async setInputFiles(files, options = {}) {
    return this._frame.setInputFiles(this._selector, files, {
      strict: true,
      ...options
    });
  }

  async tap(options = {}) {
    return this._frame.tap(this._selector, {
      strict: true,
      ...options
    });
  }

  async textContent(options) {
    return this._frame.textContent(this._selector, {
      strict: true,
      ...options
    });
  }

  async type(text, options = {}) {
    return this._frame.type(this._selector, text, {
      strict: true,
      ...options
    });
  }

  async uncheck(options = {}) {
    return this._frame.uncheck(this._selector, {
      strict: true,
      ...options
    });
  }

  async allInnerTexts() {
    return this._frame.$$eval(this._selector, ee => ee.map(e => e.innerText));
  }

  async allTextContents() {
    return this._frame.$$eval(this._selector, ee => ee.map(e => e.textContent || ''));
  }

  async waitFor(options) {
    return this._frame._wrapApiCall(async channel => {
      await channel.waitForSelector({
        selector: this._selector,
        strict: true,
        omitReturnValue: true,
        ...options
      });
    });
  }

  async _expect(expression, options) {
    return this._frame._wrapApiCall(async channel => {
      const params = {
        selector: this._selector,
        expression,
        ...options,
        isNot: !!options.isNot
      };
      if (options.expectedValue) params.expectedValue = (0, _jsHandle.serializeArgument)(options.expectedValue);
      const result = await channel.expect(params);
      if (result.received !== undefined) result.received = (0, _jsHandle.parseResult)(result.received);
      return result;
    });
  }

  [_custom]() {
    return this.toString();
  }

  toString() {
    return `Locator@${this._selector}`;
  }

}

exports.Locator = Locator;