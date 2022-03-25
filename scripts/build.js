/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
const isRelease = argv.release;
const isWWW = argv.www;
const isClean = argv.clean;
const extractCodes = argv.codes;

const closureOptions = {
  apply_input_source_maps: false,
  assume_function_wrapper: true,
  compilation_level: 'SIMPLE',
  env: 'CUSTOM',
  inject_libraries: false,
  language_in: 'ECMASCRIPT_2019',
  language_out: 'ECMASCRIPT_2019',
  process_common_js_modules: false,
  rewrite_polyfills: false,
  use_types_for_optimization: false,
  warning_level: 'QUIET',
};

if (isClean) {
  fs.removeSync(path.resolve('./packages/lexical/dist'));
  fs.removeSync(path.resolve('./packages/lexical-react/dist'));
  fs.removeSync(path.resolve('./packages/lexical-list/dist'));
  fs.removeSync(path.resolve('./packages/lexical-table/dist'));
  fs.removeSync(path.resolve('./packages/lexical-file/dist'));
  fs.removeSync(path.resolve('./packages/lexical-clipboard/dist'));
  fs.removeSync(path.resolve('./packages/lexical-hashtag/dist'));
  fs.removeSync(path.resolve('./packages/lexical-selection/dist'));
  fs.removeSync(path.resolve('./packages/lexical-text/dist'));
  fs.removeSync(path.resolve('./packages/lexical-offset/dist'));
  fs.removeSync(path.resolve('./packages/lexical-utils/dist'));
  fs.removeSync(path.resolve('./packages/lexical-code/dist'));
  fs.removeSync(path.resolve('./packages/lexical-dragon/dist'));
  fs.removeSync(path.resolve('./packages/lexical-plain-text/dist'));
  fs.removeSync(path.resolve('./packages/lexical-rich-text/dist'));
  fs.removeSync(path.resolve('./packages/lexical-yjs/dist'));
}

const wwwMappings = {
  '@lexical/clipboard': 'LexicalClipboard',
  '@lexical/code': 'LexicalCode',
  '@lexical/dragon': 'LexicalDragon',
  '@lexical/file': 'LexicalFile',
  '@lexical/hashtag': 'LexicalHashtag',
  '@lexical/list': 'LexicalList',
  '@lexical/offset': 'LexicalOffset',
  '@lexical/plain-text': 'LexicalPlainText',
  '@lexical/rich-text': 'LexicalRichText',
  '@lexical/selection': 'LexicalSelection',
  '@lexical/table': 'LexicalTable',
  '@lexical/text': 'LexicalText',
  '@lexical/utils': 'LexicalUtils',
  '@lexical/yjs': 'LexicalYjs',
  lexical: 'Lexical',
  'react-dom': 'ReactDOMComet',
};

const lexicalNodes = fs
  .readdirSync(path.resolve('./packages/lexical/src/nodes/extended'))
  .map((str) => path.basename(str, '.js'))
  .filter((str) => !str.includes('__tests__') && !str.includes('test-utils'));
const lexicalNodesExternals = lexicalNodes.map((node) => {
  const external = `lexical/${node.replace('Lexical', '')}`;
  wwwMappings[external] = node;
  return external;
});

const lexicalShared = fs
  .readdirSync(path.resolve('./packages/shared/src'))
  .map((str) => path.basename(str, '.js'));

const lexicalReactModules = fs
  .readdirSync(path.resolve('./packages/lexical-react/src'))
  .map((str) => path.basename(path.basename(str, '.js'), '.jsx'))
  .filter(
    (str) =>
      !str.includes('__tests__') &&
      !str.includes('shared') &&
      !str.includes('test-utils'),
  );

const lexicalReactModuleExternals = lexicalReactModules.map((module) => {
  const external = `@lexical/react/${module}`;
  wwwMappings[external] = module;
  return external;
});

