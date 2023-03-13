/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from 'shared/invariant';

import {FULL_RECONCILE} from './LexicalConstants';
import {resetEditor, RootListener} from './LexicalEditor';
import {addRootElementEvents, removeRootElementEvents} from './LexicalEvents';
import {LexicalFrontendAdapter} from './LexicalFrontendAdapter';
import {initMutationObserver} from './LexicalMutations';
import {commitPendingUpdates, triggerListeners} from './LexicalUpdates';
import {getCachedClassNameArray, getDefaultView} from './LexicalUtils';

export function createDOMFrontendAdapter(): LexicalDOMFrontendAdapter {
  return new LexicalDOMFrontendAdapter();
}

export class LexicalDOMFrontendAdapter extends LexicalFrontendAdapter {
  constructor() {
    super();
    this._rootElement = null;
    this._window = null;
  }
  /** @internal */
  _rootElement: null | HTMLElement;
  /** @internal */
  _window: null | Window;

  getWindow(): Window | null {
    return this._window;
  }
  getRootElement(): HTMLElement | null {
    return this._rootElement;
  }
  setRootElement(nextRootElement: HTMLElement | null): void {
    const prevRootElement = this._rootElement;
    const editor = this._editor;
    if (editor === null) {
      invariant(false, 'Should have editor here');
      return;
    }

    if (nextRootElement !== prevRootElement) {
      const classNames = getCachedClassNameArray(editor._config.theme, 'root');
      const pendingEditorState =
        editor._pendingEditorState || editor._editorState;
      this._rootElement = nextRootElement;
      resetEditor(editor, prevRootElement, nextRootElement, pendingEditorState);

      if (prevRootElement !== null) {
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!editor._config.disableEvents) {
          removeRootElementEvents(prevRootElement);
        }
        if (classNames != null) {
          prevRootElement.classList.remove(...classNames);
        }
      }

      if (nextRootElement !== null) {
        const windowObj = getDefaultView(nextRootElement);
        const style = nextRootElement.style;
        style.userSelect = 'text';
        style.whiteSpace = 'pre-wrap';
        style.wordBreak = 'break-word';
        nextRootElement.setAttribute('data-lexical-editor', 'true');
        this._window = windowObj;
        editor._dirtyType = FULL_RECONCILE;
        initMutationObserver(editor);

        editor._updateTags.add('history-merge');

        commitPendingUpdates(editor);

        // TODO: remove this flag once we no longer use UEv2 internally
        if (!editor._config.disableEvents) {
          addRootElementEvents(nextRootElement, editor);
        }
        if (classNames != null) {
          nextRootElement.classList.add(...classNames);
        }
      } else {
        this._window = null;
      }

      triggerListeners('root', editor, false, nextRootElement, prevRootElement);
    }
  }

  isHeadless(): boolean {
    return this._temporarilyHeadless;
  }

  registerRootListener(listener: RootListener): () => void {
    const editor = this._editor;
    if (editor === null) {
      invariant(false, 'Should have editor here');
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }

    const listenerSetOrMap = editor._listeners.root;
    listener(this._rootElement, null);
    listenerSetOrMap.add(listener);
    return () => {
      listener(null, this._rootElement);
      listenerSetOrMap.delete(listener);
    };
  }

  _temporarilyHeadless = false;
  setTemporarilyHeadless(headless: boolean) {
    this._temporarilyHeadless = headless;
  }
}
