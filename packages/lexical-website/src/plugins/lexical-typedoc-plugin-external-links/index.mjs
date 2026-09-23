/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check

import {existsSync, readFileSync} from 'node:fs';
import {
  Converter,
  DeclarationReflection,
  normalizePath,
  SignatureReflection,
} from 'typedoc';

// Map documented platform types explicitly; other TypeScript declarations use
// the same versioned source fallback as third-party package types.
const typescriptLinks = {
  ...namedLinks('https://developer.mozilla.org/docs/Web/API/', [
    'AbortController',
    'AbortSignal',
    'CSSStyleDeclaration',
    'CSSStyleSheet',
    'ClipboardEvent',
    'Comment',
    'CompositionEvent',
    'DOMRect',
    'DataTransfer',
    'Document',
    'DocumentFragment',
    'DragEvent',
    'Element',
    'Event',
    'EventTarget',
    'EventTarget.addEventListener',
    'File',
    'FocusEvent',
    'HTMLAnchorElement',
    'HTMLBodyElement',
    'HTMLButtonElement',
    'HTMLDivElement',
    'HTMLElement',
    'HTMLHRElement',
    'HTMLLIElement',
    'HTMLOListElement',
    'HTMLPreElement',
    'HTMLQuoteElement',
    'HTMLSpanElement',
    'HTMLTableCellElement',
    'HTMLTableElement',
    'HTMLTableRowElement',
    'HTMLUListElement',
    'InputEvent',
    'KeyboardEvent',
    'MouseEvent',
    'Node',
    'Range',
    'Selection',
    'ShadowRoot',
    'StaticRange',
    'Text',
    'Window',
  ]),
  ...namedLinks(
    'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/',
    ['Error', 'Function', 'Iterator', 'Map', 'Promise', 'RegExp', 'Set'],
  ),
  ...Object.fromEntries(
    Object.entries({
      Exclude: 'excludeuniontype-excludedmembers',
      Extract: 'extracttype-union',
      InstanceType: 'instancetypetype',
      NonNullable: 'nonnullabletype',
      Omit: 'omittype-keys',
      Parameters: 'parameterstype',
      Partial: 'partialtype',
      Pick: 'picktype-keys',
      Readonly: 'readonlytype',
      Record: 'recordkeys-type',
    }).map(([name, anchor]) => [
      name,
      `https://www.typescriptlang.org/docs/handbook/utility-types.html#${anchor}`,
    ]),
  ),
  Iterable:
    'https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html#iterable-interface',
};

/** @param {string} baseURL @param {string[]} names */
function namedLinks(baseURL, names) {
  return Object.fromEntries(
    names.map(name => [name, baseURL + name.replaceAll('.', '/')]),
  );
}

