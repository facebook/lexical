"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JavaScriptFormatter = exports.JavaScriptLanguageGenerator = void 0;

var _language = require("./language");

var _recorderActions = require("./recorderActions");

var _utils = require("./utils");

var _deviceDescriptors = _interopRequireDefault(require("../../deviceDescriptors"));

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
class JavaScriptLanguageGenerator {
  constructor(isTest) {
    this.id = void 0;
    this.fileName = void 0;
    this.highlighter = 'javascript';
    this._isTest = void 0;
    this.id = isTest ? 'test' : 'javascript';
    this.fileName = isTest ? 'Playwright Test' : 'JavaScript';
    this._isTest = isTest;
  }

  generateAction(actionInContext) {
    const {
      action,
      pageAlias
    } = actionInContext;
    const formatter = new JavaScriptFormatter(2);
    formatter.newLine();
    formatter.add('// ' + (0, _recorderActions.actionTitle)(action));

    if (action.name === 'openPage') {
      if (this._isTest) return '';
      formatter.add(`const ${pageAlias} = await context.newPage();`);
      if (action.url && action.url !== 'about:blank' && action.url !== 'chrome://newtab/') formatter.add(`await ${pageAlias}.goto(${quote(action.url)});`);
      return formatter.format();
    }

    const subject = actionInContext.isMainFrame ? pageAlias : actionInContext.frameName ? `${pageAlias}.frame(${formatObject({
      name: actionInContext.frameName
    })})` : `${pageAlias}.frame(${formatObject({
      url: actionInContext.frameUrl
    })})`;
    const signals = (0, _language.toSignalMap)(action);

    if (signals.dialog) {
      formatter.add(`  ${pageAlias}.once('dialog', dialog => {
    console.log(\`Dialog message: $\{dialog.message()}\`);
    dialog.dismiss().catch(() => {});
  });`);
    }

    const emitPromiseAll = signals.waitForNavigation || signals.popup || signals.download;

    if (emitPromiseAll) {
      // Generate either await Promise.all([]) or
      // const [popup1] = await Promise.all([]).
      let leftHandSide = '';
      if (signals.popup) leftHandSide = `const [${signals.popup.popupAlias}] = `;else if (signals.download) leftHandSide = `const [download] = `;
      formatter.add(`${leftHandSide}await Promise.all([`);
    } // Popup signals.


    if (signals.popup) formatter.add(`${pageAlias}.waitForEvent('popup'),`); // Navigation signal.

    if (signals.waitForNavigation) formatter.add(`${pageAlias}.waitForNavigation(/*{ url: ${quote(signals.waitForNavigation.url)} }*/),`); // Download signals.

    if (signals.download) formatter.add(`${pageAlias}.waitForEvent('download'),`);
    const prefix = signals.popup || signals.waitForNavigation || signals.download ? '' : 'await ';

    const actionCall = this._generateActionCall(action);

    const suffix = signals.waitForNavigation || emitPromiseAll ? '' : ';';
    formatter.add(`${prefix}${subject}.${actionCall}${suffix}`);

    if (emitPromiseAll) {
      formatter.add(`]);`);
    } else if (signals.assertNavigation) {
      if (this._isTest) formatter.add(`  await expect(${pageAlias}).toHaveURL(${quote(signals.assertNavigation.url)});`);else formatter.add(`  // assert.equal(${pageAlias}.url(), ${quote(signals.assertNavigation.url)});`);
    }

    return formatter.format();
  }

  _generateActionCall(action) {
    switch (action.name) {
      case 'openPage':
        throw Error('Not reached');

      case 'closePage':
        return 'close()';

      case 'click':
        {
          let method = 'click';
          if (action.clickCount === 2) method = 'dblclick';
          const modifiers = (0, _utils.toModifiers)(action.modifiers);
          const options = {};
          if (action.button !== 'left') options.button = action.button;
          if (modifiers.length) options.modifiers = modifiers;
          if (action.clickCount > 2) options.clickCount = action.clickCount;
          if (action.position) options.position = action.position;
          const optionsString = formatOptions(options);
          return `${method}(${quote(action.selector)}${optionsString})`;
        }

      case 'check':
        return `check(${quote(action.selector)})`;

      case 'uncheck':
        return `uncheck(${quote(action.selector)})`;

      case 'fill':
        return `fill(${quote(action.selector)}, ${quote(action.text)})`;

      case 'setInputFiles':
        return `setInputFiles(${quote(action.selector)}, ${formatObject(action.files.length === 1 ? action.files[0] : action.files)})`;

      case 'press':
        {
          const modifiers = (0, _utils.toModifiers)(action.modifiers);
          const shortcut = [...modifiers, action.key].join('+');
          return `press(${quote(action.selector)}, ${quote(shortcut)})`;
        }

      case 'navigate':
        return `goto(${quote(action.url)})`;

      case 'select':
        return `selectOption(${quote(action.selector)}, ${formatObject(action.options.length > 1 ? action.options : action.options[0])})`;
    }
  }

