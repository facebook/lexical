/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const rollup = require('rollup');
const fs = require('fs-extra');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const babel = require('@rollup/plugin-babel').default;
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const json = require('@rollup/plugin-json');
const extractErrorCodes = require('./error-codes/extract-errors');
const alias = require('@rollup/plugin-alias');
const compiler = require('@ampproject/rollup-plugin-closure-compiler');
const terser = require('@rollup/plugin-terser');
const {exec} = require('child-process-promise');

const license = ` * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.`;

const isProduction = argv.prod;
const isRelease = argv.release;
const isWWW = argv.www;
const extractCodes = argv.codes;

const closureOptions = {
  apply_input_source_maps: false,
  assume_function_wrapper: true,
  compilation_level: 'SIMPLE',
  inject_libraries: false,
  language_in: 'ECMASCRIPT_2019',
  language_out: 'ECMASCRIPT_2019',
  process_common_js_modules: false,
  rewrite_polyfills: false,
  use_types_for_optimization: false,
  warning_level: 'QUIET',
};

const wwwMappings = {
  '@lexical/clipboard': 'LexicalClipboard',
  '@lexical/code': 'LexicalCode',
  '@lexical/dragon': 'LexicalDragon',
  '@lexical/file': 'LexicalFile',
  '@lexical/hashtag': 'LexicalHashtag',
  '@lexical/headless': 'LexicalHeadless',
  '@lexical/history': 'LexicalHistory',
  '@lexical/html': 'LexicalHtml',
  '@lexical/link': 'LexicalLink',
  '@lexical/list': 'LexicalList',
  '@lexical/mark': 'LexicalMark',
  '@lexical/markdown': 'LexicalMarkdown',
  '@lexical/offset': 'LexicalOffset',
  '@lexical/overflow': 'LexicalOverflow',
  '@lexical/plain-text': 'LexicalPlainText',
  '@lexical/rich-text': 'LexicalRichText',
  '@lexical/selection': 'LexicalSelection',
  '@lexical/table': 'LexicalTable',
  '@lexical/text': 'LexicalText',
  '@lexical/utils': 'LexicalUtils',
  '@lexical/yjs': 'LexicalYjs',
  lexical: 'Lexical',
  'prismjs/components/prism-core': 'prismjs',
  'react-dom': 'ReactDOMComet',
};

const lexicalReactModules = fs
  .readdirSync(path.resolve('./packages/lexical-react/src'))
  .filter(
    (str) =>
      !str.includes('__tests__') &&
      !str.includes('shared') &&
      !str.includes('test-utils'),
  );

const lexicalReactModuleExternals = lexicalReactModules.map((module) => {
  const basename = path.basename(path.basename(module, '.ts'), '.tsx');
  const external = `@lexical/react/${basename}`;
  wwwMappings[external] = basename;
  return external;
});

const externals = [
  'lexical',
  'prismjs/components/prism-core',
  'prismjs/components/prism-clike',
  'prismjs/components/prism-javascript',
  'prismjs/components/prism-markup',
  'prismjs/components/prism-markdown',
  'prismjs/components/prism-c',
  'prismjs/components/prism-css',
  'prismjs/components/prism-objectivec',
  'prismjs/components/prism-sql',
  'prismjs/components/prism-python',
  'prismjs/components/prism-rust',
  'prismjs/components/prism-swift',
  'prismjs/components/prism-typescript',
  'prismjs/components/prism-java',
  'prismjs/components/prism-cpp',
  '@lexical/list',
  '@lexical/table',
  '@lexical/file',
  '@lexical/clipboard',
  '@lexical/hashtag',
  '@lexical/headless',
  '@lexical/html',
  '@lexical/history',
  '@lexical/selection',
  '@lexical/text',
  '@lexical/offset',
  '@lexical/utils',
  '@lexical/code',
  '@lexical/yjs',
  '@lexical/plain-text',
  '@lexical/rich-text',
  '@lexical/mark',
  '@lexical/dragon',
  '@lexical/overflow',
  '@lexical/link',
  '@lexical/markdown',
  'react-dom',
  'react',
  'yjs',
  'y-websocket',
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

function getExtension(format) {
  return `.${format === 'esm' ? 'm' : ''}js`;
}

async function build(name, inputFile, outputPath, outputFile, isProd, format) {
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
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
      } else if (
        warning.code === 'SOURCEMAP_ERROR' &&
        warning.message.endsWith(`Can't resolve original location of error.`)
      ) {
        // Ignored
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
        extensions,
      }),
      babel({
        babelHelpers: 'bundled',
        babelrc: false,
        configFile: false,
        exclude: '/**/node_modules/**',
        extensions,
        plugins: [
          [
            require('./error-codes/transform-error-messages'),
            {noMinify: !isProd},
          ],
          '@babel/plugin-transform-optional-catch-binding',
        ],
        presets: [
          [
            '@babel/preset-typescript',
            {
              tsconfig: path.resolve('./tsconfig.build.json'),
            },
          ],
          '@babel/preset-react',
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
      json(),
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
      // terser is used for esm builds because
      // @ampproject/rollup-plugin-closure-compiler doesn't compile
      // `export default function X()` correctly
      isProd &&
        (format === 'esm'
          ? terser({ecma: 2019, module: true})
          : compiler(closureOptions)),
      {
        renderChunk(source) {
          // Assets pipeline might use "export" word in the beginning of the line
          // as a dependency, avoiding it with empty comment in front
          const patchedSource = isWWW
            ? source.replace(/^(export(?!s))/gm, '/**/$1')
            : source;
          return `${getComment()}\n${patchedSource}`;
        },
      },
    ],
    // This ensures PrismJS imports get included in the bundle
    treeshake: isWWW || name !== 'Lexical Code' ? 'smallest' : undefined,
  };
  const outputOptions = {
    esModule: false,
    exports: 'auto',
    externalLiveBindings: false,
    file: outputFile,
    format, // change between es and cjs modules
    freeze: false,
    interop: format === 'esm' ? 'esModule' : false,
  };
  const result = await rollup.rollup(inputOptions);
  const {output} = await result.write(outputOptions);
  return output[0].exports;
}

