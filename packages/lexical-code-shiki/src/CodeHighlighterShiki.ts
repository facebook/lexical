/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {
  $isCodeHighlightNode,
  $isCodeNode,
  CodeExtension,
  CodeHighlightNode,
  CodeIndentExtension,
  CodeNode,
  DEFAULT_CODE_LANGUAGE,
  registerCodeIndentation,
} from '@lexical/code-core';
import {effect, namedSignals} from '@lexical/extension';
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  $onUpdate,
  defineExtension,
  mergeRegister,
  safeCast,
  shallowMergeConfig,
  TextNode,
} from 'lexical';

import {
  $getHighlightNodes,
  isCodeLanguageLoaded,
  isCodeThemeLoaded,
  loadCodeLanguage,
  loadCodeTheme,
} from './FacadeShiki';

/**
 * A Shiki theme. A bare string is a single theme id and renders inline
 * as the `color` / `background-color` style. A `{light, dark}` pair
 * renders as `--shiki-light` / `--shiki-dark` CSS variables with no
 * inline color, so the consuming page's CSS picks the active scheme.
 */
export type ShikiThemeDef = string | {light: string; dark: string};

/**
 * A registry entry. Either a static {@link ShikiThemeDef} or a function
 * that resolves to one for a given code node, allowing per-node theme
 * decisions at runtime.
 */
export type ShikiThemeSpec =
  | ShikiThemeDef
  | ((codeNode: CodeNode) => ShikiThemeDef);

/**
 * The theme context handed to {@link CodeShikiConfig.$tokenize}. Holds
 * the registry, the active default key, and a `resolveTheme` helper
 * that picks the right entry for a given code node (per-node
 * `__theme` first, {@link defaultTheme} fallback, raw Shiki id with a
 * dev warning for keys missing from the registry).
 */
export interface ShikiThemeContext {
  themes: Record<string, ShikiThemeSpec>;
  defaultTheme: string;
  resolveTheme(codeNode: CodeNode): ShikiThemeDef;
}

/**
 * @deprecated Provide {@link CodeShikiConfig.defaultLanguage} and
 * {@link CodeShikiConfig.$tokenize} directly. Kept exported for
 * backward compatibility with {@link CodeHighlighterShikiExtension} and
 * existing direct callers of {@link registerCodeHighlighting}.
 */
export interface Tokenizer {
  defaultLanguage: string;
  defaultTheme: string;
  $tokenize: (
    this: Tokenizer,
    codeNode: CodeNode,
    language?: string,
  ) => LexicalNode[];
}

const DEFAULT_CODE_THEME = 'one-light';
const DEFAULT_THEME_KEY = 'default';

export const ShikiTokenizer: Tokenizer = {
  $tokenize(
    this: Tokenizer,
    codeNode: CodeNode,
    language?: string,
  ): LexicalNode[] {
    // Honor the per-node `__theme` override before falling back to the
    // tokenizer's default. Mirrors the historical behavior of the
    // pre-multi-theme `$getHighlightNodes` (`codeNode.getTheme() || theme`)
    // so legacy `registerCodeHighlighting` callers and
    // `CodeHighlighterShikiExtension` users with custom tokenizers keep
    // working when a code node carries a per-node theme.
    return $getHighlightNodes(
      codeNode,
      language || this.defaultLanguage,
      codeNode.getTheme() || this.defaultTheme,
    );
  },
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  defaultTheme: DEFAULT_CODE_THEME,
};

function createThemeContext(
  themes: Record<string, ShikiThemeSpec>,
  defaultTheme: string,
): ShikiThemeContext {
  // Dedupe missing-key warnings per (editor instance, theme key). Without
  // this the warn fires once per transform invocation, which on a long
  // document with N code nodes turns into N warnings per edit.
  const warnedKeys = new Set<string>();
  return {
    defaultTheme,
    resolveTheme(codeNode) {
      const themeKey = codeNode.getTheme() || defaultTheme;
      const spec = themes[themeKey];
      if (spec === undefined) {
        if (!warnedKeys.has(themeKey)) {
          warnedKeys.add(themeKey);
          console.warn(
            `[lexical-code-shiki] Theme "${themeKey}" is not in CodeShikiConfig.themes; treating it as a raw Shiki theme id. Add it to the registry for explicit registration.`,
          );
        }
        return themeKey;
      }
      return typeof spec === 'function' ? spec(codeNode) : spec;
    },
    themes,
  };
}

