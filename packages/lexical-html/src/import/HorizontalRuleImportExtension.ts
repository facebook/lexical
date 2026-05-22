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

import {CoreImportExtension} from './CoreImportExtension';
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
 * Bundles {@link HorizontalRuleImportRules} (plus
 * {@link CoreImportExtension}) into a single dependency. The legacy
 * {@link HorizontalRuleExtension.importDOM} continues to work in parallel;
 * depend on this extension to opt into the new pipeline.
 *
 * Lives in `@lexical/html` (not `@lexical/extension`) because
 * {@link DOMImportExtension} itself is in `@lexical/html`, and
 * `@lexical/extension` is upstream of `@lexical/html` in the dependency
 * graph — same arrangement as {@link CoreImportExtension}.
 *
 * @experimental
 */
export const HorizontalRuleImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    HorizontalRuleExtension,
    configExtension(DOMImportExtension, {rules: HorizontalRuleImportRules}),
  ],
  name: '@lexical/html/HorizontalRuleImport',
});
