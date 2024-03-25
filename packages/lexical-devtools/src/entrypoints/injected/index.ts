/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {sendMessage, setNamespace} from 'webext-bridge/window';

import extensionStore from '../../store';
import storeReadyPromise from '../../store-sync/window';
import main from './main';

export default defineUnlistedScript({
  main() {
    setNamespace('lexical-extension');
    sendMessage('getTabID', null, 'background').then((tabID) =>
      storeReadyPromise(extensionStore).then(() => main(tabID, extensionStore)),
    );
  },
});