function $defaultShikiTokenize(
  codeNode: CodeNode,
  lang: string,
  themeContext: ShikiThemeContext,
): LexicalNode[] {
  return $getHighlightNodes(
    codeNode,
    lang,
    themeContext.resolveTheme(codeNode),
  );
}

type TokenizeFn = (
  codeNode: CodeNode,
  lang: string,
  themeContext: ShikiThemeContext,
) => LexicalNode[];

function $textNodeTransform(
  editor: LexicalEditor,
  tokenize: TokenizeFn,
  defaultLanguage: string,
  themeContext: ShikiThemeContext,
  transformState: TransformState,
  node: TextNode,
): void {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    $codeNodeTransform(
      editor,
      tokenize,
      defaultLanguage,
      themeContext,
      transformState,
      parentNode,
    );
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
}

function updateCodeGutter(node: CodeNode, editor: LexicalEditor): void {
  const codeElement = editor.getElementByKey(node.getKey());
  if (codeElement === null) {
    return;
  }
  const children = node.getChildren();
  const childrenLength = children.length;
  // @ts-ignore: internal field
  if (childrenLength === codeElement.__cachedChildrenLength) {
    // Avoid updating the attribute if the children length hasn't changed.
    return;
  }
  // @ts-ignore:: internal field
  codeElement.__cachedChildrenLength = childrenLength;
  let gutter = '1';
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if ($isLineBreakNode(children[i])) {
      gutter += '\n' + ++count;
    }
  }
  codeElement.setAttribute('data-gutter', gutter);
}

interface TransformState {
  didTransform: boolean;
  // Using extra cache (`nodesCurrentlyHighlighting`) since both CodeNode and CodeHighlightNode
  // transforms might be called at the same time (e.g. new CodeHighlight node inserted) and
  // in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
  // Especially when pasting code into CodeBlock.
  nodesCurrentlyHighlighting: Set<NodeKey>;
}

function $codeNodeTransform(
  editor: LexicalEditor,
  tokenize: TokenizeFn,
  defaultLanguage: string,
  themeContext: ShikiThemeContext,
  transformState: TransformState,
  node: CodeNode,
) {
  const nodeKey = node.getKey();
  const {nodesCurrentlyHighlighting} = transformState;

  // When new code block inserted it might not have language selected
  let language = node.getLanguage();
  if (!language) {
    language = defaultLanguage;
    node.setLanguage(language);
  }

  // Resolve the theme spec for this node and ensure all underlying
  // Shiki themes are loaded. The registry may produce either a single
  // theme id (inline path) or a `{light, dark}` pair (vars-only path).
  let inFlight = false;
  const resolvedSpec = themeContext.resolveTheme(node);
  const themeIdsToLoad =
    typeof resolvedSpec === 'string'
      ? [resolvedSpec]
      : [resolvedSpec.light, resolvedSpec.dark];
  for (const themeId of themeIdsToLoad) {
    if (!isCodeThemeLoaded(themeId)) {
      loadCodeTheme(themeId, editor, nodeKey);
      inFlight = true;
    }
  }

  // dynamic import of languages
  if (isCodeLanguageLoaded(language)) {
    if (!node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(true);
    }
  } else {
    if (node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(false);
    }
    loadCodeLanguage(language, editor, nodeKey);
    inFlight = true;
  }

  if (inFlight) {
    return;
  }

  if (nodesCurrentlyHighlighting.has(nodeKey)) {
    return;
  }

  nodesCurrentlyHighlighting.add(nodeKey);
  if (!transformState.didTransform) {
    transformState.didTransform = true;
    $onUpdate(() => {
      transformState.didTransform = false;
      nodesCurrentlyHighlighting.clear();
    });
  }

  $updateAndRetainSelection(nodeKey, () => {
    const currentNode = $getNodeByKey(nodeKey);

    if (!$isCodeNode(currentNode) || !currentNode.isAttached()) {
      return false;
    }

    const lang = currentNode.getLanguage() || defaultLanguage;
    const highlightNodes = tokenize(currentNode, lang, themeContext);
    const diffRange = getDiffRange(currentNode.getChildren(), highlightNodes);
    const {from, to, nodesForReplacement} = diffRange;

    if (from !== to || nodesForReplacement.length) {
      node.splice(from, to - from, nodesForReplacement);
      return true;
    }

    return false;
  });
}

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function $updateAndRetainSelection(
  nodeKey: NodeKey,
  updateFn: () => boolean,
): void {
  const node = $getNodeByKey(nodeKey);
  if (!$isCodeNode(node) || !node.isAttached()) {
    return;
  }
  const selection = $getSelection();
  // If it's not range selection (or null selection) there's no need to change it,
  // but we can still run highlighting logic
  if (!$isRangeSelection(selection)) {
    updateFn();
    return;
  }

  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const isNewLineAnchor =
    anchor.type === 'element' &&
    $isLineBreakNode(node.getChildAtIndex(anchor.offset - 1));
  let textOffset = 0;

  // Calculating previous text offset (all text node prior to anchor + anchor own text offset)
  if (!isNewLineAnchor) {
    const anchorNode = anchor.getNode();
    textOffset =
      anchorOffset +
      anchorNode.getPreviousSiblings().reduce((offset, _node) => {
        return offset + _node.getTextContentSize();
      }, 0);
  }

  const hasChanges = updateFn();
  if (!hasChanges) {
    return;
  }

  // Non-text anchors only happen for line breaks, otherwise
  // selection will be within text node (code highlight node)
  if (isNewLineAnchor) {
    anchor.getNode().select(anchorOffset, anchorOffset);
    return;
  }

  // If it was non-element anchor then we walk through child nodes
  // and looking for a position of original text offset
  node.getChildren().some(_node => {
    const isText = $isTextNode(_node);
    if (isText || $isLineBreakNode(_node)) {
      const textContentSize = _node.getTextContentSize();
      if (isText && textContentSize >= textOffset) {
        _node.select(textOffset, textOffset);
        return true;
      }
      textOffset -= textContentSize;
    }
    return false;
  });
}

