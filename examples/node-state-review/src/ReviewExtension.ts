/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  defineImportRule,
  DOMImportExtension,
  domOverride,
  DOMRenderExtension,
  sel,
} from '@lexical/html';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $getState,
  $isParagraphNode,
  $setState,
  configExtension,
  createState,
  defineExtension,
  isHTMLElement,
  ParagraphNode,
} from 'lexical';

export const reviewedState = createState('reviewed', {
  parse: value => value === true,
});

function $applyReviewedAttribute(node: ParagraphNode, element: HTMLElement) {
  if ($getState(node, reviewedState)) {
    element.setAttribute('data-reviewed', 'true');
  } else {
    element.removeAttribute('data-reviewed');
  }
}

const ReviewedParagraphRule = defineImportRule({
  $import(_context, _element, $next) {
    // Let the existing paragraph rule create the nodes and their children.
    const nodes = $next();
    for (const node of nodes) {
      if ($isParagraphNode(node)) {
        $setState(node, reviewedState, true);
      }
    }
    return nodes;
  },
  match: sel.tag('p').attr('data-reviewed', 'true'),
  name: '@lexical/examples/reviewed-paragraph',
});

export const ReviewExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    configExtension(DOMImportExtension, {rules: [ReviewedParagraphRule]}),
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([ParagraphNode], {
          $decorateDOM(node, _prevNode, dom) {
            $applyReviewedAttribute(node, dom);
          },
          $exportDOM(node, $next) {
            const output = $next();
            if (isHTMLElement(output.element)) {
              $applyReviewedAttribute(node, output.element);
            }
            return output;
          },
        }),
      ],
    }),
  ],
  name: '@lexical/examples/Review',
});
