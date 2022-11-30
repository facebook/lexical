/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

type TokenStream = Array<string | Token>;

type Token = {
  alias: string | Array<string>,
  content: string | TokenStream,
  type: string,
};

declare module 'prismjs/components/prism-core' {
  declare module.exports: {
    languages: {[string]: Object | Function},
    tokenize(code: string, grammar: Object): TokenStream,
  };
}

declare module 'prismjs/components/prism-cpp' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-clike' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-javascript' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-markup' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-markdown' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-c' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-css' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-objectivec' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-sql' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-python' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-rust' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-swift' {
  declare module.exports: {};
}

declare module 'prismjs/components/prism-typescript' {
  declare module.exports: {};
}
