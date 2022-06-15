/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

declare var __DEV__: boolean;

declare var queueMicrotask: (fn: () => void) => void;

declare class CompositionEvent extends UIEvent {
  +data: string | null;
}

declare class StaticRange {
  collapsed: boolean;
  endContainer: Node;
  endOffset: number;
  startContainer: Node;
  startOffset: number;
}

declare class InputEvent extends UIEvent {
  +data: string | null;
  +dataTransfer?: DataTransfer;
  +getTargetRanges?: () => Array<StaticRange>;
  +inputType: string;
  +isComposing: boolean;
}

declare type Segment = {
  +index: number,
  +isWordLike: boolean,
  +segment: string,
};

declare var Intl: {
  Collator: Class<Intl$Collator>,
  DateTimeFormat: Class<Intl$DateTimeFormat>,
  getCanonicalLocales?: (locales?: Intl$Locales) => Intl$Locale[],
  NumberFormat: Class<Intl$NumberFormat>,
  PluralRules: ?Class<Intl$PluralRules>,
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
