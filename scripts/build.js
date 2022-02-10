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
  fs.removeSync(path.resolve('./packages/lexical-helpers/dist'));
  fs.removeSync(path.resolve('./packages/lexical-list/dist'));
  fs.removeSync(path.resolve('./packages/lexical-yjs/dist'));
}

const wwwMappings = {
  lexical: 'Lexical',
  'react-dom': 'ReactDOMComet',
  '@lexical/yjs': 'LexicalYjs',
  '@lexical/list': 'LexicalList',
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

const lexicalHelpers = fs
  .readdirSync(path.resolve('./packages/lexical-helpers/src'))
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
  const external = `@lexical/react/${module}`;
  wwwMappings[external] = module;
  return external;
});

const externals = [
  // Note: do not add stylex here, as we can't export and sync
  // modules that use Stylex to www (the babel plugin on www
  // is different to that of the OSS version).
  'lexical',
  '@lexical/list',
  '@lexical/yjs',
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
    input: inputFile,
    treeshake: 'smallest',
    external(modulePath, src) {
      return externals.includes(modulePath);
    },
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
          // We inline both these helpers to improve the bundle size of the lexical-react modules
          {
            find: '@lexical/helpers/selection',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalSelectionHelpers',
            ),
          },
          {
            find: '@lexical/helpers/nodes',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalNodeHelpers',
            ),
          },
          {
            find: '@lexical/helpers/elements',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalElementHelpers',
            ),
          },
          {
            find: '@lexical/helpers/text',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalTextHelpers',
            ),
          },
          {
            find: '@lexical/helpers/events',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalEventHelpers',
            ),
          },
          {
            find: '@lexical/helpers/file',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalFileHelpers',
            ),
          },
          {
            find: '@lexical/helpers/offsets',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalOffsetHelpers',
            ),
          },
          {
            find: '@lexical/helpers/root',
            replacement: path.resolve(
              'packages/lexical-helpers/src/LexicalRootHelpers',
            ),
          },
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
            {noMinify: !isProd},
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
            delimiters: ['', ''],
            preventAssignment: true,
            __DEV__: isProd ? 'false' : 'true',
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
    name: 'Lexical Core',
    sourcePath: './packages/lexical/src/',
    outputPath: './packages/lexical/dist/',
    modules: [
      {
        sourceFileName: 'index.js',
        outputFileName: 'Lexical',
      },
    ],
  },
  {
    name: 'Lexical List',
    sourcePath: './packages/lexical-list/src/',
    outputPath: './packages/lexical-list/dist/',
    modules: [
      {
        sourceFileName: 'index.js',
        outputFileName: 'LexicalList',
      },
    ],
  },
  {
    name: 'Lexical Core Nodes',
    sourcePath: './packages/lexical/src/nodes/extended/',
    outputPath: './packages/lexical/dist/',
    modules: lexicalNodes.map((module) => ({
      name: module,
      sourceFileName: module,
      outputFileName: module,
    })),
  },
  {
    name: 'Lexical Helpers',
    sourcePath: './packages/lexical-helpers/src/',
    outputPath: './packages/lexical-helpers/dist/',
    modules: lexicalHelpers.map((module) => ({
      name: module,
      sourceFileName: module,
      outputFileName: module,
    })),
  },
  {
    name: 'Lexical Shared',
    sourcePath: './packages/shared/src/',
    outputPath: './packages/shared/dist/',
    modules: lexicalShared.map((module) => ({
      name: module,
      sourceFileName: module,
      outputFileName: module,
    })),
  },
  {
    name: 'Lexical React',
    sourcePath: './packages/lexical-react/src/',
    outputPath: './packages/lexical-react/dist/',
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
        sourceFileName: module,
        outputFileName: module,
      })),
  },
  {
    name: 'Lexical Yjs',
    sourcePath: './packages/lexical-yjs/src/',
    outputPath: './packages/lexical-yjs/dist/',
    modules: [
      {
        sourceFileName: 'index.js',
        outputFileName: 'LexicalYjs',
      },
    ],
  },
];

packages.forEach((pkg) => {
  const {name, sourcePath, outputPath, modules} = pkg;
  modules.forEach((module) => {
    const {sourceFileName, outputFileName} = module;
    const inputFile = path.resolve(path.join(`${sourcePath}${sourceFileName}`));
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
