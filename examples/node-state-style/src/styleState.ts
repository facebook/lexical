/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {PropertiesHyphenFallback} from 'csstype';

import {$forEachSelectedTextNode} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import InlineStyleParser from 'inline-style-parser';
import {
  $caretRangeFromSelection,
  $getNodeByKey,
  $getPreviousSelection,
  $getSelection,
  $getState,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  $setState,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  createState,
  DOMConversionMap,
  DOMExportOutput,
  isDocumentFragment,
  isHTMLElement,
  LexicalEditor,
  LexicalNode,
  RootNode,
  TextNode,
  ValueOrUpdater,
} from 'lexical';

/**
 * Creates an object containing all the styles and their values provided in the CSS string.
 * @param css - The CSS string of styles and their values.
 * @returns The styleObject containing all the styles and their values.
 */
export function getStyleObjectFromRawCSS(css: string): StyleObject {
  let styleObject: undefined | Record<string, string>;
  for (const token of InlineStyleParser(css, {silent: true})) {
    if (token.type === 'declaration' && token.value) {
      styleObject = styleObject || {};
      styleObject[token.property] = token.value;
    }
  }
  return styleObject || NO_STYLE;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<T> = {[K in keyof T]: T[K]} & {};

export type StyleObject = Prettify<{
  [K in keyof PropertiesHyphenFallback]?:
    | undefined
    // This is simplified to not deal with arrays or numbers.
    // This is an example after all!
    | Extract<PropertiesHyphenFallback[K], string>;
}>;

export type StyleTuple = Exclude<
  {
    [K in keyof StyleObject]: [K, null | Exclude<StyleObject[K], undefined>];
  }[keyof StyleObject],
  undefined
>;

export const NO_STYLE: StyleObject = Object.freeze({});

function parse(v: unknown): StyleObject {
  return typeof v === 'string' ? getStyleObjectFromRawCSS(v) : NO_STYLE;
}

function unparse(style: StyleObject): string {
  const styles: string[] = [];
  for (const [k, v] of Object.entries(style)) {
    if (k && v) {
      styles.push(`${k}: ${v};`);
    }
  }
  return styles.sort().join(' ');
}

function isEqualValue(
  a: StyleObject[keyof StyleObject],
  b: StyleObject[keyof StyleObject],
): boolean {
  return a === b || (!a && !b);
}

function isEqual(a: StyleObject, b: StyleObject): boolean {
  if (a === b) {
    return true;
  }
  for (const k in a) {
    if (!isEqualValue(a[k as keyof StyleObject], b[k as keyof StyleObject])) {
      return false;
    }
  }
  for (const k in b) {
    if (!(k in a)) {
      return false;
    }
  }
  return true;
}

export const styleState = createState('style', {
  isEqual,
  parse,
  unparse,
});

export function $getStyleProperty<Prop extends keyof StyleObject>(
  node: LexicalNode,
  prop: Prop,
): undefined | StyleObject[Prop] {
  return $getStyleObject(node)[prop];
}

// eslint-disable-next-line @lexical/rules-of-lexical
export function getStyleObjectDirect(node: LexicalNode): StyleObject {
  return $getState(node, styleState, 'direct');
}

export function $getStyleObject(node: LexicalNode): StyleObject {
  return $getState(node, styleState);
}

export function $setStyleObject<T extends LexicalNode>(
  node: T,
  valueOrUpdater: ValueOrUpdater<StyleObject>,
): T {
  return $setState(node, styleState, valueOrUpdater);
}

export function $setStyleProperty<
  T extends LexicalNode,
  Prop extends keyof StyleObject,
>(node: T, prop: Prop, value: ValueOrUpdater<StyleObject[Prop]>): T {
  return $setStyleObject(node, (prevStyle) => {
    const prevValue = prevStyle[prop];
    const nextValue = typeof value === 'function' ? value(prevValue) : value;
    return prevValue === nextValue
      ? prevStyle
      : {...prevStyle, [prop]: nextValue};
  });
}

export function applyStyle(
  element: HTMLElement,
  styleObject: StyleObject,
): void {
  for (const k_ in styleObject) {
    const k = k_ as keyof StyleObject;
    element.style.setProperty(k, styleObject[k] ?? null);
  }
}

export function diffStyleObjects(
  prevStyles: StyleObject,
  nextStyles: StyleObject,
): StyleObject {
  let styleDiff: undefined | Record<string, string | undefined>;
  if (prevStyles !== nextStyles) {
    for (const k_ in nextStyles) {
      const k = k_ as keyof StyleObject;
      const nextV = nextStyles[k];
      const prevV = prevStyles[k];
      if (!isEqualValue(nextV, prevV)) {
        styleDiff = styleDiff || {};
        styleDiff[k] = nextV;
      }
    }
    for (const k in prevStyles) {
      if (!(k in nextStyles)) {
        styleDiff = styleDiff || {};
        styleDiff[k] = undefined;
      }
    }
  }
  return styleDiff || NO_STYLE;
}

export function mergeStyleObjects(
  prevStyles: StyleObject,
  nextStyles: StyleObject,
): StyleObject {
  return prevStyles === NO_STYLE || prevStyles === nextStyles
    ? nextStyles
    : {...prevStyles, ...nextStyles};
}

export function styleObjectToArray(styleObject: StyleObject): StyleTuple[] {
  const entries: StyleTuple[] = [];
  for (const k_ in styleObject) {
    const k = k_ as keyof StyleObject;
    entries.push([k, styleObject[k] ?? null] as StyleTuple);
  }
  return entries;
}

export const PATCH_TEXT_STYLE_COMMAND = createCommand<
  StyleObject | ((prevStyles: StyleObject) => StyleObject)
>('PATCH_TEXT_STYLE_COMMAND');

function $nodeHasStyle(node: LexicalNode): boolean {
  return !isEqual(NO_STYLE, $getStyleObject(node));
}

export function $selectionHasStyle(): boolean {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const caretRange = $caretRangeFromSelection(selection);
    for (const slice of caretRange.getTextSlices()) {
      if (slice && $nodeHasStyle(slice.caret.origin)) {
        return true;
      }
    }
    for (const caret of caretRange.iterNodeCarets('root')) {
      if ($isTextNode(caret.origin) && $nodeHasStyle(caret.origin)) {
        return true;
      }
    }
  }
  return false;
}