// Finds minimal diff range between two nodes lists. It returns from/to range boundaries of prevNodes
// that needs to be replaced with `nodes` (subset of nextNodes) to make prevNodes equal to nextNodes.
function getDiffRange(
  prevNodes: Array<LexicalNode>,
  nextNodes: Array<LexicalNode>,
): {
  from: number;
  nodesForReplacement: Array<LexicalNode>;
  to: number;
} {
  let leadingMatch = 0;
  while (leadingMatch < prevNodes.length) {
    if (!isEqual(prevNodes[leadingMatch], nextNodes[leadingMatch])) {
      break;
    }
    leadingMatch++;
  }

  const prevNodesLength = prevNodes.length;
  const nextNodesLength = nextNodes.length;
  const maxTrailingMatch =
    Math.min(prevNodesLength, nextNodesLength) - leadingMatch;

  let trailingMatch = 0;
  while (trailingMatch < maxTrailingMatch) {
    trailingMatch++;
    if (
      !isEqual(
        prevNodes[prevNodesLength - trailingMatch],
        nextNodes[nextNodesLength - trailingMatch],
      )
    ) {
      trailingMatch--;
      break;
    }
  }

  const from = leadingMatch;
  const to = prevNodesLength - trailingMatch;
  const nodesForReplacement = nextNodes.slice(
    leadingMatch,
    nextNodesLength - trailingMatch,
  );
  return {
    from,
    nodesForReplacement,
    to,
  };
}

function isEqual(nodeA: LexicalNode, nodeB: LexicalNode): boolean {
  // Only checking for code highlight nodes, tabs and linebreaks. If it's regular text node
  // returning false so that it's transformed into code highlight node
  return (
    ($isCodeHighlightNode(nodeA) &&
      $isCodeHighlightNode(nodeB) &&
      nodeA.__text === nodeB.__text &&
      nodeA.__highlightType === nodeB.__highlightType &&
      nodeA.__style === nodeB.__style) ||
    ($isTabNode(nodeA) && $isTabNode(nodeB)) ||
    ($isLineBreakNode(nodeA) && $isLineBreakNode(nodeB))
  );
}

/**
 * @internal
 * Register only the Shiki highlighting transforms and the gutter
 * mutation listener. No keyboard / indent handlers — those are the
 * responsibility of
 * {@link "@lexical/code-core".registerCodeIndentation} /
 * {@link "@lexical/code-core".CodeIndentExtension}.
 *
 * Used by {@link CodeShikiExtension}, whose `CodeIndentExtension`
 * dependency handles the indent side. The legacy
 * {@link registerCodeHighlighting} wrapper combines this helper with
 * `registerCodeIndentation` for direct callers that want the original
 * single-call setup.
 *
 * Exported for use by the package's own unit tests; not re-exported
 * from the package entry point.
 */
