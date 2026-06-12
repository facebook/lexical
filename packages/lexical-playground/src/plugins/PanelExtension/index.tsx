/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalEditor, NodeKey} from 'lexical';
import type {JSX, RefObject} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlotRef} from '@lexical/react/useLexicalSlotRef';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  setDOMUnmanaged,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {$createPanelNode, PanelNode} from '../../nodes/PanelNode';

export const INSERT_PANEL_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('INSERT_PANEL_COMMAND');

interface MountedChildren {
  childrenEl: HTMLElement;
  hostDom: HTMLElement;
}

// The getDOMSlot analog of useLexicalSlotRef: attaches the Panel's hidden
// children element (where the reconciler renders the linked-list body) into
// the chrome and reveals it. Same idempotent no-cleanup-per-render shape as
// useLexicalSlotRef so a chrome re-render never detaches the element mid-edit;
// the final unmount parks it back hidden in the host DOM.
function usePanelChildren<T extends HTMLElement = HTMLElement>(
  editor: LexicalEditor,
  nodeKey: NodeKey,
): RefObject<T | null> {
  const targetRef = useRef<T | null>(null);
  const mountedRef = useRef<MountedChildren | null>(null);
  useEffect(() => {
    const target = targetRef.current;
    const hostDom = editor.getElementByKey(nodeKey);
    if (target === null || hostDom === null) {
      return;
    }
    const childrenEl = hostDom.querySelector<HTMLElement>(
      '.lexical-panel-children',
    );
    if (childrenEl === null) {
      return;
    }
    if (childrenEl.parentElement !== target) {
      target.appendChild(childrenEl);
    }
    childrenEl.style.display = '';
    mountedRef.current = {childrenEl, hostDom};
  });
  useEffect(() => {
    return () => {
      const mounted = mountedRef.current;
      if (mounted !== null) {
        mounted.childrenEl.style.display = 'none';
        if (mounted.childrenEl.parentElement !== mounted.hostDom) {
          mounted.hostDom.appendChild(mounted.childrenEl);
        }
        mountedRef.current = null;
      }
    };
  }, []);
  return targetRef;
}

function PanelChrome({
  editor,
  nodeKey,
}: {
  editor: LexicalEditor;
  nodeKey: NodeKey;
}): JSX.Element {
  // The chrome is foreign DOM injected into a managed element's host DOM;
  // mark it unmanaged synchronously (a ref callback runs before any layout
  // effect moves the editable regions into it) so the mutation observer
  // skips the whole chrome subtree instead of evicting it as unknown DOM.
  const chromeRef = useCallback((el: HTMLDivElement | null) => {
    if (el !== null) {
      setDOMUnmanaged(el);
    }
  }, []);
  const titleRef = useLexicalSlotRef<HTMLDivElement>(editor, nodeKey, 'title');
  const childrenRef = usePanelChildren<HTMLDivElement>(editor, nodeKey);
  return (
    <div className="lexical-panel-chrome" ref={chromeRef}>
      <div className="lexical-panel-label">Panel</div>
      <div className="lexical-panel-title" ref={titleRef} />
      <div className="lexical-panel-body" ref={childrenRef} />
    </div>
  );
}

// React presentation for every PanelNode: a portal into each host's DOM
// renders the chrome, and the chrome attaches the editable regions. This is
// the ElementNode equivalent of a DecoratorNode's decorate(), implemented in
// userland with a mutation listener.
export function PanelPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [keys, setKeys] = useState<ReadonlySet<NodeKey>>(() => new Set());
  useEffect(() => {
    return editor.registerMutationListener(
      PanelNode,
      mutations => {
        setKeys(prev => {
          let changed = false;
          const next = new Set(prev);
          for (const [key, mutation] of mutations) {
            if (mutation === 'destroyed') {
              changed = next.delete(key) || changed;
            } else if (!next.has(key)) {
              next.add(key);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      {skipInitialization: false},
    );
  }, [editor]);
  return (
    <>
      {Array.from(keys, key => {
        const dom = editor.getElementByKey(key);
        return dom === null
          ? null
          : createPortal(
              <PanelChrome editor={editor} nodeKey={key} />,
              dom,
              key,
            );
      })}
    </>
  );
}

export const PanelExtension = /* @__PURE__ */ defineExtension({
  name: '@lexical/playground/Panel',
  nodes: [PanelNode],
  register: editor => {
    return editor.registerCommand<void>(
      INSERT_PANEL_COMMAND,
      () => {
        $insertNodeToNearestRoot($createPanelNode());
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  },
});
