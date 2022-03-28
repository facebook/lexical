/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  AutoFormatCriteria,
  AutoFormatCriteriaArray,
  AutoFormatTrigger,
  AutoFormatTriggerState,
  PatternMatchResults,
  ScanningContext,
} from './lowLevelUtils';
import type {TextNodeWithOffset} from '@lexical/text';
import type {DecoratorNode, LexicalEditor} from 'lexical';

import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

import {
  allAutoFormatCriteria,
  allAutoFormatCriteriaForTextNodes,
  getPatternMatchResultsForParagraphs,
  getPatternMatchResultsForText,
  transformTextNodeForParagraphs,
  transformTextNodeForText,
  triggers,
} from './lowLevelUtils';

export function getAllTriggers(): Array<AutoFormatTrigger> {
  return triggers;
}

export function convertStringToLexical(
  text: string,
  editor: LexicalEditor,
): void {
  const nodes = text
    .split('\n')
    .map((splitText) =>
      $createParagraphNode().append($createTextNode(splitText)),
    );

  const root = $getRoot();
  root.clear();
  root.append(...nodes);
}

export function getAllAutoFormatCriteriaForTextNodes(): AutoFormatCriteriaArray {
  return allAutoFormatCriteriaForTextNodes;
}

export function getAllAutoFormatCriteria(): AutoFormatCriteriaArray {
  return allAutoFormatCriteria;
}

export function getInitialScanningContext(
  editor: LexicalEditor,
  textNodeWithOffset: TextNodeWithOffset,
  triggerState: AutoFormatTriggerState,
): ScanningContext {
  return {
    autoFormatCriteria: {
      autoFormatKind: 'noTransformation',
      regEx: /(?:)/, // Empty reg ex will do until the precise criteria is discovered.
      requiresParagraphStart: null,
    },
    editor,
    joinedText: null,
    patternMatchResults: {
      regExCaptureGroups: [],
    },
    textNodeWithOffset,
    triggerState,
  };
}

export function getPatternMatchResultsForCriteria(
  autoFormatCriteria: AutoFormatCriteria,
  scanningContext: ScanningContext,
): null | PatternMatchResults {
  if (
    autoFormatCriteria.requiresParagraphStart !== null &&
    autoFormatCriteria.requiresParagraphStart === true
  ) {
    return getPatternMatchResultsForParagraphs(
      autoFormatCriteria,
      scanningContext,
    );
  }
  return getPatternMatchResultsForText(autoFormatCriteria, scanningContext);
}

export function transformTextNodeForAutoFormatCriteria<T>(
  scanningContext: ScanningContext,
  createHorizontalRuleNode: () => DecoratorNode<T>,
) {
  if (scanningContext.autoFormatCriteria.requiresParagraphStart) {
    transformTextNodeForParagraphs(scanningContext, createHorizontalRuleNode);
  } else {
    transformTextNodeForText(scanningContext);
  }
}
