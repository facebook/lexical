"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JavaLanguageGenerator = void 0;

var _language = require("./language");

var _recorderActions = require("./recorderActions");

var _utils = require("./utils");

var _deviceDescriptors = _interopRequireDefault(require("../../deviceDescriptors"));

var _javascript = require("./javascript");

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
class JavaLanguageGenerator {
  constructor() {
    this.id = 'java';
    this.fileName = 'Java';
    this.highlighter = 'java';
  }

  generateAction(actionInContext) {
    const {
      action,
      pageAlias
    } = actionInContext;
    const formatter = new _javascript.JavaScriptFormatter(6);
    formatter.newLine();
    formatter.add('// ' + (0, _recorderActions.actionTitle)(action));

    if (action.name === 'openPage') {
      formatter.add(`Page ${pageAlias} = context.newPage();`);
      if (action.url && action.url !== 'about:blank' && action.url !== 'chrome://newtab/') formatter.add(`${pageAlias}.navigate(${quote(action.url)});`);
      return formatter.format();
    }

    const subject = actionInContext.isMainFrame ? pageAlias : actionInContext.frameName ? `${pageAlias}.frame(${quote(actionInContext.frameName)})` : `${pageAlias}.frameByUrl(${quote(actionInContext.frameUrl)})`;
    const signals = (0, _language.toSignalMap)(action);

    if (signals.dialog) {
      formatter.add(`  ${pageAlias}.onceDialog(dialog -> {
        System.out.println(String.format("Dialog message: %s", dialog.message()));
        dialog.dismiss();
      });`);
    }

    const actionCall = this._generateActionCall(action, actionInContext.isMainFrame);

    let code = `${subject}.${actionCall};`;

    if (signals.popup) {
      code = `Page ${signals.popup.popupAlias} = ${pageAlias}.waitForPopup(() -> {
        ${code}
      });`;
    }

    if (signals.download) {
      code = `Download download = ${pageAlias}.waitForDownload(() -> {
        ${code}
      });`;
    }

    if (signals.waitForNavigation) {
      code = `
      // ${pageAlias}.waitForNavigation(new Page.WaitForNavigationOptions().setUrl(${quote(signals.waitForNavigation.url)}), () ->
      ${pageAlias}.waitForNavigation(() -> {
        ${code}
      });`;
    }

    formatter.add(code);
    if (signals.assertNavigation) formatter.add(`// assert ${pageAlias}.url().equals(${quote(signals.assertNavigation.url)});`);
    return formatter.format();
  }

  _generateActionCall(action, isPage) {
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
          const optionsText = formatClickOptions(options, isPage);
          return `${method}(${quote(action.selector)}${optionsText ? ', ' : ''}${optionsText})`;
        }

      case 'check':
        return `check(${quote(action.selector)})`;

      case 'uncheck':
        return `uncheck(${quote(action.selector)})`;

      case 'fill':
        return `fill(${quote(action.selector)}, ${quote(action.text)})`;

      case 'setInputFiles':
        return `setInputFiles(${quote(action.selector)}, ${formatPath(action.files.length === 1 ? action.files[0] : action.files)})`;

      case 'press':
        {
          const modifiers = (0, _utils.toModifiers)(action.modifiers);
          const shortcut = [...modifiers, action.key].join('+');
          return `press(${quote(action.selector)}, ${quote(shortcut)})`;
        }

      case 'navigate':
        return `navigate(${quote(action.url)})`;

      case 'select':
        return `selectOption(${quote(action.selector)}, ${formatSelectOption(action.options.length > 1 ? action.options : action.options[0])})`;
    }
  }

  generateHeader(options) {
    const formatter = new _javascript.JavaScriptFormatter();
    formatter.add(`
    import com.microsoft.playwright.*;
    import com.microsoft.playwright.options.*;
    import java.util.*;

    public class Example {
      public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
          Browser browser = playwright.${options.browserName}().launch(${formatLaunchOptions(options.launchOptions)});
          BrowserContext context = browser.newContext(${formatContextOptions(options.contextOptions, options.deviceName)});`);
    return formatter.format();
  }

  generateFooter(saveStorage) {
    const storageStateLine = saveStorage ? `\n      context.storageState(new BrowserContext.StorageStateOptions().setPath(${quote(saveStorage)}));\n` : '';
    return `${storageStateLine}    }
  }
}`;
  }

}

