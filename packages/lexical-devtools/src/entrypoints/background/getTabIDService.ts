/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {PegasusRPCMessage} from '@webext-pegasus/rpc';

export type ITabIDService = typeof getTabIDService;

export async function getTabIDService(
  message: PegasusRPCMessage,
): Promise<number> {
  let tabID: number | undefined = message.sender.tabId;
  if (message.sender.context === 'popup') {
    tabID = (await browser.tabs.query({active: true, currentWindow: true}))[0]
      .id;
  }
  if (tabID === undefined) {
    throw new Error(`Could not get tab ID for message: ${message.toString()}`);
  }
  return tabID;
}
