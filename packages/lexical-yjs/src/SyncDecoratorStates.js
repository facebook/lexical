/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorMap, DecoratorArray, DecoratorStateValue} from 'lexical';
import type {Binding} from '.';
import type {CollabDecoratorNode} from './CollabDecoratorNode';

import {Map as YMap, Array as YArray, Doc} from 'yjs';
import {
  isDecoratorMap,
  isDecoratorEditor,
  isDecoratorArray,
  createDecoratorEditor,
  createDecoratorMap,
  createDecoratorArray,
} from 'lexical';
import invariant from 'shared/invariant';
import {syncWithTransaction} from './Utils';

type YDecoratorValue =
  | YArray<YDecoratorValue>
  | string
  | number
  | null
  | boolean
  | YMap;

let isMutationFromCollab = false;

export function mutationFromCollab(fn: () => void): void {
  const prevIsMutationFromCollab = isMutationFromCollab;
  try {
    isMutationFromCollab = true;
    fn();
  } finally {
    isMutationFromCollab = prevIsMutationFromCollab;
  }
}

export function observeDecoratorMap(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  decoratorMap: DecoratorMap,
  yjsMap: YMap,
): void {
  const unobserve = decoratorMap.observe((changedKey: string) => {
    if (isMutationFromCollab) {
      return;
    }
    syncWithTransaction(binding, () =>
      syncLexicalDecoratorMapKeyToYjs(
        binding,
        collabNode,
        decoratorMap._map,
        yjsMap,
        changedKey,
      ),
    );
  });
  collabNode._unobservers.add(unobserve);
}

function observeDecoratorArray(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  decoratorArray: DecoratorArray,
  yjsArray: YArray<YDecoratorValue>,
): void {
  const unobserve = decoratorArray.observe(
    (changedIndex: number, delCount: number) => {
      if (isMutationFromCollab) {
        return;
      }
      syncWithTransaction(binding, () => {
        if (delCount > 0) {
          yjsArray.delete(changedIndex, delCount);
        }
        syncLexicalDecoratorArrayValueToYjs(
          binding,
          collabNode,
          decoratorArray._array,
          yjsArray,
          changedIndex,
        );
      });
    },
  );
  collabNode._unobservers.add(unobserve);
}

export function syncLexicalDecoratorMapKeyToYjs(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  internalMap: Map<string, DecoratorStateValue>,
  yjsMap: YMap,
  key: string,
): void {
  const lexicalValue = internalMap.get(key);
  let yjsValue = yjsMap.get(key);

  if (lexicalValue !== yjsValue) {
    if (isDecoratorMap(lexicalValue)) {
      if (yjsValue === undefined) {
        yjsValue = new YMap();
        // $FlowFixMe: internal field
        yjsValue._lexicalValue = lexicalValue;
        // $FlowFixMe: internal field
        yjsValue._collabNode = collabNode;
        yjsValue.set('type', 'map');
        yjsMap.set(key, yjsValue);
        observeDecoratorMap(binding, collabNode, lexicalValue, yjsValue);
      }
      syncLexicalDecoratorMapToYjs(binding, collabNode, lexicalValue, yjsValue);
    } else if (isDecoratorEditor(lexicalValue)) {
      let doc;
      if (yjsValue === undefined) {
        yjsValue = new YMap();
        // $FlowFixMe: internal field
        yjsValue._lexicalValue = lexicalValue;
        // $FlowFixMe: internal field
        yjsValue._collabNode = collabNode;
        // Create a subdocument
        doc = new Doc();
        yjsValue.set('doc', doc);
        yjsValue.set('type', 'editor');
        yjsMap.set(key, yjsValue);
      }
      doc = doc || yjsValue.get('doc');
      const yjsId = yjsValue.get('id');
      const lexicalId = lexicalValue.id;
      if (yjsId !== lexicalId) {
        const yjsDocMap = binding.docMap;
        yjsDocMap.delete(yjsId);
        yjsValue.set('id', lexicalId);
        yjsDocMap.set(lexicalId, doc);
      }
    } else if (isDecoratorArray(lexicalValue)) {
      if (yjsValue === undefined) {
        yjsValue = new YArray();
        // $FlowFixMe: internal field
        yjsValue._lexicalValue = lexicalValue;
        // $FlowFixMe: internal field
        yjsValue._collabNode = collabNode;
        yjsMap.set(key, yjsValue);
        observeDecoratorArray(binding, collabNode, lexicalValue, yjsValue);
      }
      syncLexicalDecoratorArrayToYjs(
        binding,
        collabNode,
        lexicalValue,
        yjsValue,
      );
    } else {
      if (isDecoratorArray(yjsValue) || isDecoratorMap(yjsValue)) {
        yjsValue.destroy();
      }
      yjsMap.set(key, lexicalValue);
    }
  }
}

