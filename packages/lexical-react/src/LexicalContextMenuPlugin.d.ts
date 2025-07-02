/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { MenuRenderFn, MenuResolution } from './shared/LexicalMenu';
import type { JSX } from 'react';
import { CommandListenerPriority, LexicalNode } from 'lexical';
import { MutableRefObject, ReactPortal } from 'react';
import { MenuOption } from './shared/LexicalMenu';
export type ContextMenuRenderFn<TOption extends MenuOption> = (anchorElementRef: MutableRefObject<HTMLElement | null>, itemProps: {
    selectedIndex: number | null;
    selectOptionAndCleanUp: (option: TOption) => void;
    setHighlightedIndex: (index: number) => void;
    options: Array<TOption>;
}, menuProps: {
    setMenuRef: (element: HTMLElement | null) => void;
}) => ReactPortal | JSX.Element | null;
export type LexicalContextMenuPluginProps<TOption extends MenuOption> = {
    onSelectOption: (option: TOption, textNodeContainingQuery: LexicalNode | null, closeMenu: () => void, matchingString: string) => void;
    options: Array<TOption>;
    onClose?: () => void;
    onWillOpen?: (event: MouseEvent) => void;
    onOpen?: (resolution: MenuResolution) => void;
    menuRenderFn: ContextMenuRenderFn<TOption>;
    anchorClassName?: string;
    commandPriority?: CommandListenerPriority;
    parent?: HTMLElement;
};
export declare function LexicalContextMenuPlugin<TOption extends MenuOption>({ options, onWillOpen, onClose, onOpen, onSelectOption, menuRenderFn: contextMenuRenderFn, anchorClassName, commandPriority, parent, }: LexicalContextMenuPluginProps<TOption>): JSX.Element | null;
export { MenuOption, MenuRenderFn, MenuResolution };
//# sourceMappingURL=LexicalContextMenuPlugin.d.ts.map