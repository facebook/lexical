/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ChakraProvider} from '@chakra-ui/react';
import {initPegasusTransport} from '@webext-pegasus/transport/devtools';
import React from 'react';
import ReactDOM from 'react-dom/client';

import {extensionStoreReady} from '../../store.ts';
import App from './App.tsx';

const tabID = browser.devtools.inspectedWindow.tabId;
initPegasusTransport();

extensionStoreReady().then(() =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ChakraProvider>
        <App tabID={tabID} />
      </ChakraProvider>
    </React.StrictMode>,
  ),
);
