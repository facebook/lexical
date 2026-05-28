/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {
  $isElementNode,
  $isTextNode,
  configExtension,
  defineExtension,
} from 'lexical';

import {parseAllowedFontSize} from '../plugins/ToolbarPlugin/fontSize';
import {parseAllowedColor} from '../ui/ColorPicker';

function getPlaygroundExtraStyles(element: HTMLElement): string {
  // Parse styles from pasted input, but only if they match exactly the
  // sort of styles that would be produced by exportDOM
  let extraStyles = '';
  const fontSize = parseAllowedFontSize(element.style.fontSize);
  const backgroundColor = parseAllowedColor(element.style.backgroundColor);
  const color = parseAllowedColor(element.style.color);
  if (fontSize !== '' && fontSize !== '15px') {
    extraStyles += `font-size: ${fontSize};`;
  }
  if (backgroundColor !== '' && backgroundColor !== 'rgb(255, 255, 255)') {
    extraStyles += `background-color: ${backgroundColor};`;
  }
  if (color !== '' && color !== 'rgb(0, 0, 0)') {
    extraStyles += `color: ${color};`;
  }
  return extraStyles;
}

function $appendStyleToTextDescendants(
  node: LexicalNode,
  extraStyle: string,
): void {
  if ($isTextNode(node)) {
    node.setStyle(node.getStyle() + extraStyle);
  } else if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      $appendStyleToTextDescendants(child, extraStyle);
    }
  }
}

/**
 * Mirrors the legacy `buildHTMLConfig`-time wrapping of TextNode importers:
 * for any inline-format element (b/code/em/i/mark/s/span/strong/sub/sup/u),
 * if the element carries playground-allowed inline styles
 * (`font-size`, `background-color`, `color`), append those to the inline
 * style of every TextNode descendant produced by the lower-priority
 * `InlineFormatRule`.
 */
const PlaygroundInlineStyleRule = defineImportRule({
  $import: (_ctx, el, $next) => {
    const extraStyle = getPlaygroundExtraStyles(el);
    const result = $next();
    if (extraStyle) {
      for (const node of result) {
        $appendStyleToTextDescendants(node, extraStyle);
      }
    }
    return result;
  },
  match: sel.tag(
    'b',
    'code',
    'em',
    'i',
    'mark',
    's',
    'span',
    'strong',
    'sub',
    'sup',
    'u',
  ),
  name: '@lexical/playground/inline-extra-styles',
});

/**
 * Aggregate of every playground-specific DOM import rule, ordered so the
 * more-specific selectors win dispatch over the generic ones (rule at
 * index 0 has the highest priority).
 */
export const PlaygroundImportRules = [PlaygroundInlineStyleRule];

/**
 * Bundles {@link PlaygroundImportRules} into a single dependency that wires
 * the legacy playground HTML-import behavior into the new
 * {@link DOMImportExtension} pipeline.
 */
export const PlaygroundImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    configExtension(DOMImportExtension, {rules: PlaygroundImportRules}),
  ],
  name: '@lexical/playground/Import',
});
