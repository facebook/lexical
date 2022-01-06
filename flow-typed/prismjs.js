'use strict';

type TokenStream = Array<string | Token>;

type Token = {
  type: string,
  alias: string | Array<string>,
  content: string | TokenStream,
};

declare module 'prismjs/components/prism-core' {
  declare module.exports: {
    tokenize(code: string, grammar: Object): TokenStream,
    languages: {[string]: Object | Function},
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
