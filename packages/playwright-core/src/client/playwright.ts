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

import type * as channels from '../protocol/channels';
import { TimeoutError } from '../common/errors';
import type * as socks from '../common/socksProxy';
import { Android } from './android';
import { BrowserType } from './browserType';
import { ChannelOwner } from './channelOwner';
import { Electron } from './electron';
import { APIRequest } from './fetch';
import { LocalUtils } from './localUtils';
import { Selectors, SelectorsOwner } from './selectors';
import type { Size } from './types';

type DeviceDescriptor = {
  userAgent: string,
  viewport: Size,
  deviceScaleFactor: number,
  isMobile: boolean,
  hasTouch: boolean,
  defaultBrowserType: 'chromium' | 'firefox' | 'webkit'
};
type Devices = { [name: string]: DeviceDescriptor };

export class Playwright extends ChannelOwner<channels.PlaywrightChannel> {
  readonly _android: Android;
  readonly _electron: Electron;
  readonly chromium: BrowserType;
  readonly firefox: BrowserType;
  readonly webkit: BrowserType;
  readonly devices: Devices;
  selectors: Selectors;
  readonly request: APIRequest;
  readonly errors: { TimeoutError: typeof TimeoutError };
  _utils: LocalUtils;
  private _socksProxyHandler: socks.SocksProxyHandler | undefined;

  constructor(parent: ChannelOwner, type: string, guid: string, initializer: channels.PlaywrightInitializer) {
    super(parent, type, guid, initializer);
    this.request = new APIRequest(this);
    this.chromium = BrowserType.from(initializer.chromium);
    this.chromium._playwright = this;
    this.firefox = BrowserType.from(initializer.firefox);
    this.firefox._playwright = this;
    this.webkit = BrowserType.from(initializer.webkit);
    this.webkit._playwright = this;
    this._android = Android.from(initializer.android);
    this._electron = Electron.from(initializer.electron);
    this.devices = {};
    for (const { name, descriptor } of initializer.deviceDescriptors)
      this.devices[name] = descriptor;
    this.selectors = new Selectors();
    this.errors = { TimeoutError };
    this._utils = LocalUtils.from(initializer.utils);

    const selectorsOwner = SelectorsOwner.from(initializer.selectors);
    this.selectors._addChannel(selectorsOwner);
    this._connection.on('close', () => {
      this.selectors._removeChannel(selectorsOwner);
      this._socksProxyHandler?.cleanup();
    });
    (global as any)._playwrightInstance = this;
  }

  async _hideHighlight() {
    await this._channel.hideHighlight();
  }

  _setSelectors(selectors: Selectors) {
    const selectorsOwner = SelectorsOwner.from(this._initializer.selectors);
    this.selectors._removeChannel(selectorsOwner);
    this.selectors = selectors;
    this.selectors._addChannel(selectorsOwner);
  }

  static from(channel: channels.PlaywrightChannel): Playwright {
    return (channel as any)._object;
  }
}
