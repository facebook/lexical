/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {PropertiesHyphenFallback} from 'csstype';

import {
  $getState,
  $setState,
  createState,
  LexicalNode,
  ValueOrUpdater,
} from 'lexical';

/**
 * Creates an object containing all the styles and their values provided in the CSS string.
 * @param css - The CSS string of styles and their values.
 * @returns The styleObject containing all the styles and their values.
 */
export function getStyleObjectFromRawCSS(css: string): StyleObject {
  let styleObject: undefined | Record<string, string>;
  for (const style of css.split(';')) {
    if (style !== '') {
      const [key, value] = style.split(/:([^]+)/); // split on first colon
      if (key && value) {
        const keyTrim = key.trim();
        const valueTrim = value.trim();
        if (keyTrim && valueTrim) {
          styleObject = styleObject || {};
          styleObject[keyTrim] = valueTrim;
        }
      }
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

export type StyleTuple = NonNullable<
  {
    [K in keyof StyleObject]: [K, StyleObject[K]];
  }[keyof StyleObject]
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

export function $getStyleProperties(node: LexicalNode): StyleTuple[] {
  const entries: StyleTuple[] = [];
  for (const [k, v] of Object.entries($getState(node, styleState))) {
    if (k && v) {
      entries.push([k, v] as StyleTuple);
    }
  }
  return entries;
}

export function $getStyleProperty<Prop extends keyof StyleObject>(
  node: LexicalNode,
  prop: Prop,
): undefined | StyleObject[Prop] {
  return $getState(node, styleState)[prop];
}

export function $setStyleProperty<
  T extends LexicalNode,
  Prop extends keyof StyleObject,
>(node: T, prop: Prop, value: ValueOrUpdater<StyleObject[Prop]>): T {
  return $setState(node, styleState, (prevStyle) => {
    const prevValue = prevStyle[prop];
    const nextValue = typeof value === 'function' ? value(prevValue) : value;
    return prevValue === nextValue
      ? prevStyle
      : {...prevStyle, [prop]: nextValue};
  });
}
