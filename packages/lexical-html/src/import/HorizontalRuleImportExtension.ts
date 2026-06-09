/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createHorizontalRuleNode,
  HorizontalRuleExtension,
} from '@lexical/extension';
import {configExtension, defineExtension} from 'lexical';

import {defineImportRule} from './defineImportRule';
import {DOMImportExtension} from './DOMImportExtension';
import {selBase} from './sel';

const HorizontalRuleRule = defineImportRule({
  $import: () => [$createHorizontalRuleNode()],
  match: selBase.tag('hr'),
  name: '@lexical/html/hr',
});

/**
 * Import rules for {@link HorizontalRuleNode}.
 *
 * @experimental
 */
export const HorizontalRuleImportRules = [HorizontalRuleRule];

/**
 * Bundles {@link HorizontalRuleImportRules} together with the runtime
 * {@link HorizontalRuleExtension}. The application is expected to
 * already have `CoreImportExtension` (or some equivalent) in its
 * dependency graph — the core/text/paragraph/inline-format rules are a
 * shared baseline, not something this leaf importer should re-declare.
 *
 * Lives in `@lexical/html` (not `@lexical/extension`) because
 * {@link DOMImportExtension} itself is in `@lexical/html`, and
 * `@lexical/extension` is upstream of `@lexical/html` in the dependency
 * graph.
 *
 * @experimental
 */
export const HorizontalRuleImportExtension = defineExtension({
  dependencies: [
    HorizontalRuleExtension,
    configExtension(DOMImportExtension, {rules: HorizontalRuleImportRules}),
  ],
  name: '@lexical/html/HorizontalRuleImport',
});
