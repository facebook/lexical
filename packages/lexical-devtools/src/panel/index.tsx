/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from '../components/App';

ReactDOM.createRoot(document.getElementById('container') as Element).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
