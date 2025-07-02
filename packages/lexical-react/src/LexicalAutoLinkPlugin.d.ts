/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { AutoLinkAttributes } from '@lexical/link';
import type { JSX } from 'react';
type ChangeHandler = (url: string | null, prevUrl: string | null) => void;
type LinkMatcherResult = {
    attributes?: AutoLinkAttributes;
    index: number;
    length: number;
    text: string;
    url: string;
};
export type LinkMatcher = (text: string) => LinkMatcherResult | null;
export declare function createLinkMatcherWithRegExp(regExp: RegExp, urlTransformer?: (text: string) => string): (text: string) => {
    index: number;
    length: number;
    text: string;
    url: string;
};
export declare function AutoLinkPlugin({ matchers, onChange, }: {
    matchers: Array<LinkMatcher>;
    onChange?: ChangeHandler;
}): JSX.Element | null;
export {};
//# sourceMappingURL=LexicalAutoLinkPlugin.d.ts.map