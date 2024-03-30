/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line simple-import-sort/imports
import * as Prism from 'prismjs';

import * as prism_clike from 'prismjs/components/prism-clike';
import * as prism_javascript from 'prismjs/components/prism-javascript';
import * as prism_markup from 'prismjs/components/prism-markup';
import * as prism_markdown from 'prismjs/components/prism-markdown';
import * as prism_c from 'prismjs/components/prism-c';
import * as prism_css from 'prismjs/components/prism-css';
import * as prism_objectivec from 'prismjs/components/prism-objectivec';
import * as prism_sql from 'prismjs/components/prism-sql';
import * as prism_python from 'prismjs/components/prism-python';
import * as prism_rust from 'prismjs/components/prism-rust';
import * as prism_swift from 'prismjs/components/prism-swift';
import * as prism_typescript from 'prismjs/components/prism-typescript';
import * as prism_java from 'prismjs/components/prism-java';
import * as prism_cpp from 'prismjs/components/prism-cpp';

// Avoid tree-shaking
export const reifyPrismLanguages = (): unknown => ({
  Prism,
  languages: [
    prism_clike,
    prism_javascript,
    prism_markup,
    prism_markdown,
    prism_c,
    prism_css,
    prism_objectivec,
    prism_sql,
    prism_python,
    prism_rust,
    prism_swift,
    prism_typescript,
    prism_java,
    prism_cpp,
  ],
});

export {Prism};
