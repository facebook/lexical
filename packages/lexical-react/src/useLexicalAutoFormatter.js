/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

 import {$createHeadingNode} from 'lexical/HeadingNode';
 import {$createListItemNode} from 'lexical/ListItemNode';
 import {$createListNode} from 'lexical/ListNode';
 import {$createQuoteNode} from 'lexical/QuoteNode';
 import {$isParagraphNode} from 'lexical/ParagraphNode';
 import {$isTextNode, $getSelection} from 'lexical';
 import {useEffect} from 'react';
 import type {EditorState, TextNode} from 'lexical';
 import type {ElementNode, LexicalEditor, Selection} from 'lexical';
 import type {HeadingTagType} from 'lexical/HeadingNode';
 import type {NodeKey, LexicalNode} from '../../lexical/src/core/LexicalNode';
 
 type TextNodeWithOffset = $ReadOnly<{
   node: TextNode,
   offset: number,
 }>;
 
 type AutoFormatTriggerState = $ReadOnly<{
   anchorOffset: number,
   isParentAParagraphNode: boolean,
   isSelectionCollapsed: boolean,
   isSimpleText: boolean,
   isTextNode: boolean,
   nodeKey: NodeKey,
   textContent: string,
 }>;
 
 type AutoFormatCriteria = $ReadOnly<{
   match: ?string,
   matchWithRegEx: boolean,
   requiresParagraphStart: ?boolean,
   headingTag: ?HeadingTagType,
   isBlockQuote: boolean,
   isUnorderedList: boolean,
   isOrderedList: boolean,
   regEx: RegExp,
   regExExpectedMatchCount: ?number,
 }>;
 
 type MatchResultContext = {
   text: string,
   textIndex: number,
   regExSupportingText: string,
 };
 
 type AutoFormatCriteriaArray = Array<AutoFormatCriteria>;
 
 const emptyRegExp = /(?:)/;
 
 const autoFormatBase: AutoFormatCriteria = {
   match: null,
   matchWithRegEx: false,
   requiresParagraphStart: false,
   headingTag: null,
   isBlockQuote: false,
   isUnorderedList: false,
   isOrderedList: false,
   regEx: emptyRegExp,
   regExExpectedMatchCount: null,
 };
 
 const paragraphStartBase: AutoFormatCriteria = {
   ...autoFormatBase,
   requiresParagraphStart: true,
 };
 
 const markdownHeader1: AutoFormatCriteria = {
   ...paragraphStartBase,
   match: '# ',
   headingTag: 'h1',
 };
 
 const markdownHeader2: AutoFormatCriteria = {
   ...paragraphStartBase,
   match: '## ',
   headingTag: 'h2',
 };
 
 const markdownHeader3: AutoFormatCriteria = {
   ...paragraphStartBase,
   match: '### ',
   headingTag: 'h3',
 };
 
 const markdownBlockQuote: AutoFormatCriteria = {
   ...paragraphStartBase,
   match: '> ',
   isBlockQuote: true,
 };
 
 const markdownUnorderedListDash: AutoFormatCriteria = {
   ...paragraphStartBase,
   match: '- ',
   isUnorderedList: true,
 };
 
 const markdownUnorderedListAsterisk: AutoFormatCriteria = {
   ...paragraphStartBase,
   match: '* ',
   isUnorderedList: true,
 };
 
 const markdownOrderedListAsterisk: AutoFormatCriteria = {
   ...paragraphStartBase,
   matchWithRegEx: true,
   isOrderedList: true,
   regEx: /^(\d+)\.\s/,
   regExExpectedMatchCount: 2 /*1: 'number. ' 2: 'number'*/,
 };
 
 const allAutoFormatCriteria = [
   markdownHeader1,
   markdownHeader2,
   markdownHeader3,
   markdownBlockQuote,
   markdownUnorderedListDash,
   markdownUnorderedListAsterisk,
   markdownOrderedListAsterisk,
 ];
 
 function updateTextNode(node: TextNode, count: number): void {
   const textNode = node.spliceText(0, count, '', true);
   if (textNode.getTextContent() === '') {
     textNode.selectPrevious();
     textNode.remove();
   }
 }
 
 function getMatchResultContextForCriteria(
   autoFormatCriteria: AutoFormatCriteria,
   textNodeWithOffset: TextNodeWithOffset,
 ): null | MatchResultContext {
   let shouldFormat = true;
   const matchResultContext: MatchResultContext = {
     text: '',
     textIndex: -1,
     regExSupportingText: '',
   };
 
   shouldFormat = textNodeWithOffset.node.getPreviousSibling() === null;
   if (
     shouldFormat &&
     autoFormatCriteria.requiresParagraphStart !== null &&
     autoFormatCriteria.requiresParagraphStart === true
   ) {
   }
   if (shouldFormat) {
     const text = textNodeWithOffset.node.getTextContent();
 
     if (autoFormatCriteria.matchWithRegEx === true) {
       const regExMatches = text.match(autoFormatCriteria.regEx);
       if (
         regExMatches !== null &&
         regExMatches.index === 0 &&
         autoFormatCriteria.regExExpectedMatchCount != null &&
         regExMatches.length === autoFormatCriteria.regExExpectedMatchCount
       ) {
         matchResultContext.textIndex = regExMatches.index;
         matchResultContext.text = regExMatches[0];
         matchResultContext.regExSupportingText =
           regExMatches.length > 1 ? regExMatches[1] : '';
       }
     } else if (autoFormatCriteria.match != null) {
       matchResultContext.textIndex = text.lastIndexOf(
         autoFormatCriteria.match,
         textNodeWithOffset.offset,
       );
       matchResultContext.text =
         autoFormatCriteria.match == null ? '' : autoFormatCriteria.match;
     }
 
     shouldFormat =
       matchResultContext.textIndex >= 0 &&
       matchResultContext.textIndex + matchResultContext.text.length ===
         textNodeWithOffset.offset;
 
     shouldFormat =
       shouldFormat &&
       (autoFormatCriteria.requiresParagraphStart == null ||
         matchResultContext.textIndex === 0);
   }
   return shouldFormat ? matchResultContext : null;
 }
 
 type AutoFormatCriteriaWithMatchResultContext = {
   autoFormatCriteria: null | AutoFormatCriteria,
   matchResultContext: null | MatchResultContext,
 };
 
 function getCriteriaWithMatchResultContext(
   textNodeWithOffset: TextNodeWithOffset,
   autoFormatCriteriaArray: AutoFormatCriteriaArray,
 ): AutoFormatCriteriaWithMatchResultContext {
   const count = autoFormatCriteriaArray.length;
   for (let i = 0; i < count; ++i) {
     const matchResultContext = getMatchResultContextForCriteria(
       autoFormatCriteriaArray[i],
       textNodeWithOffset,
     );
     if (matchResultContext != null) {
       return {
         autoFormatCriteria: autoFormatCriteriaArray[i],
         matchResultContext,
       };
     }
   }
   return {autoFormatCriteria: null, matchResultContext: null};
 }
 
 function getTextNodeForAutoFormatting(
   selection: null | Selection,
 ): null | TextNodeWithOffset {
   if (selection == null) {
     return null;
   }
 
   const node = selection.anchor.getNode();
 
   if (!$isTextNode(node)) {
     return null;
   }
   return {node, offset: selection.anchor.offset};
 }
 
 function getNewNodeForCriteria(
   autoFormatCriteria: AutoFormatCriteria,
   matchResultContext: MatchResultContext,
   children: Array<LexicalNode>,
 ): null | ElementNode {
   let newNode = null;
 
   if (autoFormatCriteria.headingTag != null) {
     newNode = $createHeadingNode(autoFormatCriteria.headingTag);
     newNode.append(...children);
     return newNode;
   }
 
   if (autoFormatCriteria.isBlockQuote === true) {
     newNode = $createQuoteNode();
     newNode.append(...children);
     return newNode;
   }
 
   if (autoFormatCriteria.isUnorderedList === true) {
     newNode = $createListNode('ul');
     const listItem = $createListItemNode();
     listItem.append(...children);
     newNode.append(listItem);
     return newNode;
   }
 
   if (autoFormatCriteria.isOrderedList === true) {
     const start = parseInt(matchResultContext.regExSupportingText, 10);
     newNode = $createListNode('ol', start);
     const listItem = $createListItemNode();
     listItem.append(...children);
     newNode.append(listItem);
     return newNode;
   }
 
   return newNode;
 }
 
 function transformTextNodeForAutoFormatCriteria(
   textNodeWithOffset: TextNodeWithOffset,
   autoFormatCriteria: AutoFormatCriteria,
   matchResultContext: MatchResultContext,
 ) {
   if (autoFormatCriteria.requiresParagraphStart) {
     const element = textNodeWithOffset.node.getParentOrThrow();
     updateTextNode(textNodeWithOffset.node, matchResultContext.text.length);
 
     const elementNode = getNewNodeForCriteria(
       autoFormatCriteria,
       matchResultContext,
       element.getChildren(),
     );
 
     if (elementNode !== null) {
       element.replace(elementNode);
     }
   }
 }
 
 function updateAutoFormatting(editor: LexicalEditor): void {
   editor.update(() => {
     const textNodeWithOffset = getTextNodeForAutoFormatting($getSelection());
 
     if (textNodeWithOffset === null) {
       return;
     }
 
     const criteriaWithMatchResultContext = getCriteriaWithMatchResultContext(
       textNodeWithOffset,
       allAutoFormatCriteria,
     );
 
     if (
       criteriaWithMatchResultContext.autoFormatCriteria === null ||
       criteriaWithMatchResultContext.matchResultContext === null
     ) {
       return;
     }
 
     transformTextNodeForAutoFormatCriteria(
       textNodeWithOffset,
       criteriaWithMatchResultContext.autoFormatCriteria,
       criteriaWithMatchResultContext.matchResultContext,
     );
   });
 }
 
 function shouldAttemptToAutoFormat(
   currentTriggerState: null | AutoFormatTriggerState,
   priorTriggerState: null | AutoFormatTriggerState,
   lastEditorState,
 ): boolean {
   if (currentTriggerState == null || priorTriggerState == null) {
     return false;
   }
 
   return (
     currentTriggerState.isTextNode &&
     currentTriggerState.isSimpleText &&
     currentTriggerState.isSelectionCollapsed &&
     currentTriggerState.isTextNode &&
     currentTriggerState.nodeKey === priorTriggerState.nodeKey &&
     currentTriggerState.anchorOffset !== priorTriggerState.anchorOffset &&
     currentTriggerState.textContent !== priorTriggerState.textContent
   );
 }
 
 function getTriggerState(
   editorState: EditorState,
 ): null | AutoFormatTriggerState {
   let criteria: null | AutoFormatTriggerState = null;
 
   editorState.read(() => {
     const selection = $getSelection();
     if (selection == null || !selection.isCollapsed()) {
       return;
     }
     const node = selection.anchor.getNode();
     const parentNode = node.getParent();
 
     criteria = {
       anchorOffset: selection.anchor.offset,
       isSelectionCollapsed: selection.isCollapsed(),
       isSimpleText: $isTextNode(node) && node.isSimpleText(),
       isTextNode: $isTextNode(node),
       isParentAParagraphNode:
         parentNode !== null && $isParagraphNode(parentNode),
       nodeKey: node.getKey(),
       textContent: node.getTextContent(),
     };
   });
 
   return criteria;
 }
 
 export default function useLexicalAutoFormatter(editor: LexicalEditor): void {
   useEffect(() => {
     let priorTriggerState: null | AutoFormatTriggerState = null;
     editor.addListener('update', ({tags}) => {
       if (tags.has('historic') === false) {
         const currentTriggerState = getTriggerState(editor.getEditorState());
 
         if (shouldAttemptToAutoFormat(currentTriggerState, priorTriggerState)) {
           updateAutoFormatting(editor);
         }
         priorTriggerState = currentTriggerState;
       } else {
         priorTriggerState = null;
       }
     });
   }, [editor]);
 }
 