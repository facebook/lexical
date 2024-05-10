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
const {packagesManager} = require('../../scripts/shared/packagesManager');
const path = require('node:path');

const TITLE = 'Lexical';
const GITHUB_REPO_URL = 'https://github.com/facebook/lexical'; // TODO: Update when repo name updated
const IOS_GITHUB_REPO_URL = 'https://github.com/facebook/lexical-ios';

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
    .replace(/^api\/modules\//, '')
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
          if (item.type === 'doc' && item.id.startsWith('api/modules/')) {
            // autoConfiguration is disabled because the frontmatter
            // sidebar_label otherwise takes precedence over anything we do
            // here, and the default labels come from the page titles which
            // are parsed at a later stage of the pipeline.
            const label = idToModuleName(item.id);
            const m = /^(@lexical\/[^/]+)\/(.*)$/.exec(label);
            if (m) {
              const lastItem = groupedItems[groupedItems.length - 1];
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

/** @type {Partial<import('docusaurus-plugin-typedoc/dist/types').PluginOptions>} */
const docusaurusPluginTypedocConfig = {
  ...sourceLinkOptions(),
  entryPoints: packagesManager
    .getPublicPackages()
    .flatMap((pkg) =>
      pkg
        .getExportedNpmModuleEntries()
        .map((entry) => [
          path.relative(__dirname, pkg.resolve('src', entry.sourceFileName)),
        ]),
    ),
  excludeInternal: true,
  plugin: [
    './src/plugins/lexical-typedoc-plugin-no-inherit',
    './src/plugins/lexical-typedoc-plugin-module-name',
  ],
  sidebar: {
    autoConfiguration: false,
    position: 5,
  },
  tsconfig: '../../tsconfig.build.json',
  watch: process.env.TYPEDOC_WATCH === 'true',
};

/** @type {import('@docusaurus/types').Config} */
const config = {
  baseUrl: '/',

  favicon: 'img/favicon.ico',

  markdown: {format: 'md'},

  onBrokenAnchors: 'throw',
  // These are false positives when linking from API docs
  onBrokenLinks: 'ignore',
  onBrokenMarkdownLinks: 'throw',
  organizationName: 'facebook',
  plugins: [
    [
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
    ['docusaurus-plugin-typedoc', docusaurusPluginTypedocConfig],
    async function tailwindcss() {
      return {
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require('tailwindcss'));
          postcssOptions.plugins.push(require('autoprefixer'));
          return postcssOptions;
        },
        name: 'docusaurus-tailwindcss',
      };
    },
  ],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        blog: {
          editUrl: `${GITHUB_REPO_URL}/tree/main/packages/lexical-website/blog/`,
          showReadingTime: true, // TODO: Update when directory finalized
        },
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
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  // Usually your GitHub org/user name.
  projectName: 'lexical',

  tagline: 'An extensible text editor framework that does things differently',

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig & import('@docusaurus/theme-search-algolia').ThemeConfig} */
    ({
      algolia: {
        apiKey: '00b99bc61a623e1abd819b1d655da918',
        appId: 'YRGKJK6OMH',
        contextualSearch: true,
        indexName: 'lexical',
      },
      docs: {
        sidebar: {
          autoCollapseCategories: true,
          hideable: true,
        },
      },
      footer: {
        copyright: `Copyright © ${new Date().getFullYear()} Meta Platforms, Inc. Built with Docusaurus.`,
        links: [
          {
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
            ],
            title: 'Docs',
          },
          {
            items: [
              {
                href: 'https://stackoverflow.com/questions/tagged/lexicaljs',
                label: 'Stack Overflow',
              },
              {
                href: 'https://twitter.com/lexicaljs',
                label: 'Twitter',
              },
            ],
            title: 'Community',
          },
          {
            items: [
              {
                href: 'https://github.com/facebook/lexical',
                label: 'GitHub',
              },
            ],
            title: 'More',
          },
          {
            // Please do not remove the privacy and terms, it's a legal requirement.
            items: [
              {
                href: 'https://opensource.facebook.com/legal/privacy/',
                label: 'Privacy',
                rel: 'noreferrer noopener',
                target: '_blank',
              },
              {
                href: 'https://opensource.facebook.com/legal/terms/',
                label: 'Terms',
                rel: 'noreferrer noopener',
                target: '_blank',
              },
            ],

            title: 'Legal',
          },
        ],
        style: 'dark',
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
          {
            label: 'API',
            position: 'left',
            sidebarId: 'api',
            type: 'docSidebar',
          },

          {label: 'Community', position: 'left', to: '/community'},
          {
            href: 'https://facebook.github.io/lexical-ios/',
            label: 'iOS',
            position: 'left',
          },
          {
            href: GITHUB_REPO_URL,
            label: 'GitHub',
            position: 'right',
          },
          {
            href: IOS_GITHUB_REPO_URL,
            label: 'iOS GitHub',
            position: 'right',
          },
        ],
        logo: {
          alt: 'Lexical',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
      },
      prism: {
        darkTheme: darkCodeTheme,
        theme: lightCodeTheme,
      },
    }),

  title: TITLE,

  url: 'https://lexical.dev',
};

module.exports = config;
