/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ITabIDService} from '../background/getTabIDService';

import {getRPCService} from '@webext-pegasus/rpc';
import {initPegasusTransport} from '@webext-pegasus/transport/window';

import {EXTENSION_NAME} from '../../constants';
import {extensionStoreReady} from '../../store.ts';
import main from './main';

export default defineUnlistedScript({
  main() {
    initPegasusTransport({namespace: EXTENSION_NAME});
    getRPCService<ITabIDService>('getTabID', 'background')().then((tabID) =>
      extensionStoreReady().then((extensionStore) =>
        main(tabID, extensionStore),
      ),
    );
  },
});