  generateHeader(options) {
    if (this._isTest) return this.generateTestHeader(options);
    return this.generateStandaloneHeader(options);
  }

  generateFooter(saveStorage) {
    if (this._isTest) return this.generateTestFooter(saveStorage);
    return this.generateStandaloneFooter(saveStorage);
  }

  generateTestHeader(options) {
    const formatter = new JavaScriptFormatter();
    const useText = formatContextOptions(options.contextOptions, options.deviceName);
    formatter.add(`
      const { test, expect${options.deviceName ? ', devices' : ''} } = require('@playwright/test');
${useText ? '\ntest.use(' + useText + ');\n' : ''}
      test('test', async ({ page }) => {`);
    return formatter.format();
  }

  generateTestFooter(saveStorage) {
    return `\n});`;
  }

  generateStandaloneHeader(options) {
    const formatter = new JavaScriptFormatter();
    formatter.add(`
      const { ${options.browserName}${options.deviceName ? ', devices' : ''} } = require('playwright');

      (async () => {
        const browser = await ${options.browserName}.launch(${formatObjectOrVoid(options.launchOptions)});
        const context = await browser.newContext(${formatContextOptions(options.contextOptions, options.deviceName)});`);
    return formatter.format();
  }

  generateStandaloneFooter(saveStorage) {
    const storageStateLine = saveStorage ? `\n  await context.storageState({ path: ${quote(saveStorage)} });` : '';
    return `\n  // ---------------------${storageStateLine}
  await context.close();
  await browser.close();
})();`;
  }

}

exports.JavaScriptLanguageGenerator = JavaScriptLanguageGenerator;

function formatOptions(value) {
  const keys = Object.keys(value);
  if (!keys.length) return '';
  return ', ' + formatObject(value);
}

function formatObject(value, indent = '  ') {
  if (typeof value === 'string') return quote(value);
  if (Array.isArray(value)) return `[${value.map(o => formatObject(o)).join(', ')}]`;

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (!keys.length) return '{}';
    const tokens = [];

    for (const key of keys) tokens.push(`${key}: ${formatObject(value[key])}`);

    return `{\n${indent}${tokens.join(`,\n${indent}`)}\n}`;
  }

  return String(value);
}

function formatObjectOrVoid(value, indent = '  ') {
  const result = formatObject(value, indent);
  return result === '{}' ? '' : result;
}

function formatContextOptions(options, deviceName) {
  const device = deviceName && _deviceDescriptors.default[deviceName];
  if (!device) return formatObjectOrVoid(options); // Filter out all the properties from the device descriptor.

  let serializedObject = formatObjectOrVoid((0, _language.sanitizeDeviceOptions)(device, options)); // When there are no additional context options, we still want to spread the device inside.

  if (!serializedObject) serializedObject = '{\n}';
  const lines = serializedObject.split('\n');
  lines.splice(1, 0, `...devices[${quote(deviceName)}],`);
  return lines.join('\n');
}

class JavaScriptFormatter {
  constructor(offset = 0) {
    this._baseIndent = void 0;
    this._baseOffset = void 0;
    this._lines = [];
    this._baseIndent = ' '.repeat(2);
    this._baseOffset = ' '.repeat(offset);
  }

  prepend(text) {
    this._lines = text.trim().split('\n').map(line => line.trim()).concat(this._lines);
  }

  add(text) {
    this._lines.push(...text.trim().split('\n').map(line => line.trim()));
  }

  newLine() {
    this._lines.push('');
  }

  format() {
    let spaces = '';
    let previousLine = '';
    return this._lines.map(line => {
      if (line === '') return line;
      if (line.startsWith('}') || line.startsWith(']')) spaces = spaces.substring(this._baseIndent.length);
      const extraSpaces = /^(for|while|if|try).*\(.*\)$/.test(previousLine) ? this._baseIndent : '';
      previousLine = line;
      const callCarryOver = line.startsWith('.set');
      line = spaces + extraSpaces + (callCarryOver ? this._baseIndent : '') + line;
      if (line.endsWith('{') || line.endsWith('[')) spaces += this._baseIndent;
      return this._baseOffset + line;
    }).join('\n');
  }

}

exports.JavaScriptFormatter = JavaScriptFormatter;

function quote(text) {
  return (0, _utils.escapeWithQuotes)(text, '\'');
}