"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createPlaywright = createPlaywright;
exports.Playwright = void 0;

var _android = require("./android/android");

var _backendAdb = require("./android/backendAdb");

var _chromium = require("./chromium/chromium");

var _electron = require("./electron/electron");

var _firefox = require("./firefox/firefox");

var _selectors = require("./selectors");

var _webkit = require("./webkit/webkit");

var _instrumentation = require("./instrumentation");

var _debugLogger = require("../utils/debugLogger");

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
class Playwright extends _instrumentation.SdkObject {
  constructor(sdkLanguage, isInternal) {
    super({
      attribution: {
        isInternal
      },
      instrumentation: (0, _instrumentation.createInstrumentation)()
    }, undefined, 'Playwright');
    this.selectors = void 0;
    this.chromium = void 0;
    this.android = void 0;
    this.electron = void 0;
    this.firefox = void 0;
    this.webkit = void 0;
    this.options = void 0;
    this.instrumentation.addListener({
      onCallLog: (logName, message, sdkObject, metadata) => {
        _debugLogger.debugLogger.log(logName, message);
      }
    });
    this.options = {
      rootSdkObject: this,
      selectors: new _selectors.Selectors(),
      sdkLanguage: sdkLanguage
    };
    this.chromium = new _chromium.Chromium(this.options);
    this.firefox = new _firefox.Firefox(this.options);
    this.webkit = new _webkit.WebKit(this.options);
    this.electron = new _electron.Electron(this.options);
    this.android = new _android.Android(new _backendAdb.AdbBackend(), this.options);
    this.selectors = this.options.selectors;
  }

}

exports.Playwright = Playwright;

function createPlaywright(sdkLanguage, isInternal = false) {
  return new Playwright(sdkLanguage, isInternal);
}