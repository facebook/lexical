/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @flow strict
 */

import LexicalMarkdownShortcutPlugin from '@lexical/react/LexicalMarkdownShortcutPlugin';
import * as React from 'react';

import {PLAYGROUND_TRANSFORMERS} from './MarkdownTransformers';

export default function MarkdownPlugin(): React$Node {
  return (
    <LexicalMarkdownShortcutPlugin transformers={PLAYGROUND_TRANSFORMERS} />
  );
}
