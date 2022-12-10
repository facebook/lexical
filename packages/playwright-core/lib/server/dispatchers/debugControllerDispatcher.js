"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DebugControllerDispatcher = void 0;
var _debugController = require("../debugController");
var _dispatcher = require("./dispatcher");
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

class DebugControllerDispatcher extends _dispatcher.Dispatcher {
  constructor(connection, debugController) {
    super(connection, debugController, 'DebugController', {});
    this._type_DebugController = void 0;
    this._type_DebugController = true;
    this._object.on(_debugController.DebugController.Events.StateChanged, params => {
      this._dispatchEvent('stateChanged', params);
    });
    this._object.on(_debugController.DebugController.Events.InspectRequested, ({
      selector,
      locator
    }) => {
      this._dispatchEvent('inspectRequested', {
        selector,
        locator
      });
    });
    this._object.on(_debugController.DebugController.Events.SourceChanged, ({
      text,
      header,
      footer,
      actions
    }) => {
      this._dispatchEvent('sourceChanged', {
        text,
        header,
        footer,
        actions
      });
    });
    this._object.on(_debugController.DebugController.Events.Paused, ({
      paused
    }) => {
      this._dispatchEvent('paused', {
        paused
      });
    });
  }
  async initialize(params) {
    this._object.initialize(params.codegenId, params.sdkLanguage);
  }
  async setReportStateChanged(params) {
    this._object.setReportStateChanged(params.enabled);
  }
  async resetForReuse() {
    await this._object.resetForReuse();
  }
  async navigate(params) {
    await this._object.navigate(params.url);
  }
  async setRecorderMode(params) {
    await this._object.setRecorderMode(params);
  }
  async highlight(params) {
    await this._object.highlight(params.selector);
  }
  async hideHighlight() {
    await this._object.hideHighlight();
  }
  async resume() {
    await this._object.resume();
  }
  async kill() {
    await this._object.kill();
  }
  async closeAllBrowsers() {
    await this._object.closeAllBrowsers();
  }
  _dispose() {
    super._dispose();
    this._object.dispose();
  }
}
exports.DebugControllerDispatcher = DebugControllerDispatcher;