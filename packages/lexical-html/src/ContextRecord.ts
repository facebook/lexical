/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  DOMExtensionOutput,
  DOMTextWrapMode,
  DOMWhiteSpaceCollapse,
} from './types';

import {
  getExtensionDependencyFromEditor,
  LexicalBuilder,
} from '@lexical/extension';
import {
  $getEditor,
  type AnyStateConfig,
  createState,
  type LexicalEditor,
  LexicalNode,
  type StateConfig,
  TextFormatType,
} from 'lexical';

import {
  DOMExtensionName,
  DOMTextWrapModeKeys,
  DOMWhiteSpaceCollapseKeys,
} from './constants';
import {DOMExtension} from './DOMExtension';
import {parseStringEnum} from './parseStringEnum';

let activeDOMContext:
  | undefined
  | {editor: LexicalEditor; context: ContextRecord};

export type ContextRecord = Map<AnyStateConfig, unknown>;
export function contextFromPairs(
  pairs: Iterable<AnyStateConfigPair>,
): undefined | ContextRecord {
  let rval: undefined | ContextRecord;
  for (const [k, v] of pairs) {
    rval = (rval || new Map()).set(k, v);
  }
  return rval;
}
function mergeContext(
  defaults: ContextRecord,
  overrides: ContextRecord | Iterable<AnyStateConfigPair>,
) {
  let ctx: undefined | ContextRecord;
  for (const [k, v] of overrides) {
    if (!ctx) {
      if (defaults.get(k) === v) {
        continue;
      }
      ctx = new Map(defaults);
    }
    ctx.set(k, v);
  }
  return ctx || defaults;
}

export function getContextValueFromRecord<K extends string, V>(
  context: ContextRecord,
  cfg: StateConfig<K, V>,
): V {
  const v = context.get(cfg);
  return v !== undefined || context.has(cfg) ? (v as V) : cfg.defaultValue;
}

export function $getDOMContextValue<K extends string, V>(
  cfg: StateConfig<K, V>,
  editor: LexicalEditor = $getEditor(),
): V {
  const context =
    activeDOMContext && activeDOMContext.editor === editor
      ? activeDOMContext.context
      : getExtensionDependencyFromEditor(editor, DOMExtension).output.defaults;
  return getContextValueFromRecord(context, cfg);
}

export const $getDOMImportContextValue = $getDOMContextValue;

export function $withDOMContext(
  cfg: Iterable<AnyStateConfigPair>,
  editor = $getEditor(),
): <T>(f: () => T) => T {
  const updates = contextFromPairs(cfg);
  return (f) => {
    if (!updates) {
      return f();
    }
    const prevDOMContext = activeDOMContext;
    let context: ContextRecord;
    if (prevDOMContext && prevDOMContext.editor === editor) {
      context = mergeContext(prevDOMContext.context, updates);
    } else {
      const ext = getDOMExtensionOutputIfAvailable(editor);
      context = ext ? mergeContext(ext.defaults, updates) : updates;
    }
    try {
      activeDOMContext = {context, editor};
      return f();
    } finally {
      activeDOMContext = prevDOMContext;
    }
  };
}
export const $withDOMImportContext = $withDOMContext;

/** true if this is a whole document export operation ($generateDOMFromRoot) */
export const DOMContextRoot = createState('@lexical/html/root', {
  parse: Boolean,
});

/** true if this is an export operation ($generateHtmlFromNodes) */
export const DOMContextExport = createState('@lexical/html/export', {
  parse: Boolean,
});
/** true if the DOM is for or from the clipboard */
export const DOMContextClipboard = createState('@lexical/html/clipboard', {
  parse: Boolean,
});

export const DOMContextTextFormats = createState('@lexical/html/textFormats', {
  parse: (s): null | {[K in TextFormatType]?: undefined | boolean} => null,
});

export const DOMContextWhiteSpaceCollapse = createState(
  '@lexical/html/whiteSpaceCollapse',
  {
    parse: (s): DOMWhiteSpaceCollapse =>
      (typeof s === 'string' &&
        parseStringEnum(DOMWhiteSpaceCollapseKeys, s)) ||
      'collapse',
  },
);

export const DOMContextTextWrapMode = createState(
  '@lexical/html/textWrapMode',
  {
    parse: (s): DOMTextWrapMode =>
      (typeof s === 'string' && parseStringEnum(DOMTextWrapModeKeys, s)) ||
      'wrap',
  },
);

export const DOMContextParentLexicalNode = createState(
  '@lexical/html/parentLexicalNode',
  {
    parse: (): null | LexicalNode => null,
  },
);
export const DOMContextHasBlockAncestorLexicalNode = createState(
  '@lexical/html/hasBlockAncestorLexicalNode',
  {
    parse: Boolean,
  },
);

export type StateConfigPair<K extends string, V> = readonly [
  StateConfig<K, V>,
  V,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStateConfigPair = StateConfigPair<any, any>;

export function getDOMExtensionOutputIfAvailable(
  editor: LexicalEditor,
): undefined | DOMExtensionOutput {
  const builder = LexicalBuilder.maybeFromEditor(editor);
  return builder && builder.hasExtensionByName(DOMExtensionName)
    ? getExtensionDependencyFromEditor(editor, DOMExtension).output
    : undefined;
}
