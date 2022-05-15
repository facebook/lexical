/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

type ChangeHandler = (url: string | null, prevUrl: string | null) => void;
type LinkMatcherResult = {
  text: string;
  url: string;
  length: number;
  index: number;
};

export type LinkMatcher = (text: string) => LinkMatcherResult | null;
export function AutoLinkPlugin(props: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
}): JSX.Element | null;