function getComment() {
  const lines = ['/**', license];
  if (isWWW) {
    lines.push(
      '*',
      '* @fullSyntaxTransform',
      '* @generated',
      '* @noflow',
      '* @nolint',
      '* @oncall lexical_web_text_editor',
      '* @preserve-invariant-messages',
      '* @preserve-whitespace',
      '* @preventMunge',
    );
  }
  lines.push(' */');
  return lines.join('\n');
}

function getFileName(fileName, isProd, format) {
  const extension = getExtension(format);
  if (isWWW || isRelease) {
    return `${fileName}.${isProd ? 'prod' : 'dev'}${extension}`;
  }
  return `${fileName}${extension}`;
}

const packages = [
  {
    modules: [
      {
        outputFileName: 'Lexical',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Core',
    outputPath: './packages/lexical/dist/',
    packageName: 'lexical',
    sourcePath: './packages/lexical/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalList',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical List',
    outputPath: './packages/lexical-list/dist/',
    packageName: 'lexical-list',
    sourcePath: './packages/lexical-list/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalTable',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Table',
    outputPath: './packages/lexical-table/dist/',
    packageName: 'lexical-table',
    sourcePath: './packages/lexical-table/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalFile',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical File',
    outputPath: './packages/lexical-file/dist/',
    packageName: 'lexical-file',
    sourcePath: './packages/lexical-file/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalClipboard',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical File',
    outputPath: './packages/lexical-clipboard/dist/',
    packageName: 'lexical-clipboard',
    sourcePath: './packages/lexical-clipboard/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalHashtag',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Hashtag',
    outputPath: './packages/lexical-hashtag/dist/',
    packageName: 'lexical-hashtag',
    sourcePath: './packages/lexical-hashtag/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalHistory',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical History',
    outputPath: './packages/lexical-history/dist/',
    packageName: 'lexical-history',
    sourcePath: './packages/lexical-history/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalSelection',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Selection',
    outputPath: './packages/lexical-selection/dist/',
    packageName: 'lexical-selection',
    sourcePath: './packages/lexical-selection/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalText',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Text',
    outputPath: './packages/lexical-text/dist/',
    packageName: 'lexical-text',
    sourcePath: './packages/lexical-text/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalOffset',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Offset',
    outputPath: './packages/lexical-offset/dist/',
    packageName: 'lexical-offset',
    sourcePath: './packages/lexical-offset/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalUtils',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Utils',
    outputPath: './packages/lexical-utils/dist/',
    packageName: 'lexical-utils',
    sourcePath: './packages/lexical-utils/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalCode',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Code',
    outputPath: './packages/lexical-code/dist/',
    packageName: 'lexical-code',
    sourcePath: './packages/lexical-code/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalDragon',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Dragon',
    outputPath: './packages/lexical-dragon/dist/',
    packageName: 'lexical-dragon',
    sourcePath: './packages/lexical-dragon/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalLink',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Link',
    outputPath: './packages/lexical-link/dist/',
    packageName: 'lexical-link',
    sourcePath: './packages/lexical-link/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalOverflow',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Overflow',
    outputPath: './packages/lexical-overflow/dist/',
    packageName: 'lexical-overflow',
    sourcePath: './packages/lexical-overflow/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalPlainText',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Plain Text',
    outputPath: './packages/lexical-plain-text/dist/',
    packageName: 'lexical-plain-text',
    sourcePath: './packages/lexical-plain-text/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalRichText',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Rich Text',
    outputPath: './packages/lexical-rich-text/dist/',
    packageName: 'lexical-rich-text',
    sourcePath: './packages/lexical-rich-text/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalMarkdown',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Markdown',
    outputPath: './packages/lexical-markdown/dist/',
    packageName: 'lexical-markdown',
    sourcePath: './packages/lexical-markdown/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalHeadless',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Headless',
    outputPath: './packages/lexical-headless/dist/',
    packageName: 'lexical-headless',
    sourcePath: './packages/lexical-headless/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalHtml',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical HTML',
    outputPath: './packages/lexical-html/dist/',
    packageName: 'lexical-html',
    sourcePath: './packages/lexical-html/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalMark',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Mark',
    outputPath: './packages/lexical-mark/dist/',
    packageName: 'lexical-mark',
    sourcePath: './packages/lexical-mark/src/',
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
      .map((module) => {
        const basename = path.basename(path.basename(module, '.ts'), '.tsx');
        return {
          name: basename,
          outputFileName: basename,
          sourceFileName: module,
        };
      }),
    name: 'Lexical React',
    outputPath: './packages/lexical-react/dist/',
    packageName: 'lexical-react',
    sourcePath: './packages/lexical-react/src/',
  },
  {
    modules: [
      {
        outputFileName: 'LexicalYjs',
        sourceFileName: 'index.ts',
      },
    ],
    name: 'Lexical Yjs',
    outputPath: './packages/lexical-yjs/dist/',
    packageName: 'lexical-yjs',
    sourcePath: './packages/lexical-yjs/src/',
  },
];

async function buildTSDeclarationFiles(packageName, outputPath) {
  await exec('tsc -p ./tsconfig.build.json');
}

async function moveTSDeclarationFilesIntoDist(packageName, outputPath) {
  await fs.copy(`./.ts-temp/${packageName}/src`, outputPath);
}

function buildForkModule(outputPath, outputFileName, format, exports) {
  const lines = [getComment()];
  const extension = getExtension(format);
  const devFileName = `./${outputFileName}.dev${extension}`;
  const prodFileName = `./${outputFileName}.prod${extension}`;
  if (format === 'esm') {
    lines.push(
      `import * as modDev from '${devFileName}';`,
      `import * as modProd from '${prodFileName}';`,
      `const mod = process.env.NODE_ENV === 'development' ? modDev : modProd;`,
    );
    for (const name of exports) {
      lines.push(
        name === 'default'
          ? `export default mod.default;`
          : `export const ${name} = mod.${name};`,
      );
    }
  } else {
    lines.push(
      `'use strict'`,
      `const ${outputFileName} = process.env.NODE_ENV === 'development' ? require('${devFileName}') : require('${prodFileName}');`,
      `module.exports = ${outputFileName};`,
    );
  }
  const fileContent = lines.join('\n');
  fs.outputFileSync(
    path.resolve(path.join(`${outputPath}${outputFileName}${extension}`)),
    fileContent,
  );
}

async function buildAll() {
  if (!isWWW && (isRelease || isProduction)) {
    await buildTSDeclarationFiles();
  }

  for (const pkg of packages) {
    const {name, sourcePath, outputPath, packageName, modules} = pkg;

    for (const module of modules) {
      for (const format of ['cjs', 'esm']) {
        if (isWWW && format === 'esm') {
          break;
        }

        const {sourceFileName, outputFileName} = module;
        let inputFile = path.resolve(
          path.join(`${sourcePath}${sourceFileName}`),
        );

        await build(
          `${name}${module.name ? '-' + module.name : ''}`,
          inputFile,
          outputPath,
          path.resolve(
            path.join(
              `${outputPath}${getFileName(
                outputFileName,
                isProduction,
                format,
              )}`,
            ),
          ),
          isProduction,
          format,
        );

        if (isRelease) {
          const exports = await build(
            name,
            inputFile,
            outputPath,
            path.resolve(
              path.join(
                `${outputPath}${getFileName(outputFileName, false, format)}`,
              ),
            ),
            false,
            format,
          );
          buildForkModule(outputPath, outputFileName, format, exports);
        }
      }
    }

    if (!isWWW && (isRelease || isProduction)) {
      await moveTSDeclarationFilesIntoDist(packageName, outputPath);
    }
  }
}

buildAll();