export function registerHighlightingOnly(
  editor: LexicalEditor,
  tokenize: TokenizeFn,
  defaultLanguage: string,
  themeContext: ShikiThemeContext,
): () => void {
  const registrations = [];

  // Only register the mutation listener if not in headless mode
  if (editor._headless !== true) {
    registrations.push(
      editor.registerMutationListener(
        CodeNode,
        mutations => {
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              if (type !== 'destroyed') {
                const node = $getNodeByKey(key);
                if (node !== null) {
                  updateCodeGutter(node as CodeNode, editor);
                }
              }
            }
          });
        },
        {skipInitialization: false},
      ),
    );
  }

  const transformState: TransformState = {
    didTransform: false,
    nodesCurrentlyHighlighting: new Set(),
  };
  registrations.push(
    editor.registerNodeTransform(
      CodeNode,
      $codeNodeTransform.bind(
        null,
        editor,
        tokenize,
        defaultLanguage,
        themeContext,
        transformState,
      ),
    ),
    editor.registerNodeTransform(
      TextNode,
      $textNodeTransform.bind(
        null,
        editor,
        tokenize,
        defaultLanguage,
        themeContext,
        transformState,
      ),
    ),
    editor.registerNodeTransform(
      CodeHighlightNode,
      $textNodeTransform.bind(
        null,
        editor,
        tokenize,
        defaultLanguage,
        themeContext,
        transformState,
      ),
    ),
  );

  return mergeRegister(...registrations);
}

/**
 * Register the Shiki tokenizer-driven highlighting on the editor along
 * with the indent / Tab / arrow-key keyboard handlers. This function
 * is provided for legacy code that has not upgraded to using
 * {@link CodeShikiExtension}.
 */
export function registerCodeHighlighting(
  editor: LexicalEditor,
  tokenizer: Tokenizer = ShikiTokenizer,
): () => void {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    throw new Error(
      'CodeHighlightPlugin: CodeNode or CodeHighlightNode not registered on editor',
    );
  }
  // Wrap the legacy `Tokenizer` shape into the new tokenize signature.
  // The legacy `defaultTheme` is mapped to a singleton registry so per-
  // node `__theme` resolution still works the same way.
  const $tokenize: TokenizeFn = (codeNode, lang, _themeContext) =>
    tokenizer.$tokenize(codeNode, lang);
  const themeContext = createThemeContext(
    {[DEFAULT_THEME_KEY]: tokenizer.defaultTheme},
    DEFAULT_THEME_KEY,
  );
  return mergeRegister(
    registerHighlightingOnly(
      editor,
      $tokenize,
      tokenizer.defaultLanguage,
      themeContext,
    ),
    registerCodeIndentation(editor),
  );
}

export interface CodeShikiConfig {
  /**
   * When true, the Shiki code highlighter is not registered on the editor.
   * This signal can be flipped at runtime to enable or disable the
   * highlighter, for example to switch between the Prism and Shiki
   * highlighters without rebuilding the editor.
   */
  disabled: boolean;
  /**
   * The default language for code blocks that have no explicit language
   * set. Applied via {@link CodeNode.setLanguage} on first transform.
   *
   * Top-level wins over the deprecated {@link tokenizer}'s
   * `defaultLanguage`; the legacy value is consulted only when this
   * field equals the framework default (`@lexical/code-core`'s
   * `DEFAULT_CODE_LANGUAGE`). Setting this field to the framework
   * default value alongside a legacy tokenizer with a custom
   * `defaultLanguage` will silently route through the tokenizer's
   * value — prefer setting this field directly to avoid the footgun.
   */
  defaultLanguage: string;
  /**
   * Tokenize function. Receives a code node, the resolved language, and
   * a {@link ShikiThemeContext}. The default implementation reads the
   * per-node theme via `themeContext.resolveTheme(codeNode)` and
   * dispatches: a string spec renders inline (single theme), a
   * `{light, dark}` spec renders as CSS variables (multi-theme,
   * vars-only).
   *
   * Top-level wins over the deprecated {@link tokenizer}'s `$tokenize`;
   * the legacy implementation is consulted only when this field is the
   * exact `$defaultShikiTokenize` reference. Replacing the reference
   * with a structurally identical function disables the BC fallback.
   */
  $tokenize: TokenizeFn;
  /**
   * Registry of theme specs keyed by string. Per-node `__theme` and the
   * top-level {@link defaultTheme} are looked up here.
   *
   * Static entries are either a single Shiki theme id (rendered inline)
   * or a `{light, dark}` pair (rendered as `--shiki-light` /
   * `--shiki-dark` CSS variables, no inline color). Function entries
   * `(codeNode) => ShikiThemeDef` resolve at tokenize time, allowing
   * per-node decisions.
   */
  themes: Record<string, ShikiThemeSpec>;
  /**
   * Default registry key. Used when a code node's per-node `__theme` is
   * unset. Should be a key of {@link themes}; unknown keys fall back to
   * being treated as a raw Shiki theme id with a development warning.
   */
  defaultTheme: string;
  /**
   * @deprecated Provide {@link defaultLanguage} and {@link $tokenize}
   * directly on the config. Kept for backward compatibility with the
   * legacy {@link CodeHighlighterShikiExtension} wrapper.
   */
  tokenizer: Tokenizer | null;
}

