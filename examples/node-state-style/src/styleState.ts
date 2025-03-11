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
  $getNodeByKey,
  $getState,
  $isTextNode,
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

const NO_STYLE: StyleObject = {};

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
  return styles.join(' ');
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

export const PATCH_TEXT_STYLE_COMMAND = createCommand<StyleObject>(
  'PATCH_TEXT_STYLE_COMMAND',
);

export function $patchSelectedTextStyle(styleObject: StyleObject): false {
  $forEachSelectedTextNode((node) =>
    $setStyleObject(node, (prevStyles) =>
      mergeStyleObjects(prevStyles, styleObject),
    ),
  );
  return false;
}

const PREV_STYLE_STATE = Symbol.for('styleState');
interface HTMLElementWithManagedStyle extends HTMLElement {
  [PREV_STYLE_STATE]?: StyleObject;
}

function makeStyleUpdateListener(editor: LexicalEditor): () => void {
  // TODO In the general case this feature would need a global mutation listener
  //      or an update listener with equivalent metadata
  return editor.registerMutationListener(
    TextNode,
    (nodes, {prevEditorState}) => {
      editor.getEditorState().read(
        () => {
          for (const [nodeKey, nodeMutation] of nodes) {
            if (nodeMutation === 'destroyed') {
              continue;
            }
            const node = $getNodeByKey(nodeKey);
            const dom: null | HTMLElementWithManagedStyle =
              editor.getElementByKey(nodeKey);
            if (!dom || !$isTextNode(node)) {
              return;
            }
            const prevNode = $getNodeByKey(nodeKey, prevEditorState);
            const prevStyleObject =
              ($isTextNode(prevNode) && prevNode.__style === node.__style
                ? dom[PREV_STYLE_STATE]
                : undefined) ?? NO_STYLE;
            const nextStyleObject = $getStyleObject(node);
            dom[PREV_STYLE_STATE] = nextStyleObject;
            if (prevStyleObject !== nextStyleObject) {
              applyStyle(
                dom,
                diffStyleObjects(prevStyleObject, nextStyleObject),
              );
            }
          }
        },
        {editor},
      );
    },
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
