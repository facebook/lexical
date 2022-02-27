/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
        .replace(/ \* @flow strict/g, ' * @flow strict\n * @generated')
        .replace(/from 'lexical'/g, "from 'Lexical'")
        .replace(/from 'lexical'/g, "from 'Lexical'")
        .replace(/from '@lexical\/react\/'/g, "from 'Lexical")
        .replace(/from 'lexical\/LinkNode'/g, "from 'LinkNode'")
        .replace(
          /from 'lexical\/CodeHighlightNode'/g,
          "from 'CodeHighlightNode'",
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
