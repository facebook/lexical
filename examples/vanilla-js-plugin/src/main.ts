/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// [docs:main] Read directly by the Creating an Extension guide.
import './styles.css';

import {buildEditorFromExtensions} from '@lexical/extension';

import {AppExtension} from './AppExtension';

const editor = buildEditorFromExtensions(AppExtension);
editor.setRootElement(document.getElementById('lexical-editor'));

// Accept Vite updates; AppExtension preserves editor state with HMRExtension.
// In an application, also call dispose() when removing the editor permanently.
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => editor.dispose());
}
// [/docs:main]
