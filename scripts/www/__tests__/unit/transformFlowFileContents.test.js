/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const transformFlowFileContents = require('../../transformFlowFileContents');

const HEADER_BEFORE =
  `
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
`.trim() + '\n';

const HEADER_AFTER =
  `
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @generated
 * @oncall lexical_web_text_editor
 */
`.trim() + '\n';

const IMPORTS_BEFORE =
  `
import type {Doc, RelativePosition, UndoManager, XmlText} from 'yjs';
import type {
  DecoratorNode,
  EditorState,
  ElementNode,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  LineBreakNode,
  NodeMap,
  NodeKey,
  TextNode,
} from 'lexical';
`.trim() + '\n';

const IMPORTS_AFTER =
  `
import type {Doc, RelativePosition, UndoManager, XmlText} from 'yjs';
import type {
  DecoratorNode,
  EditorState,
  ElementNode,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  LineBreakNode,
  NodeMap,
  NodeKey,
  TextNode,
} from 'Lexical';
`.trim() + '\n';

const EXTRA_BLOCK_COMMENT =
  `
/**
 * LexicalDevToolsCore
 */
`.trim() + '\n';

describe('transformFlowFileContents', () => {
  [
    {
      input: [HEADER_BEFORE, IMPORTS_BEFORE, EXTRA_BLOCK_COMMENT].join('\n'),
      output: [HEADER_AFTER, IMPORTS_AFTER, EXTRA_BLOCK_COMMENT].join('\n'),
      title: 'header-imports-comment',
    },
    {
      input: [HEADER_BEFORE, EXTRA_BLOCK_COMMENT].join('\n'),
      output: [HEADER_AFTER, EXTRA_BLOCK_COMMENT].join('\n'),
      title: 'header-comment',
    },
    {
      input: [HEADER_BEFORE, IMPORTS_BEFORE].join('\n'),
      output: [HEADER_AFTER, IMPORTS_AFTER].join('\n'),
      title: 'header-imports',
    },
    {
      input: [HEADER_BEFORE].join('\n'),
      output: [HEADER_AFTER].join('\n'),
      title: 'header',
    },
  ].forEach(({input, output, title}) => {
    it(`transforms ${title}`, async () => {
      expect(await transformFlowFileContents(input)).toBe(output);
    });
  });
});
