/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey} from 'lexical';
import type {RefObject} from 'react';

import {mountSlotContainer, unmountSlotContainer} from 'lexical';
import {useRef} from 'react';

import useLayoutEffect from './shared/useLayoutEffect';

interface MountedSlot {
  container: HTMLElement;
  editor: LexicalEditor;
  nodeKey: NodeKey;
}

/**
 * @experimental
 *
 * Mounts a host's named slot into the host's React-rendered chrome. The
 * reconciler renders every slot subtree synchronously into a hidden
 * placeholder container; attach the returned ref to the element where the
 * slot should live and this hook moves the container there after each
 * render, before paint, revealing it. It re-runs
 * every render and is idempotent (a React wrapper over the
 * framework-independent {@link mountSlotContainer}), so a slot added after
 * the host's first render — or a container recreated by a remove/re-add —
 * is picked up without extra wiring. On unmount (or a nodeKey/slotName
 * change) the previous container is parked back in its host DOM as a hidden
 * placeholder via {@link unmountSlotContainer}.
 */
export function useLexicalSlot<T extends HTMLElement = HTMLElement>(
  editor: LexicalEditor,
  nodeKey: NodeKey,
  slotName: string,
): RefObject<T | null> {
  const targetRef = useRef<T | null>(null);
  const mountedRef = useRef<MountedSlot | null>(null);
  useLayoutEffect(() => {
    const target = targetRef.current;
    if (target === null) {
      return;
    }
    const container = mountSlotContainer(editor, nodeKey, slotName, target);
    // A nodeKey/slotName change resolves a different container; park the one
    // this hook mounted previously back in its host so the stale slot DOM
    // doesn't linger in the chrome next to the new one.
    const previous = mountedRef.current;
    if (previous !== null && previous.container !== container) {
      unmountSlotContainer(
        previous.editor,
        previous.nodeKey,
        previous.container,
      );
    }
    mountedRef.current =
      container === null ? null : {container, editor, nodeKey};
  });
  // Final unmount: park the mounted container back in its host DOM (hidden)
  // so the slot subtree doesn't leave the document with the chrome. Reads the
  // ref so it sees the latest mount even though the deps are empty.
  useLayoutEffect(() => {
    return () => {
      const mounted = mountedRef.current;
      if (mounted !== null) {
        unmountSlotContainer(
          mounted.editor,
          mounted.nodeKey,
          mounted.container,
        );
        mountedRef.current = null;
      }
    };
  }, []);
  return targetRef;
}