const externals = [
  'lexical',
  '@lexical/list',
  '@lexical/table',
  '@lexical/file',
  '@lexical/clipboard',
  '@lexical/hashtag',
  '@lexical/selection',
  '@lexical/text',
  '@lexical/offset',
  '@lexical/utils',
  '@lexical/code',
  '@lexical/yjs',
  '@lexical/plain-text',
  '@lexical/rich-text',
  '@lexical/dragon',
  'react-dom',
  'react',
  'yjs',
  'y-websocket',
  ...lexicalNodesExternals,
  ...lexicalReactModuleExternals,
  ...Object.values(wwwMappings),
];

const errorCodeOpts = {
  errorMapFilePath: 'scripts/error-codes/codes.json',
};

const findAndRecordErrorCodes = extractErrorCodes(errorCodeOpts);

const strictWWWMappings = {};

// Add quotes around mappings to make them more strict.
Object.keys(wwwMappings).forEach((mapping) => {
  strictWWWMappings[`'${mapping}'`] = `'${wwwMappings[mapping]}'`;
});

async function build(name, inputFile, outputFile, isProd) {
  const inputOptions = {
    external(modulePath, src) {
      return externals.includes(modulePath);
    },
    input: inputFile,
    onwarn(warning) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        // Ignored
      } else if (warning.code === 'UNUSED_EXTERNAL_IMPORT') {
        // Important, but not enough to stop the build
        console.error();
        console.error(warning.message || warning);
        console.error();
      } else if (typeof warning.code === 'string') {
        console.error(warning);
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
        ],
      }),
      // Extract error codes from invariant() messages into a file.
      {
        transform(source) {
          // eslint-disable-next-line no-unused-expressions
          extractCodes && findAndRecordErrorCodes(source);
          return source;
        },
      },
      nodeResolve({
        extensions: ['.js', '.jsx'],
      }),
      babel({
        babelHelpers: 'bundled',
        babelrc: false,
        configFile: false,
        exclude: '/**/node_modules/**',
        plugins: [
          '@babel/plugin-transform-flow-strip-types',
          [
            require('./error-codes/transform-error-messages'),
            {noMinify: !isProd},
          ],
        ],
        presets: ['@babel/preset-react'],
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
            __DEV__: isProd ? 'false' : 'true',
            delimiters: ['', ''],
            preventAssignment: true,
          },
          isWWW && strictWWWMappings,
        ),
      ),
      isProd && closure(closureOptions),
      {
        renderChunk(source) {
          return `${getComment()}
${source}`;
        },
      },
    ],
    treeshake: 'smallest',
  };
  const outputOptions = {
    esModule: false,
    exports: 'auto',
    externalLiveBindings: false,
    file: outputFile,
    format: 'cjs',
    freeze: false,
    interop: false,
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

function getComment() {
  const lines = ['/**', license];
  if (isWWW) {
    lines.push(
      '*',
      '* @noflow',
      '* @nolint',
      '* @preventMunge',
      '* @preserve-invariant-messages',
      '* @generated',
      '* @preserve-whitespace',
      '* @fullSyntaxTransform',
    );
  }
  lines.push(' */');
  return lines.join('\n');
}

function getFileName(fileName, isProd) {
  if (isWWW || isRelease) {
    return `${fileName}.${isProd ? 'prod' : 'dev'}.js`;
  }
  return `${fileName}.js`;
}

const packages = [
  {
    modules: [
      {
        outputFileName: 'Lexical',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Core',
    outputPath: './packages/lexical/dist/',
    sourcePath: './packages/lexical/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalList',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical List',
    outputPath: './packages/lexical-list/dist/',
    sourcePath: './packages/lexical-list/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalTable',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Table',
    outputPath: './packages/lexical-table/dist/',
    sourcePath: './packages/lexical-table/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalFile',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical File',
    outputPath: './packages/lexical-file/dist/',
    sourcePath: './packages/lexical-file/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalClipboard',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical File',
    outputPath: './packages/lexical-clipboard/dist/',
    sourcePath: './packages/lexical-clipboard/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalHashtag',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Hashtag',
    outputPath: './packages/lexical-hashtag/dist/',
    sourcePath: './packages/lexical-hashtag/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalSelection',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Selection',
    outputPath: './packages/lexical-selection/dist/',
    sourcePath: './packages/lexical-selection/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalText',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Text',
    outputPath: './packages/lexical-text/dist/',
    sourcePath: './packages/lexical-text/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalOffset',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Offset',
    outputPath: './packages/lexical-offset/dist/',
    sourcePath: './packages/lexical-offset/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalUtils',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Utils',
    outputPath: './packages/lexical-utils/dist/',
    sourcePath: './packages/lexical-utils/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalCode',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Code',
    outputPath: './packages/lexical-code/dist/',
    sourcePath: './packages/lexical-code/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalDragon',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Dragon',
    outputPath: './packages/lexical-dragon/dist/',
    sourcePath: './packages/lexical-dragon/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalPlainText',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Plain Text',
    outputPath: './packages/lexical-plain-text/dist/',
    sourcePath: './packages/lexical-plain-text/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalRichText',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Rich Text',
    outputPath: './packages/lexical-rich-text/dist/',
    sourcePath: './packages/lexical-rich-text/src/',
  },
  {
    modules: lexicalNodes.map((module) => ({
      name: module,
      outputFileName: module,
      sourceFileName: module,
    })),
    name: 'Lexical Core Nodes',
    outputPath: './packages/lexical/dist/',
    sourcePath: './packages/lexical/src/nodes/extended/',
  },
  {
    modules: lexicalShared.map((module) => ({
      name: module,
      outputFileName: module,
      sourceFileName: module,
    })),
    name: 'Lexical Shared',
    outputPath: './packages/shared/dist/',
    sourcePath: './packages/shared/src/',
  },
  {
    modules: lexicalReactModules
      .filter((module) => {
        // We don't want to sync these modules, as they're bundled in the other
        // modules already.
        const ignoredModules = [
          'useLexicalDragonSupport',
          'usePlainTextSetup',
          'useRichTextSetup',
          'useYjsCollaboration',
        ];
        return !ignoredModules.includes(module);
      })
      .map((module) => ({
        name: module,
        outputFileName: module,
        sourceFileName: module,
      })),
    name: 'Lexical React',
    outputPath: './packages/lexical-react/dist/',
    sourcePath: './packages/lexical-react/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalYjs',
        sourceFileName: 'index.js',
      },
    ],
    name: 'Lexical Yjs',
    outputPath: './packages/lexical-yjs/dist/',
    sourcePath: './packages/lexical-yjs/src/',
  },
];

packages.forEach((pkg) => {
  const {name, sourcePath, outputPath, modules} = pkg;
  modules.forEach((module) => {
    const {sourceFileName, outputFileName} = module;
    let inputFile = path.resolve(path.join(`${sourcePath}${sourceFileName}`));
    build(
      `${name}${module.name ? '-' + module.name : ''}`,
      inputFile,
      path.resolve(
        path.join(`${outputPath}${getFileName(outputFileName, isProduction)}`),
      ),
      isProduction,
    );
    if (isRelease) {
      build(
        name,
        inputFile,
        path.resolve(
          path.join(`${outputPath}${getFileName(outputFileName, false)}`),
        ),
        false,
      );
      buildForkModule(outputPath, outputFileName);
    }
  });
});

function buildForkModule(outputPath, outputFileName) {
  const lines = [
    getComment(),
    `'use strict'`,
    `const ${outputFileName} = process.env.NODE_ENV === 'development' ? require('./${outputFileName}.dev.js') : require('./${outputFileName}.prod.js')`,
    `module.exports = ${outputFileName};`,
  ];
  const fileContent = lines.join('\n');
  fs.outputFileSync(
    path.resolve(path.join(`${outputPath}${outputFileName}.js`)),
    fileContent,
  );
}