export function $patchSelectedTextStyle(
  styleObjectOrCallback:
    | StyleObject
    | ((prevStyles: StyleObject) => StyleObject),
): boolean {
  if (!$getSelection()) {
    const prevSelection = $getPreviousSelection();
    if (!prevSelection) {
      return false;
    }
    $setSelection(prevSelection.clone());
  }
  const styleCallback =
    typeof styleObjectOrCallback === 'function'
      ? styleObjectOrCallback
      : (prevStyles: StyleObject) =>
          mergeStyleObjects(prevStyles, styleObjectOrCallback);
  $forEachSelectedTextNode((node) => $setStyleObject(node, styleCallback));
  return true;
}

const PREV_STYLE_STATE = Symbol.for('styleState');
interface HTMLElementWithManagedStyle extends HTMLElement {
  // Store the last reconciled style object directly on the DOM
  // so we don't have to track the previous DOM
  // which can happen even when nodeMutation is 'updated'
  [PREV_STYLE_STATE]?: StyleObject;
}

interface LexicalNodeWithUnknownStyle extends LexicalNode {
  // This property exists on all TextNode and ElementNode
  // and likely also some DecoratorNode by convention.
  // We use it as a heuristic to see if the style has likely
  // been overwritten to see if we should apply a diff
  // or all styles.
  __style?: unknown;
}

function styleStringChanged(
  node: LexicalNodeWithUnknownStyle,
  prevNode: LexicalNodeWithUnknownStyle,
): boolean {
  return typeof node.__style === 'string' && prevNode.__style !== node.__style;
}

function getPreviousStyleObject(
  node: LexicalNode,
  prevNode: null | LexicalNode,
  dom: HTMLElementWithManagedStyle,
): StyleObject {
  const prevStyleObject = dom[PREV_STYLE_STATE];
  return prevStyleObject && prevNode && !styleStringChanged(node, prevNode)
    ? prevStyleObject
    : NO_STYLE;
}

