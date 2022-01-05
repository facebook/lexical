'use strict';

const rollup = require('rollup');
const fs = require('fs-extra');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const babel = require('@rollup/plugin-babel').default;
const closure = require('./plugins/closure-plugin');
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const extractErrorCodes = require('./error-codes/extract-errors');
const alias = require('@rollup/plugin-alias');

const license = ` * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.`;

const isWatchMode = argv.watch;
const isProduction = argv.prod;
const isWWW = argv.www;
const isClean = argv.clean;
const extractCodes = argv.codes;

const closureOptions = {
  assume_function_wrapper: true,
  compilation_level: 'SIMPLE',
  language_in: 'ECMASCRIPT_2019',
  language_out: 'ECMASCRIPT_2019',
  env: 'CUSTOM',
  warning_level: 'QUIET',
  apply_input_source_maps: false,
  use_types_for_optimization: false,
  process_common_js_modules: false,
  rewrite_polyfills: false,
  inject_libraries: false,
};

if (isClean) {
  fs.removeSync(path.resolve('./packages/lexical/dist'));
  fs.removeSync(path.resolve('./packages/lexical-react/dist'));
  fs.removeSync(path.resolve('./packages/lexical-yjs/dist'));
}

const wwwMappings = {
  lexical: 'Lexical',
  'react-dom': 'ReactDOMComet',
  'lexical-yjs': 'LexicalYjs',
};

const lexicalExtensions = fs
  .readdirSync(path.resolve('./packages/lexical/src/extensions'))
  .map((str) => path.basename(str, '.js'))
  .filter((str) => !str.includes('__tests__') && !str.includes('test-utils'));
const lexicalExtensionsExternals = lexicalExtensions.map((node) => {
  const external = `lexical/${node.replace('Lexical', '')}`;
  wwwMappings[external] = node;
  return external;
});

const lexicalShared = fs
  .readdirSync(path.resolve('./packages/shared/src'))
  .map((str) => path.basename(str, '.js'));

const lexicalHelpers = fs
  .readdirSync(path.resolve('./packages/lexical/src/helpers'))
  .map((str) => path.basename(str, '.js'))
  .filter((str) => !str.includes('__tests__') && !str.includes('test-utils'));

const lexicalReactModules = fs
  .readdirSync(path.resolve('./packages/lexical-react/src'))
  .map((str) => path.basename(str, '.js'))
  .filter(
    (str) =>
      !str.includes('__tests__') &&
      !str.includes('shared') &&
      !str.includes('test-utils') &&
      !str.includes('composer'),
  );
const lexicalReactModuleExternals = lexicalReactModules.map((module) => {
  const external = `lexical-react/${module}`;
  wwwMappings[external] = module;
  return external;
});

const externals = [
  // Note: do not add stylex here, as we can't export and sync
  // modules that use Stylex to www (the babel plugin on www
  // is different to that of the OSS version).
  'lexical',
  'Lexical',
  'lexical-yjs',
  'lexical-react',
  'react-dom',
  'ReactDOMComet',
  'react',
  'yjs',
  'y-websocket',
  ...lexicalExtensionsExternals,
  ...lexicalReactModuleExternals,
  ...Object.values(wwwMappings),
];

const errorCodeOpts = {
  errorMapFilePath: 'scripts/error-codes/codes.json',
};

const findAndRecordErrorCodes = extractErrorCodes(errorCodeOpts);

