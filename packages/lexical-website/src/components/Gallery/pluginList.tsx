/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ReactNode} from 'react';

export type Example = {
  description: string;
  title: string;
  uri?: string;
  preview?: string;
  renderPreview?: () => ReactNode;
};

export const plugins = (customFields: {
  [key: string]: unknown;
}): Array<Example> => [
  {
    description: 'Learn how to create an editor with Emojis',
    title: 'EmojiPlugin',
    uri: `${customFields.STACKBLITZ_PREFIX}examples/vanilla-js-plugin?embed=1&file=src%2Femoji-plugin%2FEmojiPlugin.ts&terminalHeight=0&ctl=0`,
  },
  {
    description: 'Learn how to create an editor with Real Time Collaboration',
    title: 'Collab RichText',
    uri: 'https://stackblitz.com/github/facebook/lexical/tree/fix/collab_example/examples/react-rich-collab?ctl=0&file=src%2Fmain.tsx&terminalHeight=0&embed=1',
  },
];
