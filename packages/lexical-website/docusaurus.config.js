/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';
// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const {github: lightCodeTheme, dracula: darkCodeTheme} =
  require('prism-react-renderer').themes;
const slugifyPlugin = require('./src/plugins/lexical-remark-slugify-anchors');
const {packagesManager} = process.env.FB_INTERNAL
  ? {}
  : require('../../scripts/shared/packagesManager');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Build webpack resolve.alias entries that map each lexical package's module
 * name to the corresponding pre-built dist file.
 *
 * Requires `pnpm run build` to have been run first (dist/ files must exist).
 *
 * @returns {Record<string, string>}
 */
function buildLexicalWebpackAliases() {
  if (process.env.FB_INTERNAL) {
    return {};
  }
  /** @type {Record<string, string>} */
  const aliases = {};

  for (const pkg of packagesManager.getPublicPackages()) {
    for (const [
      name,
      moduleExports,
    ] of pkg.getNormalizedNpmModuleExportEntries()) {
      const candidates = [
        moduleExports.import.development,
        moduleExports.import.default,
        moduleExports.require.development,
        moduleExports.require.default,
      ].flatMap((fn) => {
        if (!fn) {
          return [];
        }
        const rel = fn.replace(/^\.\//, '');
        return [pkg.resolve('dist', rel), pkg.resolve(rel)];
      });
      const resolved = candidates.find((f) => fs.existsSync(f));
      if (!resolved) {
        throw new Error(
          `Missing dist file for ${name}. Run \`pnpm run build\` first.\n` +
            `Tried: ${candidates.join(', ')}`,
        );
      }
      aliases[`${name}$`] = resolved;
    }
  }

  return aliases;
}

const TITLE = 'Lexical';
const GITHUB_REPO_URL = 'https://github.com/facebook/lexical'; // TODO: Update when repo name updated
const DISCORD_URL = 'https://discord.gg/KmG4wQnnD9';

function sourceLinkOptions() {
  const sourceLinkTemplate = `${GITHUB_REPO_URL}/tree/{gitRevision}/{path}#L{line}`;
  return {
    disableGit: true,
    gitRevision: 'main',
    sourceLinkTemplate,
  };
}

/**
 * @typedef {import('@docusaurus/plugin-content-docs').PluginOptions['sidebarItemsGenerator']} SidebarItemsGenerator
 * @typedef {Awaited<ReturnType<SidebarItemsGenerator>>[number]} NormalizedSidebarItem
 */
/** @type Record<string, string | undefined> */
const docLabels = {
  'api/index': 'Readme',
  'api/modules': 'Table of Contents',
};

/** @param {string} lowercaseLabel */
function categoryOrder(lowercaseLabel) {
  switch (lowercaseLabel) {
    case 'Modules':
      return 0;
    case 'Classes':
      return 1;
    case 'Interfaces':
      return 2;
    default:
      return Infinity;
  }
}

/**
 * @param {string} label
 */
function capitalizeLabel(label) {
  // modules, classes, interfaces -> Modules, Classes, Interfaces
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * @param {NormalizedSidebarItem} a
 * @param {NormalizedSidebarItem} b
 */
function sidebarSort(a, b) {
  // Categories always come last and have their own defined sort order
  // Otherwise leave the sort as-is
  if (a.type === 'category' && b.type === 'category') {
    return categoryOrder(a.label) - categoryOrder(b.label);
  } else if (a.type === 'category') {
    return 1;
  } else if (b.type === 'category') {
    return -1;
  } else {
    return 0;
  }
}

/**
 * Map an 'api/modules/...' id back to the original module name without
 * loading the markdown and parsing the frontmatter.
 *
 * @param {string} id
 */
function idToModuleName(id) {
  return id
    .replace(/^api\/modules\//i, '')
    .replace(/^lexical_react_/, '@lexical/react/')
    .replace(/^lexical_/, '@lexical/')
    .replace(/_/g, '-');
}

/**
 * Map an 'api/{category}/{fileId}.ClassName' to the class or interface name.
 * These are already capitalized and always preceded by a '.'.
 *
 * @param {string} id
 */
function classOrInterfaceIdToLabel(id) {
  return id.replace(/^[^.]+./, '');
}

/**
 * @type {SidebarItemsGenerator}
 */
const sidebarItemsGenerator = async ({
  defaultSidebarItemsGenerator,
  ...args
}) => {
  const items = await defaultSidebarItemsGenerator(args);
  if (args.item.dirName === 'api') {
    return items
      .map((sidebarItem) => {
        if (sidebarItem.type === 'doc' && sidebarItem.id in docLabels) {
          return {...sidebarItem, label: docLabels[sidebarItem.id]};
        } else if (sidebarItem.type !== 'category') {
          return sidebarItem;
        }
        /** @type {NormalizedSidebarItem[]} */
        const groupedItems = [];
        for (const item of sidebarItem.items) {
          if (item.type === 'doc' && item.id.match(/^api\/modules\//i)) {
            // autoConfiguration is disabled because the frontmatter
            // sidebar_label otherwise takes precedence over anything we do
            // here, and the default labels come from the page titles which
            // are parsed at a later stage of the pipeline.
            const label = idToModuleName(item.id);
            const lastItem = groupedItems.at(-1);
            if (
              lastItem &&
              lastItem.type === 'category' &&
              lastItem.label === label
            ) {
              lastItem.link = {
                id: item.id,
                type: 'doc',
              };
              continue;
            }
            const m = /^(@lexical\/[^/]+)\/(.*)$/.exec(label);
            if (m) {
              const groupedItem = {...item, label: m[2]};
              if (
                (lastItem && lastItem.type === 'category') ||
                lastItem.label === m[1]
              ) {
                lastItem.items.push(groupedItem);
              } else {
                groupedItems.push({
                  items: [groupedItem],
                  label: m[1],
                  type: 'category',
                });
              }
              continue;
            }
            groupedItems.push({...item, label});
          } else if (item.type === 'doc') {
            groupedItems.push({
              ...item,
              label: classOrInterfaceIdToLabel(item.id),
            });
          } else if (item.type === 'category') {
            groupedItems.push({
              ...item,
              label: idToModuleName(item.label),
            });
          } else {
            groupedItems.push(item);
          }
        }
        return {
          ...sidebarItem,
          items: groupedItems,
          label: capitalizeLabel(sidebarItem.label),
        };
      })
      .sort(sidebarSort);
  }
  return items;
};

/** @type {import('@docusaurus/types').ParseFrontMatter} */
const parseFrontMatter = async (params) => {
  const result = await params.defaultParseFrontMatter(params);
  if (params.filePath.endsWith('/docs/api/modules.md')) {
    Object.assign(result.frontMatter, {
      custom_edit_url: null,
      hide_table_of_contents: true,
      id: 'modules',
      title: '@lexical/monorepo',
    });
  } else if (params.filePath.endsWith('/docs/api/index.md')) {
    Object.assign(result.frontMatter, {
      custom_edit_url: null,
      id: 'index',
      title: '@lexical/monorepo',
    });
  }
  return result;
};

/** @type {Partial<import('docusaurus-plugin-typedoc/dist/types').PluginOptions>} */
const docusaurusPluginTypedocConfig = {
  ...sourceLinkOptions(),
  customAnchorsFormat: 'curlyBrace',
  entryPoints: process.env.FB_INTERNAL
    ? []
    : packagesManager
        .getPublicPackages()
        .flatMap((pkg) =>
          pkg
            .getExportedNpmModuleEntries()
            .map((entry) =>
              path.relative(
                __dirname,
                pkg.resolve('src', entry.sourceFileName),
              ),
            ),
        ),
  excludeInternal: true,
  plugin: [
    'typedoc-plugin-no-inherit',
    require.resolve('./src/plugins/lexical-typedoc-plugin-module-name'),
    require.resolve('./src/plugins/lexical-typedoc-plugin-legacy-router'),
    'typedoc-plugin-rename-defaults',
  ],
  router: 'legacy',
  sidebar: {pretty: true},
  skipErrorChecking: true,
  tsconfig: '../../tsconfig.build.json',
  useCustomAnchors: true,
  watch: process.env.TYPEDOC_WATCH === 'true',
};

const GIT_COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || 'main';
const GIT_COMMIT_REF = process.env.VERCEL_GIT_COMMIT_REF || 'main';
const GIT_REPO_OWNER = process.env.VERCEL_GIT_REPO_OWNER || 'facebook';
const GIT_REPO_SLUG = process.env.VERCEL_GIT_REPO_SLUG || 'lexical';
const STACKBLITZ_PREFIX = `https://stackblitz.com/github/${GIT_REPO_OWNER}/${GIT_REPO_SLUG}/tree/${
  // Vercel does not set owner and slug correctly for fork PRs so we can't trust the ref by default
  (GIT_COMMIT_REF === 'main' && !process.env.VERCEL_GIT_PULL_REQUEST_ID) ||
  GIT_COMMIT_REF.endsWith('__release')
    ? GIT_COMMIT_REF
    : GIT_COMMIT_SHA
}/`;

/** @type {import('@docusaurus/types').Config} */
const config = {
  baseUrl: '/',

  customFields: {
    GIT_COMMIT_REF,
    GIT_REPO_OWNER,
    GIT_REPO_SLUG,
    STACKBLITZ_PREFIX,
  },

  favicon: 'img/favicon.ico',

  future: {
    // See https://docusaurus.io/blog/releases/3.8
    faster: true,
    v4: {
      removeLegacyPostBuildHeadAttribute: true, // required
    },
  },

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
    mermaid: true,
    parseFrontMatter,
    preprocessor: ({fileContent}) =>
      fileContent.replaceAll(
        'https://stackblitz.com/github/facebook/lexical/tree/main/',
        STACKBLITZ_PREFIX,
      ),
  },

  onBrokenAnchors: 'throw',
  // These are false positives when linking from API docs
  onBrokenLinks: 'ignore',
  organizationName: 'facebook',
  plugins: [
    process.env.FB_INTERNAL
      ? null
      : [
          './plugins/package-docs',
          /** @type {import('./plugins/package-docs').PackageDocsPluginOptions} */
          {
            baseDir: path.resolve(__dirname, '..'),
            editUrl: `${GITHUB_REPO_URL}/tree/main/packages/`,
            packageFrontMatter: {
              lexical: [
                'sidebar_position: 1',
                'sidebar_label: lexical (core)',
              ].join('\n'),
            },
            targetDir: path.resolve(__dirname, 'docs/packages'),
          },
        ],
    './plugins/webpack-buffer',
    async function webpackLexicalModules() {
      return {
        configureWebpack() {
          return {
            resolve: {
              alias: {
                ...buildLexicalWebpackAliases(),
                '@examples/agent-example': path.resolve(
                  __dirname,
                  '../../examples/agent-example/src',
                ),
                '@examples/website-chat': path.resolve(
                  __dirname,
                  '../../examples/website-chat/src',
                ),
                '@examples/website-notion': path.resolve(
                  __dirname,
                  '../../examples/website-notion/src',
                ),
                '@examples/website-rich-input': path.resolve(
                  __dirname,
                  '../../examples/website-rich-input/src',
                ),
                '@examples/website-toolbar': path.resolve(
                  __dirname,
                  '../../examples/website-toolbar/src',
                ),
                '@huggingface/transformers': path.resolve(
                  __dirname,
                  'node_modules/@huggingface/transformers/dist/transformers.web.js',
                ),
                'onnxruntime-node': false,
              },
            },
          };
        },
        name: 'webpack-lexical-modules',
      };
    },
    ['docusaurus-plugin-typedoc', docusaurusPluginTypedocConfig],
    async function tailwindcss() {
      return {
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require('@tailwindcss/postcss'));
          return postcssOptions;
        },
        name: 'docusaurus-tailwindcss',
      };
    },
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/2024-recap',
            to: 'https://github.com/facebook/lexical/discussions/7220',
          },
        ],
      },
    ],
  ].filter((plugin) => plugin != null),
  presets: [
    [
      require.resolve('docusaurus-plugin-internaldocs-fb/docusaurus-preset'),
      {
        blog: false,
        docs: {
          beforeDefaultRemarkPlugins: [slugifyPlugin],
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website/`,
          path: 'docs',
          sidebarItemsGenerator,
          sidebarPath: require.resolve('./sidebars.js'),
        },
        gtag: {
          trackingID: 'G-7C6YYBYBBT',
        },
        staticDocsProject: 'lexical',
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  // Usually your GitHub org/user name.
  projectName: 'lexical',

  tagline: 'A text editor framework that does things differently',

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      docs: {
        sidebar: {
          autoCollapseCategories: true,
          hideable: true,
        },
      },
      navbar: {
        items: [
          {
            label: 'Playground',
            position: 'left',
            to: 'https://playground.lexical.dev/',
          },
          {
            label: 'Docs',
            position: 'left',
            sidebarId: 'docs',
            type: 'docSidebar',
          },
          process.env.FB_INTERNAL
            ? {
                href: 'https://lexical.dev/docs/api/',
                label: 'API',
                position: 'left',
              }
            : {
                label: 'API',
                position: 'left',
                sidebarId: 'api',
                type: 'docSidebar',
              },

          {label: 'Community', position: 'left', to: '/community'},
          {
            label: 'Demos',
            position: 'left',
            to: '/gallery',
          },
          {
            'aria-label': 'GitHub',
            className: 'icon-link icon-link-mask icon-link-github',
            position: 'right',
            to: GITHUB_REPO_URL,
          },
          {
            'aria-label': 'Discord',
            className: 'icon-link icon-link-mask icon-link-discord',
            position: 'right',
            to: DISCORD_URL,
          },
        ].filter((item) => item != null),
        logo: {
          alt: 'Lexical',
          height: 12,
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
      },
      prism: {
        darkTheme: darkCodeTheme,
        theme: lightCodeTheme,
      },
    }),

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        // ... Your options.
        // `hashed` is recommended as long-term-cache of index file is possible.
        hashed: true,
        indexBlog: false,
        language: ['en'],
      }),
    ],
  ],

  title: TITLE,
  url: 'https://lexical.dev',
};

module.exports = config;
