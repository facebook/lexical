/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { MenuRenderFn, MenuResolution, MenuTextMatch, TriggerFn } from './shared/LexicalMenu';
import { LexicalCommand, TextNode } from 'lexical';
import { MenuOption } from './shared/LexicalMenu';
export declare const PUNCTUATION = "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";
export declare function getScrollParent(element: HTMLElement, includeHidden: boolean): HTMLElement | HTMLBodyElement;
export declare function useDynamicPositioning(resolution: MenuResolution | null, targetElement: HTMLElement | null, onReposition: () => void, onVisibilityChange?: (isInView: boolean) => void): void;
export declare const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND: LexicalCommand<{
    index: number;
    option: MenuOption;
}>;
export declare function useBasicTypeaheadTriggerMatch(trigger: string, { minLength, maxLength }: {
    minLength?: number;
    maxLength?: number;
}): TriggerFn;
export type TypeaheadMenuPluginProps<TOption extends MenuOption> = {
    onQueryChange: (matchingString: string | null) => void;
    onSelectOption: (option: TOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void, matchingString: string) => void;
    options: Array<TOption>;
    menuRenderFn: MenuRenderFn<TOption>;
    triggerFn: TriggerFn;
    onOpen?: (resolution: MenuResolution) => void;
    onClose?: () => void;
    anchorClassName?: string;
};
export declare function LexicalTypeaheadMenuPlugin<TOption extends MenuOption>({ options, onQueryChange, onSelectOption, onOpen, onClose, menuRenderFn, triggerFn, anchorClassName, }: TypeaheadMenuPluginProps<TOption>): JSX.Element | null;
export { MenuOption, MenuRenderFn, MenuResolution, MenuTextMatch, TriggerFn };
