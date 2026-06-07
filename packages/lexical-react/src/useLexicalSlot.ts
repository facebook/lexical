/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey} from 'lexical';
import type {RefObject} from 'react';

import {$getNodeByKey, $getSlotContainer} from 'lexical';
import {useRef} from 'react';

import useLayoutEffect from './shared/useLayoutEffect';

/**
 * @experimental
 *
 * Mounts a decorator host's named slot into the host's React-rendered chrome.
 * A decorator host leaves its slot container detached during reconciliation
 * (it owns no inline DOM layout of its own), so attach the returned ref to the
 * element where the slot should live and this hook moves the container there
 * after each render, before paint. It re-runs every render and is idempotent,
 * so a slot added after the host's first render — or a container recreated by a
 * remove/re-add — is picked up without extra wiring.
 */
export function useLexicalSlot<T extends HTMLElement = HTMLElement>(
  editor: LexicalEditor,
  nodeKey: NodeKey,
  slotName: string,
): RefObject<T | null> {
  const targetRef = useRef<T | null>(null);
  useLayoutEffect(() => {
    const target = targetRef.current;
    if (target === null) {
      return;
    }
    const container = editor.read(() => {
      const host = $getNodeByKey(nodeKey);
      return host !== null ? $getSlotContainer(host, slotName) : null;
    });
    if (container !== null && container.parentElement !== target) {
      target.appendChild(container);
    }
  });
  return targetRef;
}
