/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { LinkAttributes } from '@lexical/link';
type ChangeHandler = (url: string | null, prevUrl: string | null) => void;
type LinkMatcherResult = {
    attributes?: LinkAttributes;
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
} | null;
export declare function AutoLinkPlugin({ matchers, onChange, }: {
    matchers: Array<LinkMatcher>;
    onChange?: ChangeHandler;
}): JSX.Element | null;
export {};
