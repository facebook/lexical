'use strict';

const rollup = require('rollup');
const path = require('path');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const babel = require('@rollup/plugin-babel').default;
const closure = require('./plugins/closure-plugin');

const isWatchMode = argv.watch;
const isProduction = argv.prod;

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
  if (packageFolder === 'outline-example') {
    return;
  }
  const inputOptions = {
    input: path.resolve(`./packages/${packageFolder}/src/index.js`),
    external(id) {
      if (id === 'react' || id === 'react-dom') {
        return true;
      }
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        exclude: '/**/node_modules/**',
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-react'],
        plugins: ['@babel/plugin-transform-flow-strip-types'],
      }),
      isProduction &&
        closure(
          closureOptions
        ),
    ],
  };
  const outputOptions = {
    file: path.resolve(`./packages/${packageFolder}/dist/index.js`),
    format: 'cjs',
    freeze: false,
    interop: false,
    esModule: false,
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
