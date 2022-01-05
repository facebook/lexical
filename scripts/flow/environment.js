/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

declare var __DEV__: boolean;

declare var queueMicrotask: (fn: () => void) => void;

declare class CompositionEvent extends UIEvent {
  +data: string | null;
}

declare class StaticRange {
  collapsed: boolean;
  startContainer: Node;
  endContainer: Node;
  startOffset: number;
  endOffset: number;
}

declare class InputEvent extends UIEvent {
  +data: string | null;
  +inputType: string;
  +isComposing: boolean;
  +getTargetRanges?: () => Array<StaticRange>;
  +dataTransfer?: DataTransfer;
}

declare type Segment = {
  +isWordLike: boolean,
  +index: number,
  +segment: string,
};

declare var Intl: {
  Collator: Class<Intl$Collator>,
  DateTimeFormat: Class<Intl$DateTimeFormat>,
  NumberFormat: Class<Intl$NumberFormat>,
  PluralRules: ?Class<Intl$PluralRules>,
  getCanonicalLocales?: (locales?: Intl$Locales) => Intl$Locale[],
  Segmenter: (
    locale?: string,
    options?: {
      granularity: 'word' | 'grapheme' | 'sentence',
    },
  ) => {
    containing(index: number): void | Segment,
    segment(string: string): Iterable<Segment>,
  },
  ...
};
