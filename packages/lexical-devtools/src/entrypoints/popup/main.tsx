/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ITabIDService} from '../background/getTabIDService';

import './style.css';

import {ChakraProvider} from '@chakra-ui/react';
import {getRPCService} from '@webext-pegasus/rpc';
import {initPegasusTransport} from '@webext-pegasus/transport/popup';
import React from 'react';
import ReactDOM from 'react-dom/client';

import {extensionStoreReady} from '../../store.ts';
import App from './App.tsx';

initPegasusTransport();

getRPCService<ITabIDService>('getTabID', 'background')()
  .then((tabID) =>
    extensionStoreReady().then(() =>
      ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
          <ChakraProvider>
            <App tabID={tabID} />
          </ChakraProvider>
        </React.StrictMode>,
      ),
    ),
  )

  .catch(console.error);
