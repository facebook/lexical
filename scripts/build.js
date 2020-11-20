'use strict';

const rollup = require('rollup');
const path = require('path');
const fs = require('fs-extra');
const argv = require('minimist')(process.argv.slice(2));
const babel = require('@rollup/plugin-babel').default;
const closure = require('./plugins/closure-plugin');
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');

const license = ` * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.`;

const isWatchMode = argv.watch;
const isProduction = argv.prod;
const isWWW = argv.www;
const isClean = argv.clean;

const closureOptions = {
  compilation_level: 'SIMPLE',
  language_in: 'ECMASCRIPT_2018',
  language_out: 'ECMASCRIPT_2018',
  env: 'CUSTOM',
  warning_level: 'QUIET',
  apply_input_source_maps: false,
  use_types_for_optimization: false,
  process_common_js_modules: false,
  rewrite_polyfills: false,
  inject_libraries: false,
};

async function build(packageFolder) {
  const inputFile = path.resolve(`./packages/${packageFolder}/src/index.js`);
  const outputFile = path.resolve(`./packages/${packageFolder}/dist/index.js`);
  if (isClean) {
    fs.removeSync(outputFile);
    return;
  }

  if (
    packageFolder === 'outline-example' ||
    packageFolder === 'plugin-shared'
  ) {
    return;
  }
  const inputOptions = {
    input: inputFile,
    external(id) {
      if (id === 'react' || id === 'react-dom' || id === 'outline') {
        return true;
      }
      // We bundle shared with the the plugin packages
      if (id === 'plugin-shared') {
        return false;
      }
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
      nodeResolve(),
      babel({
        babelHelpers: 'bundled',
        exclude: '/**/node_modules/**',
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-react'],
        plugins: ['@babel/plugin-transform-flow-strip-types'],
      }),
      commonjs(),
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
  };
  if (isWatchMode) {
    const watcher = rollup.watch({...inputOptions, output: outputOptions});
    watcher.on('event', async (event) => {
      switch (event.code) {
        case 'BUNDLE_START':
          console.log(`Building ${packageFolder}...`);
          break;
        case 'BUNDLE_END':
          console.log(`Built ${packageFolder}`);
          break;
        case 'ERROR':
        case 'FATAL':
          console.error(`Build failed for ${packageFolder}:\n\n${event.error}`);
          break;
      }
    });
  } else {
    const result = await rollup.rollup(inputOptions);
    await result.write(outputOptions);
  }
}

fs.readdirSync('./packages').forEach(build);
