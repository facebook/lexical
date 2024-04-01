/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {MenuRenderFn, MenuResolution} from './shared/LexicalMenu';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {calculateZoomLevel} from '@lexical/utils';
import {
  COMMAND_PRIORITY_LOW,
  CommandListenerPriority,
  LexicalNode,
} from 'lexical';
import {
  MutableRefObject,
  ReactPortal,
  useCallback,
  useEffect,
  useState,
} from 'react';
import * as React from 'react';

import {LexicalMenu, MenuOption, useMenuAnchorRef} from './shared/LexicalMenu';

export type ContextMenuRenderFn<TOption extends MenuOption> = (
  anchorElementRef: MutableRefObject<HTMLElement | null>,
  itemProps: {
    selectedIndex: number | null;
    selectOptionAndCleanUp: (option: TOption) => void;
    setHighlightedIndex: (index: number) => void;
    options: Array<TOption>;
  },
  menuProps: {
    setMenuRef: (element: HTMLElement | null) => void;
  },
) => ReactPortal | JSX.Element | null;

export type LexicalContextMenuPluginProps<TOption extends MenuOption> = {
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: LexicalNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void;
  options: Array<TOption>;
  onClose?: () => void;
  onWillOpen?: (event: MouseEvent) => void;
  onOpen?: (resolution: MenuResolution) => void;
  menuRenderFn: ContextMenuRenderFn<TOption>;
  anchorClassName?: string;
  commandPriority?: CommandListenerPriority;
  parent?: HTMLElement;
};

const PRE_PORTAL_DIV_SIZE = 1;

export function LexicalContextMenuPlugin<TOption extends MenuOption>({
  options,
  onWillOpen,
  onClose,
  onOpen,
  onSelectOption,
  menuRenderFn: contextMenuRenderFn,
  anchorClassName,
  commandPriority = COMMAND_PRIORITY_LOW,
  parent,
}: LexicalContextMenuPluginProps<TOption>): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [resolution, setResolution] = useState<MenuResolution | null>(null);
  const menuRef = React.useRef<HTMLElement | null>(null);

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

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (onWillOpen != null) {
        onWillOpen(event);
      }
      const zoom = calculateZoomLevel(event.target as Element);
      openNodeMenu({
        getRect: () =>
          new DOMRect(
            event.clientX / zoom,
            event.clientY / zoom,
            PRE_PORTAL_DIV_SIZE,
            PRE_PORTAL_DIV_SIZE,
          ),
      });
    },
    [openNodeMenu, onWillOpen],
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (
        resolution !== null &&
        menuRef.current != null &&
        event.target != null &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeNodeMenu();
      }
    },
    [closeNodeMenu, resolution],
  );

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener('contextmenu', handleContextMenu);
      return () =>
        editorElement.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [editor, handleContextMenu]);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [editor, handleClick]);

  return resolution === null || editor === null ? null : (
    <LexicalMenu
      close={closeNodeMenu}
      resolution={resolution}
      editor={editor}
      anchorElementRef={anchorElementRef}
      options={options}
      menuRenderFn={(anchorRef, itemProps) =>
        contextMenuRenderFn(anchorRef, itemProps, {
          setMenuRef: (ref) => {
            menuRef.current = ref;
          },
        })
      }
      onSelectOption={onSelectOption}
      commandPriority={commandPriority}
    />
  );
}

export {MenuOption, MenuRenderFn, MenuResolution};