exports.JavaLanguageGenerator = JavaLanguageGenerator;

function formatPath(files) {
  if (Array.isArray(files)) {
    if (files.length === 0) return 'new Path[0]';
    return `new Path[] {${files.map(s => 'Paths.get(' + quote(s) + ')').join(', ')}}`;
  }

  return `Paths.get(${quote(files)})`;
}

function formatSelectOption(options) {
  if (Array.isArray(options)) {
    if (options.length === 0) return 'new String[0]';
    return `new String[] {${options.map(s => quote(s)).join(', ')}}`;
  }

  return quote(options);
}

function formatLaunchOptions(options) {
  const lines = [];
  if (!Object.keys(options).length) return '';
  lines.push('new BrowserType.LaunchOptions()');
  if (typeof options.headless === 'boolean') lines.push(`  .setHeadless(false)`);
  if (options.channel) lines.push(`  .setChannel(${quote(options.channel)})`);
  return lines.join('\n');
}

function formatContextOptions(contextOptions, deviceName) {
  const lines = [];
  if (!Object.keys(contextOptions).length && !deviceName) return '';
  const device = deviceName ? _deviceDescriptors.default[deviceName] : {};
  const options = { ...device,
    ...contextOptions
  };
  lines.push('new Browser.NewContextOptions()');
  if (options.acceptDownloads) lines.push(`  .setAcceptDownloads(true)`);
  if (options.bypassCSP) lines.push(`  .setBypassCSP(true)`);
  if (options.colorScheme) lines.push(`  .setColorScheme(ColorScheme.${options.colorScheme.toUpperCase()})`);
  if (options.deviceScaleFactor) lines.push(`  .setDeviceScaleFactor(${options.deviceScaleFactor})`);
  if (options.geolocation) lines.push(`  .setGeolocation(${options.geolocation.latitude}, ${options.geolocation.longitude})`);
  if (options.hasTouch) lines.push(`  .setHasTouch(${options.hasTouch})`);
  if (options.isMobile) lines.push(`  .setIsMobile(${options.isMobile})`);
  if (options.locale) lines.push(`  .setLocale(${quote(options.locale)})`);
  if (options.proxy) lines.push(`  .setProxy(new Proxy(${quote(options.proxy.server)}))`);
  if (options.storageState) lines.push(`  .setStorageStatePath(Paths.get(${quote(options.storageState)}))`);
  if (options.timezoneId) lines.push(`  .setTimezoneId(${quote(options.timezoneId)})`);
  if (options.userAgent) lines.push(`  .setUserAgent(${quote(options.userAgent)})`);
  if (options.viewport) lines.push(`  .setViewportSize(${options.viewport.width}, ${options.viewport.height})`);
  return lines.join('\n');
}

function formatClickOptions(options, isPage) {
  const lines = [];
  if (options.button) lines.push(`  .setButton(MouseButton.${options.button.toUpperCase()})`);
  if (options.modifiers) lines.push(`  .setModifiers(Arrays.asList(${options.modifiers.map(m => `KeyboardModifier.${m.toUpperCase()}`).join(', ')}))`);
  if (options.clickCount) lines.push(`  .setClickCount(${options.clickCount})`);
  if (options.position) lines.push(`  .setPosition(${options.position.x}, ${options.position.y})`);
  if (!lines.length) return '';
  lines.unshift(`new ${isPage ? 'Page' : 'Frame'}.ClickOptions()`);
  return lines.join('\n');
}

function quote(text) {
  return (0, _utils.escapeWithQuotes)(text, '\"');
}