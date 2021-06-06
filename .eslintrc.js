'use strict';

const restrictedGlobals = require('confusing-browser-globals');

const OFF = 0;
const ERROR = 2;

module.exports = {
  extends: ['fbjs', 'prettier', 'plugin:react-hooks/recommended'],

  // Stop ESLint from looking for a configuration file in parent folders
  root: true,

  plugins: [
    'jest',
    'no-for-of-loops',
    'no-function-declare-after-return',
    'react',
  ],

  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'script',
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  // We're stricter than the default config, mostly. We'll override a few rules
  // and then enable some React specific ones.
  rules: {
    'accessor-pairs': OFF,
    'brace-style': [ERROR, '1tbs'],
    'consistent-return': OFF,
    'dot-location': [ERROR, 'property'],
    // We use console['error']() as a signal to not transform it:
    'dot-notation': [ERROR, {allowPattern: '^(error|warn)$'}],
    'eol-last': ERROR,
    eqeqeq: [ERROR, 'allow-null'],
    indent: OFF,
    'jsx-quotes': [ERROR, 'prefer-double'],
    'keyword-spacing': [ERROR, {after: true, before: true}],
    'no-bitwise': OFF,
    'no-console': OFF,
    'no-inner-declarations': [ERROR, 'functions'],
    'no-multi-spaces': ERROR,
    'no-restricted-globals': [ERROR].concat(restrictedGlobals),
    'no-restricted-syntax': [ERROR, 'WithStatement'],
    'no-shadow': ERROR,
    'no-unused-expressions': ERROR,
    'no-unused-vars': [ERROR, {args: 'none'}],
    'no-use-before-define': OFF,
    'no-useless-concat': OFF,
    quotes: [ERROR, 'single', {avoidEscape: true, allowTemplateLiterals: true}],
    'space-before-blocks': ERROR,
    'space-before-function-paren': OFF,
    'valid-typeof': [ERROR, {requireStringLiterals: true}],
    // Flow fails with with non-string literal keys
    'no-useless-computed-key': OFF,

    // We apply these settings to files that should run on Node.
    // They can't use JSX or ES6 modules, and must be in strict mode.
    // They can, however, use other ES6 features.
    // (Note these rules are overridden later for source files.)
    'no-var': ERROR,
    strict: ERROR,

    // Enforced by Prettier
    // TODO: Prettier doesn't handle long strings or long comments. Not a big
    // deal. But I turned it off because loading the plugin causes some obscure
    // syntax error and it didn't seem worth investigating.
    'max-len': OFF,
    // Prettier forces semicolons in a few places
    'flowtype/object-type-delimiter': OFF,

    // React & JSX
    // Our transforms set this automatically
    'react/jsx-boolean-value': [ERROR, 'always'],
    'react/jsx-no-undef': ERROR,
    // We don't care to do this
    'react/jsx-sort-prop-types': OFF,
    'react/jsx-tag-spacing': ERROR,
    'react/jsx-uses-react': ERROR,
    'react/no-is-mounted': OFF,
    // This isn't useful in our test code
    'react/react-in-jsx-scope': ERROR,
    'react/self-closing-comp': ERROR,
    // We don't care to do this
    'react/jsx-wrap-multilines': [
      ERROR,
      {declaration: false, assignment: false},
    ],

    // Prevent for...of loops because they require a Symbol polyfill.
    // You can disable this rule for code that isn't shipped (e.g. build scripts and tests).
    'no-for-of-loops/no-for-of-loops': ERROR,

    // Prevent function declarations after return statements
    'no-function-declare-after-return/no-function-declare-after-return': ERROR,
  },

  overrides: [
    {
      // We apply these settings to the source files that get compiled.
      // They can use all features including JSX (but shouldn't use `var`).
      files: 'packages/*/src/**/*.js',
      parser: 'babel-eslint',
      parserOptions: {
        ecmaVersion: 8,
        sourceType: 'module',
      },
      rules: {
        'no-var': ERROR,
        'prefer-const': ERROR,
        strict: OFF,
      },
    },
  ],
  globals: {
    __DEV__: true,
  },
};
