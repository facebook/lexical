/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor, LexicalNode, PointType} from 'lexical';

import {$isLinkNode} from '@lexical/link';
import {
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';

import {
  printDetailProperties,
  printFormatProperties,
  printModeProperties,
  printRelProperties,
  printTargetProperties,
  printTextFormatProperties,
  printTitleProperties,
} from '../generateContent';

export type CollapsibleNodeTree = {
  children: CollapsibleNodeTree[];
  id: string;
  name: string;
  parent: null | CollapsibleNodeTree;
};

export type NodePropDetails = {
  [key: string]: string | number | boolean | null;
};

export type SelectionPropDetails = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export function createNodeTreeFromLexicalNode(
  lexicalNode: LexicalNode,
): CollapsibleNodeTree {
  const newChildren: CollapsibleNodeTree[] = [];

  if ($isElementNode(lexicalNode)) {
    const childNodes = lexicalNode.getChildren();

    childNodes.forEach((childNode, i) => {
      newChildren.push(createNodeTreeFromLexicalNode(childNode));
    });
  }

  const currentNode: CollapsibleNodeTree = {
    children: newChildren,
    id: lexicalNode.getKey(),
    name: lexicalNode.getType() || 'Unknown',
    parent: null,
  };
  return currentNode;
}

export function getTreeNodePropDetails(
  editor: LexicalEditor,
  keyID: string,
): string | null {
  if (keyID === '') {
    return null;
  }

  const editorState = editor.getEditorState();

  return editorState.read(() => {
    const selectedNode = editorState._nodeMap.get(keyID);
    if (selectedNode == null) {
      return null;
    }

    const self = selectedNode.getLatest();

    const propDetails = {
      classname: selectedNode.constructor.name,
    } as NodePropDetails;

    // map all props from node to propDetails
    Object.entries(self).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return;
      }

      switch (key) {
        // cutting off system props
        case '__parent':
        case '__next':
        case '__prev':
        case '__first':
        case '__last':
        case '__cachedText':
          break;

        case '__format':
          if ($isTextNode(self)) {
            propDetails[key] = printFormatProperties(self).replace(
              'format: ',
              '',
            );
          } else if ($isParagraphNode(self)) {
            propDetails[key] = printTextFormatProperties(self).replace(
              'format: ',
              '',
            );
          }
          break;

        case '__detail':
          if ($isTextNode(self)) {
            propDetails[key] = printDetailProperties(self).replace(
              'detail: ',
              '',
            );
          }
          break;

        case '__mode':
          if ($isTextNode(self)) {
            propDetails[key] = printModeProperties(self).replace('mode: ', '');
          }
          break;

        case '__target':
          if ($isLinkNode(self)) {
            const v = printTargetProperties(self);
            if (v != null) {
              propDetails[key] = v.replace('target: ', '');
            }
          }
          break;

        case '__rel':
          if ($isLinkNode(self)) {
            const v = printRelProperties(self);
            if (v != null) {
              propDetails[key] = v.replace('rel: ', '');
            }
          }
          break;

        case '__title':
          if ($isLinkNode(self)) {
            const v = printTitleProperties(self);
            if (v != null) {
              propDetails[key] = v.replace('title: ', '');
            }
          }
          break;

        default:
          propDetails[key] = value;
      }
    });
    return JSON.stringify(propDetails);
  });
}

export function prepareEditorSelection(editorState: EditorState): string {
  return editorState.read(() => {
    const selection = $getSelection();
    if (selection == null) {
      return '';
    }

    const selectionDetails = {} as SelectionPropDetails;

    if ($isRangeSelection(selection)) {
      selectionDetails.type = 'range';
      const anchor = selection.anchor;
      const focus = selection.focus;
      const anchorOffset = anchor.offset;
      const focusOffset = focus.offset;

      selectionDetails.focus = {
        key: focus.key,
        offset: focusOffset,
        type: focus.type,
      };
      selectionDetails.anchor = {
        key: anchor.key,
        offset: anchorOffset,
        type: anchor.type,
      };
    } else if (
      'tableKey' in selection &&
      'anchor' in selection &&
      'focus' in selection
    ) {
      // duck type TableSelection
      const anchor = selection.anchor as PointType;
      const focus = selection.focus as PointType;

      selectionDetails.type = 'table';
      selectionDetails.tableKey = selection.tableKey;
      selectionDetails.anchorCell = anchor != null ? anchor.key : null;
      selectionDetails.focusCell = focus != null ? focus.key : null;
    } else if ($isNodeSelection(selection)) {
      selectionDetails.type = 'node';
      selectionDetails.node = Array.from(selection._nodes).join(', ');
    }
    return JSON.stringify(selectionDetails);
  });
}
