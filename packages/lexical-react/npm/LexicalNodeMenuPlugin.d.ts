/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { MenuRenderFn, MenuResolution } from './shared/LexicalMenu';
import { NodeKey, TextNode } from 'lexical';
import { MenuOption } from './shared/LexicalMenu';
export type NodeMenuPluginProps<TOption extends MenuOption> = {
    onSelectOption: (option: TOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void, matchingString: string) => void;
    options: Array<TOption>;
    nodeKey: NodeKey | null;
    onClose?: () => void;
    onOpen?: (resolution: MenuResolution) => void;
    menuRenderFn: MenuRenderFn<TOption>;
    anchorClassName?: string;
};
export declare function LexicalNodeMenuPlugin<TOption extends MenuOption>({ options, nodeKey, onClose, onOpen, onSelectOption, menuRenderFn, anchorClassName, }: NodeMenuPluginProps<TOption>): JSX.Element | null;
export { MenuOption, MenuRenderFn, MenuResolution };
