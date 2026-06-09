/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import * as React from 'react';
import {createRoot} from 'react-dom/client';

import App from './App';
import setupEnv from './setupEnv';

if (setupEnv.emptyEditor) {
  // vite is really aggressive about tree-shaking, this
  // ensures that the side-effects of importing setupEnv happens
}

// Handle runtime errors
const showErrorOverlay = (err: unknown) => {
  if (!(err instanceof Error)) {
    // Events without an Error payload — e.g. the benign "ResizeObserver loop
    // completed with undelivered notifications" warning — would crash the
    // overlay itself, which expects message/stack.
    return;
  }
  const ErrorOverlay = customElements.get('vite-error-overlay');
  if (!ErrorOverlay) {
    return;
  }
  const overlay = new ErrorOverlay(err);
  const body = document.body;
  if (body !== null) {
    body.appendChild(overlay);
  }
};

window.addEventListener('error', ({error}) => showErrorOverlay(error));
window.addEventListener('unhandledrejection', ({reason}) =>
  showErrorOverlay(reason),
);

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
