/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import {Editor} from './Editor.tsx';
import {ThemeToggle} from './ThemeToggle.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-[#1c1e21] dark:bg-zinc-900 dark:text-[#e3e3e3]">
      <ThemeToggle />
      <h1 className="text-2xl font-bold">Lexical AI Agent Example</h1>
      <p className="max-w-lg text-center text-sm text-zinc-500 dark:text-zinc-400">
        Rich text editor with AI-powered paragraph generation and named entity
        extraction using SmolLM2-135M and Xenova/bert-base-NER running in the
        browser via WebAssembly.
      </p>
      <Editor />
    </div>
  </StrictMode>,
);
