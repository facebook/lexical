/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from '../../LexicalEditor';
import type {EditorState} from '../../LexicalEditorState';
import type {NodeKey} from '../../LexicalNode';
import type {Node as ReactNode} from 'react';

import invariant from 'shared/invariant';

import {LexicalNode} from '../../LexicalNode';
import {getActiveEditor} from '../../LexicalUpdates';
import {createUID} from '../../LexicalUtils';

export type DecoratorStateValue =
  | DecoratorMap
  | DecoratorEditor
  | DecoratorArray
  | null
  | boolean
  | number
  | string;

export type DecoratorMapObserver = (
  key: string,
  value: DecoratorStateValue,
) => void;

export type DecoratorArrayObserver = (
  index: number,
  delCont: number,
  value: void | DecoratorStateValue,
) => void;

function isStringified(
  editorState: null | EditorState | string,
): boolean %checks {
  return typeof editorState === 'string';
}

export class DecoratorEditor {
  id: string;
  editorState: null | EditorState | string;
  editor: null | LexicalEditor;

  constructor(id?: string, editorState?: string | EditorState) {
    this.id = id || createUID();
    this.editorState = editorState || null;
    this.editor = null;
  }

  init(editor: LexicalEditor): void {
    let editorState = this.editorState;
    if (isStringified(editorState)) {
      editorState = editor.parseEditorState(editorState);
      this.editorState = editorState;
      if (editorState !== null) {
        editor.setEditorState(editorState, {
          tag: 'history-merge',
        });
      }
    }
  }

  set(editor: LexicalEditor): void {
    this.editor = editor;
    this.editorState = editor.getEditorState();
  }

  toJSON(): $ReadOnly<{
    editorState: null | string,
    id: string,
    type: 'editor',
  }> {
    const editorState = this.editorState;
    return {
      editorState:
        editorState === null || isStringified(editorState)
          ? editorState
          : JSON.stringify(editorState.toJSON()),
      id: this.id,
      type: 'editor',
    };
  }

  isEmpty(): boolean {
    return this.editorState === null;
  }
}

export function createDecoratorEditor(
  id?: string,
  editorState?: string | EditorState,
): DecoratorEditor {
  return new DecoratorEditor(id, editorState);
}

export function isDecoratorEditor(x?: mixed): boolean %checks {
  return x instanceof DecoratorEditor;
}

export class DecoratorMap {
  _editor: LexicalEditor;
  _observers: Set<DecoratorMapObserver>;
  _map: Map<string, DecoratorStateValue>;

  constructor(editor: LexicalEditor, map?: Map<string, DecoratorStateValue>) {
    this._editor = editor;
    this._observers = new Set();
    this._map = map || new Map();
  }

  get(key: string): void | DecoratorStateValue {
    return this._map.get(key);
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  set(key: string, value: DecoratorStateValue): void {
    this._map.set(key, value);
    const observers = Array.from(this._observers);
    for (let i = 0; i < observers.length; i++) {
      observers[i](key, value);
    }
  }

  observe(observer: DecoratorMapObserver): () => void {
    const observers = this._observers;
    observers.add(observer);
    return () => {
      observers.delete(observer);
    };
  }

  destroy(): void {
    this._observers.clear();
  }

  toJSON(): $ReadOnly<{
    map: Array<[string, DecoratorStateValue]>,
    type: 'map',
  }> {
    return {
      map: Array.from(this._map.entries()),
      type: 'map',
    };
  }
}

export function createDecoratorMap(
  editor: LexicalEditor,
  map?: Map<string, DecoratorStateValue>,
): DecoratorMap {
  return new DecoratorMap(editor, map);
}

export function isDecoratorMap(x?: mixed): boolean %checks {
  return x instanceof DecoratorMap;
}

export class DecoratorArray {
  _editor: LexicalEditor;
  _observers: Set<DecoratorArrayObserver>;
  _array: Array<DecoratorStateValue>;

  constructor(editor: LexicalEditor, array?: Array<DecoratorStateValue>) {
    this._editor = editor;
    this._observers = new Set();
    this._array = array || [];
  }

  observe(observer: DecoratorArrayObserver): () => void {
    const observers = this._observers;
    observers.add(observer);
    return () => {
      observers.delete(observer);
    };
  }

  getLength(): number {
    return this._array.length;
  }

  map<V>(
    fn: (DecoratorStateValue, number, Array<DecoratorStateValue>) => V,
  ): Array<V> {
    const res = [];
    const arr = this._array;
    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      res.push(fn(value, i, arr));
    }
    return res;
  }

  reduce(
    fn: (DecoratorStateValue, DecoratorStateValue) => DecoratorStateValue,
    initial?: DecoratorStateValue,
  ): DecoratorStateValue | void {
    let accum = initial;
    const arr = this._array;
    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      accum = accum !== undefined ? fn(accum, value) : value;
    }
    return accum;
  }

  push(value: DecoratorStateValue): void {
    this.splice(this._array.length, 0, value);
  }

  splice(
    insertIndex: number,
    delCount: number,
    value?: DecoratorStateValue,
  ): void {
    if (value === undefined) {
      this._array.splice(insertIndex, delCount);
    } else {
      this._array.splice(insertIndex, delCount, value);
    }
    const observers = Array.from(this._observers);
    for (let i = 0; i < observers.length; i++) {
      observers[i](insertIndex, delCount, value);
    }
  }

  indexOf(value: DecoratorStateValue): number {
    return this._array.indexOf(value);
  }

  destroy(): void {
    this._observers.clear();
  }

  toJSON(): $ReadOnly<{
    array: Array<DecoratorStateValue>,
    type: 'array',
  }> {
    return {
      array: this._array,
      type: 'array',
    };
  }
}

export function createDecoratorArray(
  editor: LexicalEditor,
  list?: Array<DecoratorStateValue>,
): DecoratorArray {
  return new DecoratorArray(editor, list);
}

export function isDecoratorArray(x?: mixed): boolean %checks {
  return x instanceof DecoratorArray;
}

export class DecoratorNode extends LexicalNode {
  __state: DecoratorMap;

  constructor(state?: DecoratorMap, key?: NodeKey): void {
    super(key);
    const editor = getActiveEditor();
    this.__state = state || createDecoratorMap(editor);

    // ensure custom nodes implement required methods
    if (__DEV__) {
      const proto = Object.getPrototypeOf(this);
      ['decorate'].forEach((method) => {
        if (!proto.hasOwnProperty(method)) {
          console.warn(
            `${this.constructor.name} must implement "${method}" method`,
          );
        }
      });
    }
  }

  decorate(editor: LexicalEditor): ReactNode {
    invariant(false, 'decorate: base method not extended');
  }
}

export function $isDecoratorNode(node: ?LexicalNode): boolean %checks {
  return node instanceof DecoratorNode;
}
