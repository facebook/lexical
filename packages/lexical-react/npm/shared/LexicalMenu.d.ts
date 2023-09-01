/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { LexicalCommand, LexicalEditor, TextNode } from 'lexical';
import { MutableRefObject, ReactPortal } from 'react';
export type MenuTextMatch = {
    leadOffset: number;
    matchingString: string;
    replaceableString: string;
};
export type MenuResolution = {
    match?: MenuTextMatch;
    getRect: () => DOMRect;
};
export declare const PUNCTUATION = "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";
export declare class MenuOption {
    key: string;
    ref?: MutableRefObject<HTMLElement | null>;
    constructor(key: string);
    setRefElement(element: HTMLElement | null): void;
}
export type MenuRenderFn<TOption extends MenuOption> = (anchorElementRef: MutableRefObject<HTMLElement | null>, itemProps: {
    selectedIndex: number | null;
    selectOptionAndCleanUp: (option: TOption) => void;
    setHighlightedIndex: (index: number) => void;
    options: Array<TOption>;
}, matchingString: string | null) => ReactPortal | JSX.Element | null;
export declare function getScrollParent(element: HTMLElement, includeHidden: boolean): HTMLElement | HTMLBodyElement;
export declare function useDynamicPositioning(resolution: MenuResolution | null, targetElement: HTMLElement | null, onReposition: () => void, onVisibilityChange?: (isInView: boolean) => void): void;
export declare const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND: LexicalCommand<{
    index: number;
    option: MenuOption;
}>;
export declare function LexicalMenu<TOption extends MenuOption>({ close, editor, anchorElementRef, resolution, options, menuRenderFn, onSelectOption, shouldSplitNodeWithQuery, }: {
    close: () => void;
    editor: LexicalEditor;
    anchorElementRef: MutableRefObject<HTMLElement>;
    resolution: MenuResolution;
    options: Array<TOption>;
    shouldSplitNodeWithQuery?: boolean;
    menuRenderFn: MenuRenderFn<TOption>;
    onSelectOption: (option: TOption, textNodeContainingQuery: TextNode | null, closeMenu: () => void, matchingString: string) => void;
}): JSX.Element | null;
export declare function useMenuAnchorRef(resolution: MenuResolution | null, setResolution: (r: MenuResolution | null) => void, className?: string): MutableRefObject<HTMLElement>;
export type TriggerFn = (text: string, editor: LexicalEditor) => MenuTextMatch | null;
