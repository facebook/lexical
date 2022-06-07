/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
declare type ChangeHandler = (url: string | null, prevUrl: string | null) => void;
declare type LinkMatcherResult = {
    index: number;
    length: number;
    text: string;
    url: string;
};
export declare type LinkMatcher = (text: string) => LinkMatcherResult | null;
export declare function AutoLinkPlugin({ matchers, onChange, }: {
    matchers: Array<LinkMatcher>;
    onChange?: ChangeHandler;
}): JSX.Element;
export {};
