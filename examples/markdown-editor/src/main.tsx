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
    <div className="relative flex min-h-screen flex-col bg-white p-4 text-[#1c1e21] md:p-8 dark:bg-zinc-900 dark:text-[#e3e3e3]">
      <ThemeToggle />
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-6xl flex-1">
        <Editor />
      </div>
    </div>
  </React.StrictMode>,
);
