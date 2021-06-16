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

const license = ` * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.`;

const isWatchMode = argv.watch;
const isProduction = argv.prod;
const isWWW = argv.www;
const isClean = argv.clean;

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
  fs.removeSync(path.resolve('./packages/outline/dist'));
  fs.removeSync(path.resolve('./packages/outline-react/dist'));
}

const wwwMappings = {
  outline: 'Outline',
  'outline/HistoryHelpers': 'OutlineHistoryHelpers',
};

const outlineExtensions = fs
  .readdirSync(path.resolve('./packages/outline/src/extensions'))
  .map((str) => path.basename(str, '.js'))
  .filter((str) => !str.includes('__tests__') && !str.includes('test-utils'));
const outlineExtensionsExternals = outlineExtensions.map((node) => {
  const external = `outline/${node.replace('Outline', '')}`;
  wwwMappings[external] = node;
  return external;
});

const outlineShared = fs
  .readdirSync(path.resolve('./packages/shared/src'))
  .map((str) => path.basename(str, '.js'));

const outlineHelpers = fs
  .readdirSync(path.resolve('./packages/outline/src/helpers'))
  .map((str) => path.basename(str, '.js'))
  .filter((str) => !str.includes('__tests__') && !str.includes('test-utils'));

const outlineReactModules = fs
  .readdirSync(path.resolve('./packages/outline-react/src'))
  .map((str) => path.basename(str, '.js'))
  .filter(
    (str) =>
      !str.includes('__tests__') &&
      !str.includes('shared') &&
      !str.includes('test-utils'),
  );
const outlineReactModuleExternals = outlineReactModules.map((module) => {
  const external = `outline-react/${module}`;
  wwwMappings[external] = module;
  return external;
});

const externals = [
  'outline',
  'Outline',
  'outline-react',
  'outline/HistoryHelpers',
  'Outline/HistoryHelpers',
  'react-dom',
  'react',
  ...outlineExtensionsExternals,
  ...outlineReactModuleExternals,
  ...Object.values(wwwMappings),
];

const errorCodeOpts = {
  errorMapFilePath: 'scripts/error-codes/codes.json',
};

const findAndRecordErrorCodes = extractErrorCodes(errorCodeOpts);

async function build(name, inputFile, outputFile) {
  const inputOptions = {
    input: inputFile,
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
          // We inline both these helpers to improve the bundle size of the outline-react modules
          {
            find: isWWW
              ? 'Outline/SelectionHelpers'
              : 'outline/SelectionHelpers',
            replacement: path.resolve(
              'packages/outline/src/helpers/OutlineSelectionHelpers',
            ),
          },
          {
            find: isWWW ? 'Outline/KeyHelpers' : 'outline/KeyHelpers',
            replacement: path.resolve(
              'packages/outline/src/helpers/OutlineKeyHelpers',
            ),
          },
          {
            find: isWWW ? 'Outline/TextHelpers' : 'outline/TextHelpers',
            replacement: path.resolve(
              'packages/outline/src/helpers/OutlineTextHelpers',
            ),
          },
        ],
      }),
      // Extract error codes from invariant() messages into a file.
      {
        transform(source) {
          findAndRecordErrorCodes(source);
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
    const watcher = rollup.watch({...inputOptions, output: outputOptions});
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

outlineExtensions.forEach((module) => {
  build(
    `Outline Extensions - ${module}`,
    path.resolve(`./packages/outline/src/extensions/${module}.js`),
    path.resolve(`./packages/outline/dist/${getFileName(module)}`),
  );
});

outlineHelpers.forEach((module) => {
  build(
    `Outline Helpers - ${module}`,
    path.resolve(`./packages/outline/src/helpers/${module}.js`),
    path.resolve(`./packages/outline/dist/${getFileName(module)}`),
  );
});

outlineShared.forEach((module) => {
  build(
    `Outline Shared - ${module}`,
    path.resolve(`./packages/shared/src/${module}.js`),
    path.resolve(`./packages/shared/dist/${getFileName(module)}`),
  );
});

build(
  'Outline Core',
  path.resolve('./packages/outline/src/core/index.js'),
  path.resolve(`./packages/outline/dist/${getFileName('Outline')}`),
);

outlineReactModules.forEach((outlineReactModule) => {
  // We don't want to sync these modules, as they're bundled in the other
  // modules already.
  if (
    outlineReactModule === 'OutlineEnv' ||
    outlineReactModule === 'useOutlineHistory' ||
    outlineReactModule === 'useOutlineDragonSupport' ||
    outlineReactModule === 'OutlineReactUtils'
  ) {
    return;
  }
  build(
    `Outline React - ${outlineReactModule}`,
    path.resolve(`./packages/outline-react/src/${outlineReactModule}.js`),
    path.resolve(
      `./packages/outline-react/dist/${getFileName(outlineReactModule)}`,
    ),
  );
});
