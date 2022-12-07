"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.installAppIcon = installAppIcon;
exports.syncLocalStorageWithSettings = syncLocalStorageWithSettings;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _registry = require("../registry");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

async function installAppIcon(page) {
  const icon = await _fs.default.promises.readFile(require.resolve('./appIcon.png'));
  const crPage = page._delegate;
  await crPage._mainFrameSession._client.send('Browser.setDockTile', {
    image: icon.toString('base64')
  });
}
async function syncLocalStorageWithSettings(page, appName) {
  const settingsFile = _path.default.join(_registry.registryDirectory, '.settings', `${appName}.json`);
  await page.exposeBinding('saveSettings', false, (_, settings) => {
    _fs.default.mkdirSync(_path.default.dirname(settingsFile), {
      recursive: true
    });
    _fs.default.writeFileSync(settingsFile, settings);
  });
  const settings = await _fs.default.promises.readFile(settingsFile, 'utf-8').catch(() => '{}');
  await page.addInitScript(`(${String(settings => {
    Object.entries(settings).map(([k, v]) => localStorage[k] = v);
    let lastValue = JSON.stringify(localStorage);
    setInterval(() => {
      const value = JSON.stringify(localStorage);
      if (value !== lastValue) {
        lastValue = value;
        window.saveSettings(value);
      }
    }, 2000);
  })})(${settings})`);
}