function syncLexicalDecoratorArrayValueToYjs(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  internalArray: Array<DecoratorStateValue>,
  yjsArray: YArray<YDecoratorValue>,
  index: number,
): void {
  const lexicalValue = internalArray[index];
  let yjsValue = yjsArray.get(index);

  if (lexicalValue !== yjsValue) {
    if (isDecoratorMap(lexicalValue)) {
      if (yjsValue === undefined) {
        yjsValue = new YMap();
        // $FlowFixMe: internal field
        yjsValue._lexicalValue = lexicalValue;
        // $FlowFixMe: internal field
        yjsValue._collabNode = collabNode;
        yjsValue.set('type', 'map');
        yjsArray.insert(index, [yjsValue]);
        observeDecoratorMap(binding, collabNode, lexicalValue, yjsValue);
      }
      syncLexicalDecoratorMapToYjs(binding, collabNode, lexicalValue, yjsValue);
    } else if (isDecoratorEditor(lexicalValue)) {
      let doc;
      if (yjsValue === undefined) {
        yjsValue = new YMap();
        // $FlowFixMe: internal field
        yjsValue._lexicalValue = lexicalValue;
        // $FlowFixMe: internal field
        yjsValue._collabNode = collabNode;
        // Create a subdocument
        doc = new Doc();
        yjsValue.set('doc', doc);
        yjsValue.set('type', 'editor');
        yjsArray.insert(index, [yjsValue]);
      }
      doc = doc || yjsValue.get('doc');
      const yjsId = yjsValue.get('id');
      const lexicalId = lexicalValue.id;
      if (yjsId !== lexicalId) {
        const yjsDocMap = binding.docMap;
        yjsDocMap.delete(yjsId);
        yjsValue.set('id', lexicalId);
        yjsDocMap.set(lexicalId, doc);
      }
    } else if (isDecoratorArray(lexicalValue)) {
      if (yjsValue === undefined) {
        yjsValue = new YArray();
        // $FlowFixMe: internal field
        yjsValue._lexicalValue = lexicalValue;
        // $FlowFixMe: internal field
        yjsValue._collabNode = collabNode;
        yjsArray.insert(index, [yjsValue]);
        observeDecoratorArray(binding, collabNode, lexicalValue, yjsValue);
      }
      syncLexicalDecoratorArrayToYjs(
        binding,
        collabNode,
        lexicalValue,
        yjsValue,
      );
    } else {
      yjsArray.insert(index, [lexicalValue]);
    }
  }
}

export function syncLexicalDecoratorMapToYjs(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  decoratorMap: DecoratorMap,
  yjsMap: YMap,
): void {
  const internalMap = decoratorMap._map;
  const keys = Array.from(internalMap.keys());

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    syncLexicalDecoratorMapKeyToYjs(
      binding,
      collabNode,
      internalMap,
      yjsMap,
      key,
    );
  }
}

function syncLexicalDecoratorArrayToYjs(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  decoratorArray: DecoratorArray,
  yjsArray: YArray<YDecoratorValue>,
): void {
  const internalArray = decoratorArray._array;

  for (let i = 0; i < internalArray.length; i++) {
    syncLexicalDecoratorArrayValueToYjs(
      binding,
      collabNode,
      internalArray,
      yjsArray,
      i,
    );
  }
}

