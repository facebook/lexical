'use strict';

const restrictedGlobals = require('confusing-browser-globals');

const OFF = 0;
const ERROR = 2;

module.exports = {
  // Prettier must be last so it can override other configs (https://github.com/prettier/eslint-config-prettier#installation)
  extends: ['fbjs', 'plugin:react-hooks/recommended', 'prettier'],

  globals: {
    __DEV__: true,
  },

  overrides: [
    {
      // We apply these settings to the source files that get compiled.
      // They can use all features including JSX (but shouldn't use `var`).
      files: ['packages/*/src/**/*.js', 'packages/*/src/**/*.jsx'],
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

  parser: 'babel-eslint',

  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
    ecmaVersion: 8,
    sourceType: 'script',
  },

  plugins: [
    'sort-keys-fix',
    'jest',
    'no-for-of-loops',
    'no-function-declare-after-return',
    'react',
    'no-only-tests',
    'eslint-plugin-stylex',
  ],

  // Stop ESLint from looking for a configuration file in parent folders
  root: true,
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
    // Prettier forces semicolons in a few places
    'flowtype/object-type-delimiter': OFF,

    'flowtype/sort-keys': ERROR,

    indent: OFF,

    'jsx-quotes': [ERROR, 'prefer-double'],

    'keyword-spacing': [ERROR, {after: true, before: true}],

    // Enforced by Prettier
    // TODO: Prettier doesn't handle long strings or long comments. Not a big
    // deal. But I turned it off because loading the plugin causes some obscure
    // syntax error and it didn't seem worth investigating.
    'max-len': OFF,

    'no-bitwise': OFF,

    'no-console': ERROR,

    'no-debugger': ERROR,

    // Prevent for...of loops because they require a Symbol polyfill.
    // You can disable this rule for code that isn't shipped (e.g. build scripts and tests).
    'no-for-of-loops/no-for-of-loops': ERROR,

    // Prevent function declarations after return statements
    'no-function-declare-after-return/no-function-declare-after-return': ERROR,

    'no-inner-declarations': [ERROR, 'functions'],

    'no-multi-spaces': ERROR,

    'no-only-tests/no-only-tests': ERROR,

    'no-restricted-globals': [ERROR].concat(restrictedGlobals),

    'no-restricted-syntax': [ERROR, 'WithStatement'],

    'no-shadow': ERROR,

    'no-unused-expressions': ERROR,

    'no-unused-vars': [ERROR, {args: 'none'}],

    'no-use-before-define': OFF,

    // Flow fails with with non-string literal keys
    'no-useless-computed-key': OFF,

    'no-useless-concat': OFF,

    // We apply these settings to files that should run on Node.
    // They can't use JSX or ES6 modules, and must be in strict mode.
    // They can, however, use other ES6 features.
    // (Note these rules are overridden later for source files.)
    'no-var': ERROR,

    quotes: [ERROR, 'single', {allowTemplateLiterals: true, avoidEscape: true}],

    // React & JSX
    // Our transforms set this automatically
    'react/jsx-boolean-value': [ERROR, 'always'],

    'react/jsx-no-undef': ERROR,

    // We don't care to do this
    'react/jsx-sort-prop-types': OFF,

    'react/jsx-tag-spacing': ERROR,

    'react/jsx-uses-react': ERROR,

    // We don't care to do this
    'react/jsx-wrap-multilines': [
      ERROR,
      {assignment: false, declaration: false},
    ],

    'react/no-is-mounted': OFF,

    // This isn't useful in our test code
    'react/react-in-jsx-scope': ERROR,

    'react/self-closing-comp': ERROR,

    'sort-keys-fix/sort-keys-fix': ERROR,

    'space-before-blocks': ERROR,

    'space-before-function-paren': OFF,

    strict: ERROR,

    'valid-typeof': [ERROR, {requireStringLiterals: true}],
  },
};
