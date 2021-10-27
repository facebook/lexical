/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {NodeKey, NodeMap} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {View} from './OutlineUpdates';
import type {ParsedNode} from './OutlineParsing';

import {createRootNode} from './OutlineRootNode';
import {readViewModel} from './OutlineUpdates';

export type ParsedViewModel = {
  _selection: null | {
    anchor: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
    focus: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
  },
  _nodeMap: Array<[NodeKey, ParsedNode]>,
};

export function viewModelHasDirtySelection(
  viewModel: ViewModel,
  editor: OutlineEditor,
): boolean {
  const currentSelection = editor.getViewModel()._selection;
  const pendingSelection = viewModel._selection;
  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true;
    }
  } else if (currentSelection !== null) {
    return true;
  }
  return false;
}

export function cloneViewModel(current: ViewModel): ViewModel {
  const draft = new ViewModel(new Map(current._nodeMap));
  return draft;
}

export function createEmptyViewModel(): ViewModel {
  return new ViewModel(new Map([['root', createRootNode()]]));
}

export class ViewModel {
  _nodeMap: NodeMap;
  _selection: null | Selection;
  _flushSync: boolean;

  constructor(nodeMap: NodeMap) {
    this._nodeMap = nodeMap;
    this._selection = null;
    this._flushSync = false;
  }
  isEmpty(): boolean {
    return this._nodeMap.size === 1 && this._selection === null;
  }
  read<V>(callbackFn: (view: View) => V): V {
    return readViewModel(this, callbackFn);
  }
  stringify(space?: string | number): string {
    const selection = this._selection;
    return JSON.stringify(
      {
        _nodeMap: Array.from(this._nodeMap.entries()),
        _selection:
          selection === null
            ? null
            : {
                anchor: {
                  key: selection.anchor.key,
                  offset: selection.anchor.offset,
                  type: selection.anchor.type,
                },
                focus: {
                  key: selection.focus.key,
                  offset: selection.focus.offset,
                  type: selection.focus.type,
                },
              },
      },
      null,
      space,
    );
  }
}