async function build(name, inputFile, outputFile) {
  const inputOptions = {
    input: inputFile,
    treeshake: 'smallest',
    external(modulePath, src) {
      return externals.includes(modulePath);
    },
    onwarn(warning) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        // Ignored
      } else if (typeof warning.code === 'string') {
        // This is a warning coming from Rollup itself.
        // These tend to be important (e.g. clashes in namespaced exports)
        // so we'll fail the build on any of them.
        console.error();
        console.error(warning.message || warning);
        console.error();
        process.exit(1);
      } else {
        // The warning is from one of the plugins.
        // Maybe it's not important, so just print it.
        console.warn(warning.message || warning);
      }
    },
    plugins: [
      alias({
        entries: [
          {find: 'shared', replacement: path.resolve('packages/shared/src')},
          // We inline both these helpers to improve the bundle size of the lexical-react modules
          {
            find: isWWW ? 'Lexical/selection' : 'lexical/selection',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalSelectionHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/nodes' : 'lexical/nodes',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalNodeHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/elements' : 'lexical/elements',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalElementHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/text' : 'lexical/text',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalTextHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/events' : 'lexical/events',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalEventHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/file' : 'lexical/file',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalFileHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/offsets' : 'lexical/offsets',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalOffsetHelpers',
            ),
          },
          {
            find: isWWW ? 'Lexical/root' : 'lexical/root',
            replacement: path.resolve(
              'packages/lexical/src/helpers/LexicalRootHelpers',
            ),
          },
        ],
      }),
      // Extract error codes from invariant() messages into a file.
      {
        transform(source) {
          extractCodes && findAndRecordErrorCodes(source);
          return source;
        },
      },
      nodeResolve(),
      babel({
        babelHelpers: 'bundled',
        exclude: '/**/node_modules/**',
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-react'],
        plugins: [
          '@babel/plugin-transform-flow-strip-types',
          [
            require('./error-codes/transform-error-messages'),
            {noMinify: !isProduction},
          ],
        ],
      }),
      {
        resolveId(importee, importer) {
          if (importee === 'formatProdErrorMessage') {
            return path.resolve(
              './scripts/error-codes/formatProdErrorMessage.js',
            );
          }
        },
      },
      commonjs(),
      replace(
        Object.assign(
          {
            preventAssignment: true,
            __DEV__: isProduction ? 'false' : 'true',
          },
          isWWW && wwwMappings,
        ),
      ),
      isProduction && closure(closureOptions),
      isWWW && {
        renderChunk(source) {
          return `/**
${license}
  *
  * @noflow
  * @nolint
  * @preventMunge
  * @preserve-invariant-messages
  * @generated
  * @preserve-whitespace
  * @fullSyntaxTransform
  */

${source}`;
        },
      },
    ],
  };
  const outputOptions = {
    file: outputFile,
    format: 'cjs',
    freeze: false,
    interop: false,
    esModule: false,
    externalLiveBindings: false,
    exports: 'auto',
  };
  if (isWatchMode) {
    const watcher = rollup.watch({
      ...inputOptions,
      output: outputOptions,
    });
    watcher.on('event', async (event) => {
      switch (event.code) {
        case 'BUNDLE_START':
          console.log(`Building ${name}...`);
          break;
        case 'BUNDLE_END':
          console.log(`Built ${name}`);
          break;
        case 'ERROR':
        case 'FATAL':
          console.error(`Build failed for ${name}:\n\n${event.error}`);
          break;
      }
    });
  } else {
    const result = await rollup.rollup(inputOptions);
    await result.write(outputOptions);
  }
}

function getFileName(fileName) {
  if (isWWW) {
    return `${fileName}.${isProduction ? 'prod' : 'dev'}.js`;
  }
  return `${fileName}.js`;
}

lexicalExtensions.forEach((module) => {
  build(
    `Lexical Extensions - ${module}`,
    path.resolve(`./packages/lexical/src/extensions/${module}.js`),
    path.resolve(`./packages/lexical/dist/${getFileName(module)}`),
  );
});

lexicalHelpers.forEach((module) => {
  build(
    `Lexical Helpers - ${module}`,
    path.resolve(`./packages/lexical/src/helpers/${module}.js`),
    path.resolve(`./packages/lexical/dist/${getFileName(module)}`),
  );
});

lexicalShared.forEach((module) => {
  build(
    `Lexical Shared - ${module}`,
    path.resolve(`./packages/shared/src/${module}.js`),
    path.resolve(`./packages/shared/dist/${getFileName(module)}`),
  );
});

build(
  'Lexical Core',
  path.resolve('./packages/lexical/src/core/index.js'),
  path.resolve(`./packages/lexical/dist/${getFileName('Lexical')}`),
);

lexicalReactModules.forEach((lexicalReactModule) => {
  // We don't want to sync these modules, as they're bundled in the other
  // modules already.
  if (
    lexicalReactModule === 'LexicalEnv' ||
    lexicalReactModule === 'useLexicalDragonSupport' ||
    lexicalReactModule === 'usePlainTextSetup' ||
    lexicalReactModule === 'useRichTextSetup' ||
    lexicalReactModule === 'useYjsCollaboration' ||
    lexicalReactModule === 'LexicalReactUtils'
  ) {
    return;
  }
  build(
    `Lexical React - ${lexicalReactModule}`,
    path.resolve(`./packages/lexical-react/src/${lexicalReactModule}.js`),
    path.resolve(
      `./packages/lexical-react/dist/${getFileName(lexicalReactModule)}`,
    ),
  );
});

build(
  'Lexical Yjs',
  path.resolve('./packages/lexical-yjs/src/index.js'),
  path.resolve(`./packages/lexical-yjs/dist/${getFileName('LexicalYjs')}`),
);
