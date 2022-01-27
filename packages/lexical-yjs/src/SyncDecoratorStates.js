/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorMap, DecoratorStateValue} from 'lexical';
import type {Binding} from '.';
import type {CollabDecoratorNode} from './CollabDecoratorNode';

import {Map as YMap, Doc} from 'yjs';
import {
  isDecoratorMap,
  isDecoratorEditor,
  createDecoratorEditor,
  createDecoratorMap,
} from 'lexical';
import invariant from 'shared/invariant';
import {syncWithTransaction} from './Utils';

export function observeDecoratorMap(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  decoratorMap: DecoratorMap,
  yjsMap: YMap,
): void {
  const unobserve = decoratorMap.observe((changedKey: string) => {
    syncWithTransaction(binding, () =>
      syncLexicalDecoratorMapKeyToYjs(
        binding,
        collabNode,
        decoratorMap,
        decoratorMap._map,
        yjsMap,
        changedKey,
      ),
    );
  });
  collabNode._unobservers.add(unobserve);
}

export function syncLexicalDecoratorMapKeyToYjs(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  decoratorMap: DecoratorMap,
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
        observeDecoratorMap(binding, collabNode, decoratorMap, yjsMap);
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
    } else {
      yjsMap.set(key, lexicalValue);
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
      decoratorMap,
      internalMap,
      yjsMap,
      key,
    );
  }
}

export function syncYjsDecoratorMapKeyToLexical(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  yjsMap: YMap,
  decoratorMap: DecoratorMap,
  internalMap: Map<string, DecoratorStateValue>,
  key: string,
): void {
  const lexicalValue = internalMap.get(key);
  const yjsValue = yjsMap.get(key);

  if (lexicalValue !== yjsValue) {
    if (yjsValue instanceof YMap) {
      const type = yjsValue.get('type');
      // $FlowFixMe: internal field
      let nextValue = yjsValue._lexicalValue;

      if (type === 'editor') {
        if (nextValue === undefined) {
          const yjsDocMap = binding.docMap;
          const id = yjsValue.get('id');
          const doc = yjsValue.get('doc');
          nextValue = createDecoratorEditor(id);
          yjsValue._lexicalValue = nextValue;
          yjsValue._collabNode = collabNode;
          yjsDocMap.set(id, doc);
          internalMap.set(key, nextValue);
        }
      } else if (type === 'map') {
        if (nextValue === undefined) {
          nextValue = createDecoratorMap(binding.editor);
          observeDecoratorMap(binding, collabNode, nextValue, yjsMap);
          yjsValue._lexicalValue = nextValue;
          yjsValue._collabNode = collabNode;
          internalMap.set(key, nextValue);
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
    } else {
      decoratorMap.set(key, yjsValue);
    }
  }
}

export function syncYjsDecoratorMapToLexical(
  binding: Binding,
  collabNode: CollabDecoratorNode,
  yjsMap: YMap,
  decoratorMap: DecoratorMap,
  keysChanged: null | Set<string>,
): void {
  const internalMap = decoratorMap._map;
  const keys =
    keysChanged === null ? Array.from(yjsMap.keys()) : Array.from(keysChanged);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    syncYjsDecoratorMapKeyToLexical(
      binding,
      collabNode,
      yjsMap,
      decoratorMap,
      internalMap,
      key,
    );
  }
}
