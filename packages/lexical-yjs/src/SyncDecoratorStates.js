/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorMap} from 'lexical';
import type {Binding} from '.';

import {Map as YMap, Doc} from 'yjs';
import {
  isDecoratorMap,
  isDecoratorEditor,
  createDecoratorEditor,
  createDecoratorMap,
} from 'lexical';
import invariant from 'shared/invariant';

export function syncLexicalDecoratorMapToYjs(
  binding: Binding,
  decoratorMap: DecoratorMap,
  yjsMap: YMap,
): void {
  const internalMap = decoratorMap._map;
  const keys = Array.from(internalMap.keys());

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const lexicalValue = internalMap.get(key);
    let yjsValue = yjsMap.get(key);

    if (lexicalValue !== yjsValue) {
      if (isDecoratorMap(lexicalValue)) {
        if (yjsValue === undefined) {
          yjsValue = new YMap();
          yjsValue.set('type', 'map');
          yjsMap.set(key, yjsValue);
        }
        syncLexicalDecoratorMapToYjs(binding, lexicalValue, yjsValue);
      } else if (isDecoratorEditor(lexicalValue)) {
        let doc;
        if (yjsValue === undefined) {
          yjsValue = new YMap();
          // $FlowFixMe: internal field
          yjsValue._lexicalValue = lexicalValue;
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
}

export function syncYjsDecoratorMapToLexical(
  binding: Binding,
  yjsMap: YMap,
  decoratorMap: DecoratorMap,
  keysChanged: null | Set<string>,
): void {
  const internalMap = decoratorMap._map;
  const keys =
    keysChanged === null ? Array.from(yjsMap.keys()) : Array.from(keysChanged);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
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
            yjsDocMap.set(id, doc);
            internalMap.set(key, nextValue);
          }
        } else if (type === 'map') {
          if (nextValue === undefined) {
            nextValue = createDecoratorMap(binding.editor);
            yjsValue._lexicalValue = nextValue;
            internalMap.set(key, nextValue);
          }
          syncYjsDecoratorMapToLexical(binding, yjsValue, nextValue, null);
        } else {
          invariant(false, 'Should never happen');
        }
      } else {
        internalMap.set(key, yjsValue);
      }
    }
  }
}
