/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalEditor, RootListener} from './LexicalEditor';

export abstract class LexicalFrontendAdapter {
  _editor: null | LexicalEditor;

  constructor() {
    this._editor = null;
  }

  setEditor(editor: null | LexicalEditor) {
    this._editor = editor;
  }

  // Frontend-specific methods to override
  abstract isHeadless(): boolean;
  abstract setTemporarilyHeadless(headless: boolean);

  /**
   * The following methods seem DOM-specific. Ideally we wouldn't expose
   * them in the FrontendAdapter API like this. However, we are doing
   * so during the refactor/migration, to make the refactor easier and
   * to aid in backwards compatibility.
   */
  abstract getWindow(): null | Window;
  abstract getRootElement(): null | HTMLElement;
  abstract setRootElement(nextRootElement: null | HTMLElement): void;
  abstract registerRootListener(listener: RootListener): () => void;
}
