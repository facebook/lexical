/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const glob = require('glob');
const {readFile, writeFile} = require('fs');

const options = {};

// This script attempts to find all Flow definition modules, and makes
// them compatible with www. Specifically, it finds any imports that
// reference lower case 'lexical' -> 'Lexical' and package references,
// such as 'lexical/Foo' -> 'LexicalFoo' and '@lexical/react/Foo' ->
// 'LexicalFoo'. Lastly, it creates these files in the 'dist' directory
// for each package so they can easily be copied to www.

glob('packages/**/flow/*.flow', options, function (error1, files) {
  if (error1) {
    throw error1;
  }
  files.forEach((file) => {
    readFile(file, 'utf8', function (error2, data) {
      if (error2) {
        throw error2;
      }
      const result = data
        .replace(
          / \* @flow strict/g,
          ' * @flow strict\n * @generated\n * @oncall lexical_web_text_editor',
        )
        .replace(/from 'lexical'/g, "from 'Lexical'")
        .replace(/from 'lexical'/g, "from 'Lexical'")
        .replace(/from 'lexical\/LinkNode'/g, "from 'LexicalLinkNode'")
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalEditor'/g,
          "from 'DEPRECATED_useLexicalEditor'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalRichText'/g,
          "from 'DEPRECATED_useLexicalRichText'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalPlainText'/g,
          "from 'DEPRECATED_useLexicalPlainText'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalEditorEvents'/g,
          "from 'DEPRECATED_useLexicalEditorEvents'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalAutoFormatter'/g,
          "from 'DEPRECATED_useLexicalAutoFormatter'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalDecorators'/g,
          "from 'DEPRECATED_useLexicalDecorators'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalList'/g,
          "from 'DEPRECATED_useLexicalList'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalCanShowPlaceholder'/g,
          "from 'DEPRECATED_useLexicalCanShowPlaceholder'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalCharacterLimit'/g,
          "from 'DEPRECATED_useLexicalCharacterLimit'",
        )
        .replace(
          /from '@lexical\/react\/DEPRECATED_useLexicalHistory'/g,
          "from 'DEPRECATED_useLexicalHistory'",
        )
        .replace(/from '@lexical\/react\/Lexical/g, "from 'Lexical")
        .replace(/from '@lexical\/utils\/'/g, "from 'LexicalUtils")
        .replace(/from '@lexical\/clipboard\'/g, "from 'LexicalClipboard'")
        .replace(/from '@lexical\/code\'/g, "from 'LexicalCode'")
        .replace(/from '@lexical\/dragon\'/g, "from 'LexicalDragon'")
        .replace(/from '@lexical\/file\'/g, "from 'LexicalFile'")
        .replace(/from '@lexical\/hashtag\'/g, "from 'LexicalHashtag'")
        .replace(/from '@lexical\/history\'/g, "from 'LexicalHistory'")
        .replace(/from '@lexical\/link\'/g, "from 'LexicalLink'")
        .replace(/from '@lexical\/list\'/g, "from 'LexicalList'")
        .replace(/from '@lexical\/markdown\'/g, "from 'LexicalMarkdown'")
        .replace(/from '@lexical\/headless\'/g, "from 'LexicalHeadless'")
        .replace(/from '@lexical\/offset\'/g, "from 'LexicalOffset'")
        .replace(/from '@lexical\/overflow\'/g, "from 'LexicalOverflow'")
        .replace(/from '@lexical\/plain-text\'/g, "from 'LexicalPlainText'")
        .replace(/from '@lexical\/rich-text\'/g, "from 'LexicalRichText'")
        .replace(/from '@lexical\/selection\'/g, "from 'LexicalSelection'")
        .replace(/from '@lexical\/table\'/g, "from 'LexicalTable'")
        .replace(/from '@lexical\/text\'/g, "from 'LexicalText'")
        .replace(/from '@lexical\/utils\'/g, "from 'LexicalUtils'")
        .replace(/from '@lexical\/yjs\'/g, "from 'LexicalYjs'")
        .replace(
          /from 'lexical\/CodeHighlightNode'/g,
          "from 'LexicalCodeHighlightNode'",
        );

      const distDirectory = file.replace('/flow/', '/dist/');

      writeFile(distDirectory, result, 'utf8', function (error3) {
        if (error3) {
          throw error3;
        }
      });
    });
  });
});
