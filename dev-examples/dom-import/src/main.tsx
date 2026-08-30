/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="App">
      <h1>DOMImportExtension Example</h1>
      <p className="App-blurb">
        Rich-text editor wired through the new
        <code> DOMImportExtension</code> pipeline. Paste rich content from
        anywhere — including Microsoft Word — or use the
        <strong> Import HTML </strong>
        button to paste raw HTML into a textarea.
      </p>
      <App />
    </div>
  </React.StrictMode>,
);
