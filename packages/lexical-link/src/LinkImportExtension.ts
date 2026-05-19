/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  InlineSchema,
  sel,
} from '@lexical/html';
import {configExtension, defineExtension} from 'lexical';

import {$createLinkNode} from './index';

const AnchorRule = defineImportRule({
  $import: (ctx, el) => {
    const content = el.textContent;
    if ((content === null || content === '') && el.children.length === 0) {
      return [];
    }
    const link = $createLinkNode(el.getAttribute('href') || '', {
      rel: el.getAttribute('rel'),
      target: el.getAttribute('target'),
      title: el.getAttribute('title'),
    });
    link.append(...ctx.$importChildren(el, {schema: InlineSchema}));
    return [link];
  },
  match: sel.tag('a'),
  name: '@lexical/link/a',
});

/**
 * Import rules for {@link LinkNode}.
 *
 * @experimental
 */
export const LinkImportRules = [AnchorRule];

/**
 * Bundles {@link LinkImportRules} (plus {@link CoreImportExtension}) into
 * a single dependency. Equivalent to the legacy
 * `LinkNode.importDOM` registration on the new
 * {@link DOMImportExtension} pipeline.
 *
 * @experimental
 */
export const LinkImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    configExtension(DOMImportExtension, {rules: LinkImportRules}),
  ],
  name: '@lexical/link/Import',
});
