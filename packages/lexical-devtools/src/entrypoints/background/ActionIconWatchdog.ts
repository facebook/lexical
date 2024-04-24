/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {Tabs} from 'wxt/browser';
import type {StoreApi} from 'zustand';

import {IS_FIREFOX} from 'shared/environment';

import {ExtensionState} from '../../store';

export default class ActionIconWatchdog {
  private constructor(
    private readonly extensionStore: StoreApi<ExtensionState>,
  ) {}

  static async start(store: StoreApi<ExtensionState>) {
    return new ActionIconWatchdog(store).init();
  }

  async init() {
    const tabs = await browser.tabs.query({});
    await Promise.all(
      tabs.map(this.checkAndHandleRestrictedPageIfSo.bind(this)),
    );

    browser.tabs.onCreated.addListener((tab) => {
      this.checkAndHandleRestrictedPageIfSo(tab);
    });

    // Listen to URL changes on the active tab and update the DevTools icon.
    browser.tabs.onUpdated.addListener(this.handleTabsUpdatedEvent.bind(this));
  }

  private async setIcon(
    lexicalBuildType: 'restricted' | 'enabled',
    tabId: number,
  ) {
    const action = IS_FIREFOX ? browser.browserAction : browser.action;

    await action.setIcon({
      path: {
        '128': browser.runtime.getURL(
          lexicalBuildType === 'enabled'
            ? '/icon/128.png'
            : '/icon/128-restricted.png',
        ),
        '16': browser.runtime.getURL(
          lexicalBuildType === 'enabled'
            ? '/icon/16.png'
            : '/icon/16-restricted.png',
        ),
        '32': browser.runtime.getURL(
          lexicalBuildType === 'enabled'
            ? '/icon/32.png'
            : '/icon/32-restricted.png',
        ),
        '48': browser.runtime.getURL(
          lexicalBuildType === 'enabled'
            ? '/icon/48.png'
            : '/icon/48-restricted.png',
        ),
      },
      tabId: tabId,
    });

    if (lexicalBuildType === 'restricted') {
      this.extensionStore.getState().markTabAsRestricted(tabId);
    }
  }

  private handleTabsUpdatedEvent(
    tabId: number,
    _changeInfo: unknown,
    tab: Tabs.Tab,
  ): void {
    this.checkAndHandleRestrictedPageIfSo(tab);
  }

  private isRestrictedBrowserPage(url: string | undefined) {
    return (
      !url ||
      ['chrome:', 'about:', 'file:', 'edge:'].includes(new URL(url).protocol)
    );
  }

  private async checkAndHandleRestrictedPageIfSo(tab: Tabs.Tab) {
    if (tab.id == null) {
      return;
    }

    if (tab.id == null || this.isRestrictedBrowserPage(tab.url)) {
      return this.setIcon('restricted', tab.id);
    }

    return this.setIcon('enabled', tab.id);
  }
}