/** @type {import('typedoc').TypeDocOptions['externalSymbolLinkMappings']} */
export const externalSymbolLinkMappings = {
  '@types/mdast': {
    ...Object.fromEntries(
      [
        'Association',
        'Blockquote',
        'Break',
        'Code',
        'Definition',
        'Emphasis',
        'FootnoteDefinition',
        'FootnoteReference',
        'Heading',
        'Html',
        'Image',
        'ImageReference',
        'InlineCode',
        'Link',
        'LinkReference',
        'List',
        'ListItem',
        'Literal',
        'Paragraph',
        'Parent',
        'Root',
        'Strong',
        'Text',
        'ThematicBreak',
      ].map(name => [
        name,
        `https://github.com/syntax-tree/mdast#${name.toLowerCase()}`,
      ]),
    ),
    Node: 'https://github.com/syntax-tree/unist#node',
  },
  '@types/react': {
    'React.Context': 'https://react.dev/reference/react/createContext',
    'React.ReactElement': 'https://react.dev/learn/typescript#typing-children',
    'React.ReactNode': 'https://react.dev/learn/typescript#typing-children',
    'React.RefObject': 'https://react.dev/reference/react/useRef',
  },
  '@types/react-dom': {
    Root: 'https://react.dev/reference/react-dom/client/createRoot',
  },
  '@types/unist': {
    Data: 'https://github.com/syntax-tree/unist#data',
    Point: 'https://github.com/syntax-tree/unist#point',
    Position: 'https://github.com/syntax-tree/unist#position',
  },
  'fast-check': {
    Arbitrary: 'https://fast-check.dev/docs/api/classes/Arbitrary/',
  },
  global: typescriptLinks,
  'mdast-util-from-markdown': {
    Extension:
      'https://github.com/syntax-tree/mdast-util-from-markdown#extension',
  },
  'mdast-util-to-markdown': {
    Options: 'https://github.com/syntax-tree/mdast-util-to-markdown#options',
  },
  typescript: typescriptLinks,
  yjs: {
    Doc: 'https://docs.yjs.dev/api/y.doc',
    RelativePosition: 'https://docs.yjs.dev/api/relative-positions',
    UndoManager: 'https://docs.yjs.dev/api/undo-manager',
    YEvent: 'https://docs.yjs.dev/api/y.event',
    YText: 'https://docs.yjs.dev/api/shared-types/y.text',
    YXmlElement: 'https://docs.yjs.dev/api/shared-types/y.xmlelement',
    YXmlText: 'https://docs.yjs.dev/api/shared-types/y.xmltext',
  },
};

/** @param {import('typedoc').Application} app */
export function load(app) {
  /** @type {Map<string, {name: string, version: string} | undefined>} */
  const packages = new Map();
  app.converter.on(Converter.EVENT_BEGIN, () => {
    packages.clear();
  });

  // TypeDoc's configured documentation mappings take precedence over this
  // fallback for symbols with no dedicated documentation page.
  app.converter.addUnknownSymbolResolver((_ref, _owner, _part, id) => {
    if (!id || !id.fileName) {
      return;
    }
    const link = sourceLink(id.fileName);
    return link && link.url;
  });

  app.converter.on(
    Converter.EVENT_RESOLVE_BEGIN,
    context => {
      for (const reflection of Object.values(context.project.reflections)) {
        if (
          reflection instanceof DeclarationReflection ||
          reflection instanceof SignatureReflection
        ) {
          for (const source of reflection.sources || []) {
            if (source.fullFileName.includes('/node_modules/')) {
              const link = sourceLink(source.fullFileName);
              // Never retain the default Lexical repository URL for a dependency.
              source.url = link && link.url;
              if (link) {
                source.fileName = link.fileName;
              }
            }
          }
        }
      }
    },
    // Run after TypeDoc's SourcePlugin has applied sourceLinkTemplate.
    -100,
  );

  /**
   * Link to the exact published file, which also works for generated .d.ts files
   * that do not exist in the dependency's git repository. The last node_modules
   * segment handles both flat installs and pnpm's virtual store. Do not append
   * line anchors: UNPKG only renders them for small files, not e.g. React's types
   * or lib.dom.d.ts. TypeDoc still displays the line number in the link text.
   *
   * @param {string} fileName
   */
  function sourceLink(fileName) {
    const match = /^(.*\/node_modules\/((?:@[^/]+\/)?[^/]+))\/(.+)$/.exec(
      fileName.replaceAll('\\', '/'),
    );
    if (!match || !existsSync(fileName)) {
      return;
    }
    const [, directory, , packagePath] = match;
    if (!packages.has(directory)) {
      const manifest = `${directory}/package.json`;
      const pkg = existsSync(manifest)
        ? JSON.parse(readFileSync(manifest, 'utf8'))
        : undefined;
      packages.set(
        directory,
        pkg && !pkg.private && pkg.name && pkg.version ? pkg : undefined,
      );
    }
    const pkg = packages.get(directory);
    if (!pkg) {
      return;
    }
    return {
      fileName: normalizePath(`${pkg.name}/${packagePath}`),
      url:
        `https://unpkg.com/browse/${pkg.name}@${pkg.version}/` +
        packagePath.split('/').map(encodeURIComponent).join('/'),
    };
  }
}