function mergeShikiConfig(
  config: CodeShikiConfig,
  overrides: Partial<CodeShikiConfig>,
): CodeShikiConfig {
  const merged = shallowMergeConfig(config, overrides);
  // `themes` is a registry. Without a deep merge, two `configExtension(...)`
  // calls each contributing different theme keys would have the second
  // wholesale replace the first.
  if (overrides.themes) {
    merged.themes = {...config.themes, ...overrides.themes};
  }
  return merged;
}

/**
 * Add code highlighting support for code blocks with Shiki.
 *
 * {@link CodeExtension} is a dependency, so the required `CodeNode` and
 * `CodeHighlightNode` nodes are registered automatically.
 * {@link CodeIndentExtension} is also a dependency, so Tab / Shift+Tab
 * and the related keyboard handlers are activated automatically. Set
 * `tabSize` on `CodeIndentExtension` to enable space-indent outdent.
 */
export const CodeShikiExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<CodeShikiConfig>({
    $tokenize: $defaultShikiTokenize,
    defaultLanguage: DEFAULT_CODE_LANGUAGE,
    defaultTheme: DEFAULT_THEME_KEY,
    disabled: false,
    themes: {[DEFAULT_THEME_KEY]: DEFAULT_CODE_THEME},
    tokenizer: null,
  }),
  dependencies: [CodeExtension, CodeIndentExtension],
  mergeConfig: mergeShikiConfig,
  name: '@lexical/code-shiki',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      if (stores.disabled.value) {
        return;
      }
      const themes = stores.themes.value;
      const defaultTheme = stores.defaultTheme.value;
      const userDefaultLanguage = stores.defaultLanguage.value;
      const userTokenize = stores.$tokenize.value;
      const tokenizer = stores.tokenizer.value;

      // BC routing: top-level `$tokenize` always wins. If the user only
      // supplied a legacy `tokenizer` (top-level `$tokenize` is still
      // the framework default), route through that tokenizer.
      const tokenize: TokenizeFn =
        userTokenize !== $defaultShikiTokenize
          ? userTokenize
          : tokenizer
            ? (codeNode, lang, _ctx) => tokenizer.$tokenize(codeNode, lang)
            : $defaultShikiTokenize;

      // Same identity-equality fallback for `defaultLanguage`. Top-level
      // wins; the legacy tokenizer's value only applies when top-level
      // is still at the framework default.
      const defaultLanguage =
        userDefaultLanguage !== DEFAULT_CODE_LANGUAGE
          ? userDefaultLanguage
          : tokenizer
            ? tokenizer.defaultLanguage
            : userDefaultLanguage;

      const themeContext = createThemeContext(themes, defaultTheme);
      return registerHighlightingOnly(
        editor,
        tokenize,
        defaultLanguage,
        themeContext,
      );
    });
  },
});

/**
 * @deprecated Use {@link CodeShikiExtension} instead. This type is a
 * flat alias for {@link Tokenizer} kept for backward compatibility with
 * {@link CodeHighlighterShikiExtension}.
 */
export type CodeHighlighterShikiConfig = Tokenizer;

/**
 * @deprecated Use {@link CodeShikiExtension} instead.
 *
 * This is a thin backward-compatibility shim that preserves the original
 * flat {@link Tokenizer} config API. It depends on
 * {@link CodeShikiExtension} and routes its configured tokenizer to the
 * underlying extension during `init` (before `CodeShikiExtension` builds),
 * so consumers using
 * `configExtension(CodeHighlighterShikiExtension, customTokenizer)`
 * continue to work without modification.
 */
export const CodeHighlighterShikiExtension = defineExtension({
  config: safeCast<CodeHighlighterShikiConfig>(ShikiTokenizer),
  dependencies: [CodeShikiExtension],
  init: (editorConfig, config, state) => {
    // Forward the flat Tokenizer config to CodeShikiExtension's `tokenizer`
    // field before it builds. Top-level `defaultLanguage` and `$tokenize`
    // routing then picks up the legacy values via the BC fallback.
    state.getDependency(CodeShikiExtension).config.tokenizer = config;
  },
  name: '@lexical/code-shiki/legacy',
});
