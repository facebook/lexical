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

import Editor from './Editor.tsx';
import {ThemeToggle} from './ThemeToggle.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="relative flex min-h-screen items-center justify-center bg-white p-8 text-[#1c1e21] dark:bg-zinc-900 dark:text-[#e3e3e3]">
      <ThemeToggle />
      <div className="w-full max-w-lg">
        <Editor />
      </div>
    </div>
  </React.StrictMode>,
);
