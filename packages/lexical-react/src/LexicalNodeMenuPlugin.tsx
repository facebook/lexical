/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MenuRenderFn, MenuResolution} from './shared/LexicalMenu';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  CommandListenerPriority,
  NodeKey,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useState} from 'react';
import * as React from 'react';
import {startTransition} from 'shared/reactPatches';

import {LexicalMenu, MenuOption, useMenuAnchorRef} from './shared/LexicalMenu';

export type NodeMenuPluginProps<TOption extends MenuOption> = {
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  options: Array<TOption>;
  nodeKey: NodeKey | null;
  onClose?: () => void;
  onOpen?: (resolution: MenuResolution) => void;
  menuRenderFn: MenuRenderFn<TOption>;
  anchorClassName?: string;
  commandPriority?: CommandListenerPriority;
  parent?: HTMLElement;
};

export function LexicalNodeMenuPlugin<TOption extends MenuOption>({
  options,
  nodeKey,
  onClose,
  onOpen,
  onSelectOption,
  menuRenderFn,
  anchorClassName,
  commandPriority = COMMAND_PRIORITY_LOW,
  parent,
}: NodeMenuPluginProps<TOption>): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useState<MenuResolution | null>(null);
  const anchorElementRef = useMenuAnchorRef(
    resolution,
    setResolution,
    anchorClassName,
    parent,
  );

  const closeNodeMenu = useCallback(() => {
    setResolution(null);
    if (onClose != null && resolution !== null) {
      onClose();
    }
  }, [onClose, resolution]);

  const openNodeMenu = useCallback(
    (res: MenuResolution) => {
      setResolution(res);
      if (onOpen != null && resolution === null) {
        onOpen(res);
      }
    },
    [onOpen, resolution],
  );

  const positionOrCloseMenu = useCallback(() => {
    if (nodeKey) {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        const domElement = editor.getElementByKey(nodeKey);
        if (node != null && domElement != null) {
          if (resolution == null) {
            startTransition(() =>
              openNodeMenu({
                getRect: () => domElement.getBoundingClientRect(),
              }),
            );
          }
        }
      });
    } else if (nodeKey == null && resolution != null) {
      closeNodeMenu();
    }
  }, [closeNodeMenu, editor, nodeKey, openNodeMenu, resolution]);

  useEffect(() => {
    positionOrCloseMenu();
  }, [positionOrCloseMenu, nodeKey]);

  useEffect(() => {
    if (nodeKey != null) {
      return editor.registerUpdateListener(({dirtyElements}) => {
        if (dirtyElements.get(nodeKey)) {
          positionOrCloseMenu();
        }
      });
    }
  }, [editor, positionOrCloseMenu, nodeKey]);

  return anchorElementRef.current === null ||
    resolution === null ||
    editor === null ? null : (
    <LexicalMenu
      close={closeNodeMenu}
      resolution={resolution}
      editor={editor}
      anchorElementRef={anchorElementRef}
      options={options}
      menuRenderFn={menuRenderFn}
      onSelectOption={onSelectOption}
      commandPriority={commandPriority}
    />
  );
}

export {MenuOption, MenuRenderFn, MenuResolution};
