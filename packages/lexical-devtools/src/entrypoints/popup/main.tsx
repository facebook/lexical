/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './style.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import {sendMessage} from 'webext-bridge/popup';

import store from '../../store.ts';
import storeReadyPromise from '../../store-sync/popup';
import App from './App.tsx';

sendMessage('getTabID', null, 'background')
  .then((tabID) =>
    storeReadyPromise(store).then(() =>
      ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
          <App tabID={tabID} />
        </React.StrictMode>,
      ),
    ),
  )

  .catch(console.error);