// This applies the style to the DOM of any node
function makeStyleUpdateListener(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerMutationListener(RootNode, () => {
      // UpdateListener will only get the mutatedNodes payload when
      // at least one MutationListener is registered
    }),
    editor.registerUpdateListener((payload) => {
      const {prevEditorState, mutatedNodes} = payload;
      editor.getEditorState().read(
        () => {
          if (mutatedNodes) {
            for (const nodes of mutatedNodes.values()) {
              for (const [nodeKey, nodeMutation] of nodes) {
                if (nodeMutation === 'destroyed') {
                  continue;
                }
                const node = $getNodeByKey(nodeKey);
                const dom: null | HTMLElementWithManagedStyle =
                  editor.getElementByKey(nodeKey);
                if (!dom || !node) {
                  return;
                }
                const prevNode = $getNodeByKey(nodeKey, prevEditorState);
                const prevStyleObject = getPreviousStyleObject(
                  node,
                  prevNode,
                  dom,
                );
                const nextStyleObject = $getStyleObject(node);
                dom[PREV_STYLE_STATE] = nextStyleObject;
                applyStyle(
                  dom,
                  diffStyleObjects(prevStyleObject, nextStyleObject),
                );
              }
            }
          }
        },
        {editor},
      );
    }),
  );
}

// TODO https://github.com/facebook/lexical/issues/7259
// there should be a better way to do this, this does not compose with other exportDOM overrides
export function $exportNodeStyle(
  editor: LexicalEditor,
  target: LexicalNode,
): DOMExportOutput {
  const output = target.exportDOM(editor);
  const style = $getStyleObject(target);
  if (style === NO_STYLE) {
    return output;
  }
  return {
    ...output,
    after: (generatedElement) => {
      const el = output.after
        ? output.after(generatedElement)
        : generatedElement;
      if (isHTMLElement(el)) {
        applyStyle(el, style);
      } else if (isDocumentFragment(el)) {
        // Work around a bug in the type
        return el as unknown as ReturnType<
          NonNullable<DOMExportOutput['after']>
        >;
      }
      return el;
    },
  };
}

const IGNORE_STYLES: Set<keyof StyleObject> = new Set([
  'font-weight',
  'text-decoration',
  'font-style',
  'vertical-align',
]);

export type StyleMapping = (input: StyleObject) => StyleObject;

// TODO there's no reasonable way to hook into importDOM/exportDOM from a plug-in https://github.com/facebook/lexical/issues/7259
export function constructStyleImportMap(
  styleMapping: StyleMapping = (input) => input,
): DOMConversionMap {
  const importMap: DOMConversionMap = {};

  // Wrap all TextNode importers with a function that also imports
  // styles that are not otherwise imported
  for (const [tag, fn] of Object.entries(TextNode.importDOM() || {})) {
    importMap[tag] = (importNode) => {
      const importer = fn(importNode);
      if (!importer) {
        return null;
      }
      return {
        ...importer,
        conversion: (element) => {
          const output = importer.conversion(element);
          if (
            output === null ||
            output.forChild === undefined ||
            output.after !== undefined ||
            output.node !== null ||
            !element.hasAttribute('style')
          ) {
            return output;
          }
          let extraStyles: undefined | Record<string, string>;
          for (const k of element.style) {
            if (IGNORE_STYLES.has(k as keyof StyleObject)) {
              continue;
            }
            extraStyles = extraStyles || {};
            extraStyles[k] = element.style.getPropertyValue(k);
          }
          if (extraStyles) {
            const {forChild} = output;
            return {
              ...output,
              forChild: (child, parent) => {
                const node = forChild(child, parent);
                return $isTextNode(node)
                  ? $setStyleObject(
                      node,
                      styleMapping(extraStyles as StyleObject),
                    )
                  : node;
              },
            };
          }
          return output;
        },
      };
    };
  }
  return importMap;
}

export function registerStyleState(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      PATCH_TEXT_STYLE_COMMAND,
      $patchSelectedTextStyle,
      COMMAND_PRIORITY_EDITOR,
    ),
    makeStyleUpdateListener(editor),
  );
}