function syncYjsDecoratorMapKeyToLexical(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  yjsMap: YMap,
  decoratorMap: DecoratorMap,
  key: string,
): void {
  const lexicalValue = decoratorMap.get(key);
  const yjsValue = yjsMap.get(key);

  if (lexicalValue !== yjsValue) {
    // $FlowFixMe: internal field
    let nextValue = yjsValue._lexicalValue;
    if (yjsValue instanceof YMap) {
      const type = yjsValue.get('type');

      if (type === 'editor') {
        if (nextValue === undefined) {
          const yjsDocMap = binding.docMap;
          const id = yjsValue.get('id');
          const doc = yjsValue.get('doc');
          nextValue = createDecoratorEditor(id);
          yjsValue._lexicalValue = nextValue;
          yjsValue._collabNode = collabNode;
          yjsDocMap.set(id, doc);
          mutationFromCollab(() => decoratorMap.set(key, nextValue));
        }
      } else if (type === 'map') {
        if (nextValue === undefined) {
          nextValue = createDecoratorMap(binding.editor);
          observeDecoratorMap(binding, collabNode, nextValue, yjsValue);
          yjsValue._lexicalValue = nextValue;
          yjsValue._collabNode = collabNode;
          mutationFromCollab(() => decoratorMap.set(key, nextValue));
        }
        syncYjsDecoratorMapToLexical(
          binding,
          collabNode,
          yjsValue,
          nextValue,
          null,
        );
      } else {
        invariant(false, 'Should never happen');
      }
    } else if (yjsValue instanceof YArray) {
      if (nextValue === undefined) {
        nextValue = createDecoratorArray(binding.editor);
        observeDecoratorArray(binding, collabNode, nextValue, yjsValue);
        yjsValue._lexicalValue = nextValue;
        yjsValue._collabNode = collabNode;
        mutationFromCollab(() => decoratorMap.set(key, nextValue));
      }
      syncYjsDecoratorArrayToLexical(binding, collabNode, yjsValue, nextValue);
    } else {
      mutationFromCollab(() => decoratorMap.set(key, yjsValue));
    }
  }
}

export function syncYjsDecoratorArrayValueToLexical(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  yjsArray: YArray<YDecoratorValue>,
  decoratorArray: DecoratorArray,
  index: number,
): void {
  const lexicalValue = decoratorArray._array[index];
  const yjsValue = yjsArray.get(index);

  if (lexicalValue !== yjsValue) {
    // $FlowFixMe: internal field
    let nextValue = yjsValue._lexicalValue;
    if (yjsValue instanceof YMap) {
      const type = yjsValue.get('type');

      if (type === 'editor') {
        if (nextValue === undefined) {
          const yjsDocMap = binding.docMap;
          const id = yjsValue.get('id');
          const doc = yjsValue.get('doc');
          nextValue = createDecoratorEditor(id);
          yjsValue._lexicalValue = nextValue;
          yjsValue._collabNode = collabNode;
          yjsDocMap.set(id, doc);
          mutationFromCollab(() => decoratorArray.splice(index, 0, nextValue));
        }
      } else if (type === 'map') {
        if (nextValue === undefined) {
          nextValue = createDecoratorMap(binding.editor);
          observeDecoratorMap(binding, collabNode, nextValue, yjsValue);
          yjsValue._lexicalValue = nextValue;
          yjsValue._collabNode = collabNode;
          mutationFromCollab(() => decoratorArray.splice(index, 0, nextValue));
        }
        syncYjsDecoratorMapToLexical(
          binding,
          collabNode,
          yjsValue,
          nextValue,
          null,
        );
      } else {
        invariant(false, 'Should never happen');
      }
    } else if (yjsValue instanceof YArray) {
      if (nextValue === undefined) {
        nextValue = createDecoratorArray(binding.editor);
        observeDecoratorArray(binding, collabNode, nextValue, yjsValue);
        yjsValue._lexicalValue = nextValue;
        yjsValue._collabNode = collabNode;
        mutationFromCollab(() => decoratorArray.splice(index, 0, nextValue));
      }
      syncYjsDecoratorArrayToLexical(binding, collabNode, yjsValue, nextValue);
    } else {
      mutationFromCollab(() => decoratorArray.splice(index, 0, yjsValue));
    }
  }
}

export function syncYjsDecoratorArrayToLexical(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  yjsArray: YArray<YDecoratorValue>,
  decoratorArray: DecoratorArray,
): void {
  const length = Math.max(yjsArray.length, decoratorArray.getLength());
  for (let i = 0; i < length; i++) {
    syncYjsDecoratorArrayValueToLexical(
      binding,
      collabNode,
      yjsArray,
      decoratorArray,
      i,
    );
  }
}

export function syncYjsDecoratorMapToLexical(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  yjsMap: YMap,
  decoratorMap: DecoratorMap,
  keysChanged: null | Set<string>,
): void {
  const keys =
    keysChanged === null ? Array.from(yjsMap.keys()) : Array.from(keysChanged);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    syncYjsDecoratorMapKeyToLexical(
      binding,
      collabNode,
      yjsMap,
      decoratorMap,
      key,
    );
  }
}
