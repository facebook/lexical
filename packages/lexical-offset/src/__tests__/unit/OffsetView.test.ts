/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createOffsetView, type OffsetView} from '@lexical/offset';
import {
  $getNodeByKey,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import {NodeMapBuilder} from './helpers/NodeMapBuilder';

describe('OffsetView', () => {
  describe('createSelectionFromOffsets', () => {
    it('should return null when end offset is over text length', () => {
      const nodeMapBuilder = new NodeMapBuilder();
      const nodeMap = nodeMapBuilder
        .addRootNode()
        .addParagraphNode()
        .addTextNode('text')
        .build();
      const offsetView: OffsetView = $arrangeOffsetView(nodeMap);

      const selection = offsetView.createSelectionFromOffsets(0, 6);

      expect(selection).toBeNull();
    });

    it('should return null when start offset is over text length', () => {
      const nodeMapBuilder = new NodeMapBuilder();
      const nodeMap = nodeMapBuilder
        .addRootNode()
        .addParagraphNode()
        .addTextNode('text')
        .build();
      const offsetView: OffsetView = $arrangeOffsetView(nodeMap);

      const selection = offsetView.createSelectionFromOffsets(6, 0);

      expect(selection).toBeNull();
    });

    it('should return null when start node cannot be found by its key', () => {
      const nodeMapBuilder = new NodeMapBuilder();
      const nodeMap = nodeMapBuilder
        .addRootNode()
        .addParagraphNode()
        .addTextNode('text')
        .addTextNode('some more text', 'textNodeCanBeFound')
        .build();
      ($getNodeByKey as jest.Mock).mockImplementation((key) => {
        if (key === 'textNodeCanBeFound') {
          return nodeMap.get(key);
        }
        return null;
      });
      const offsetView: OffsetView = $arrangeOffsetView(nodeMap, false);

      const selection = offsetView.createSelectionFromOffsets(0, 10);

      expect(selection).toBeNull();
    });

    it('should return selection with anchor being same as focus when start offset is same as end offset', () => {
      const nodeMapBuilder = new NodeMapBuilder();
      const nodeMap = nodeMapBuilder
        .addRootNode()
        .addParagraphNode()
        .addTextNode('text', 'targetNode')
        .build();
      const offsetView: OffsetView = $arrangeOffsetView(nodeMap);

      const selection = offsetView.createSelectionFromOffsets(0, 0);

      expect(selection).toBeTruthy();

      if (!selection) {
        throw new Error('Selection is null');
      }

      expect(selection.anchor.key).toBe('targetNode');
      expect(selection.anchor.key).toEqual(selection.focus.key);
      expect(selection.anchor.offset).toBe(0);
      expect(selection.anchor.offset).toEqual(selection.focus.offset);
      expect(selection.anchor.type).toBe('text');
      expect(selection.anchor.type).toEqual(selection.focus.type);
    });
  });
});

function $arrangeOffsetView(
  nodeMap: Map<string, LexicalNode>,
  doArrangeGetNodeByKey: boolean = true,
): OffsetView {
  if (doArrangeGetNodeByKey) {
    ($getNodeByKey as jest.Mock).mockImplementation((key) => {
      return nodeMap.get(key);
    });
  }
  const editorState = {
    _nodeMap: nodeMap,
  } as EditorState;
  const editor = {} as LexicalEditor;
  const offsetView: OffsetView = $createOffsetView(editor, 1, editorState);
  return offsetView;
}

jest.mock('lexical', () => {
  const actual = jest.requireActual('lexical');
  return {
    ...actual,
    $createRangeSelection: jest.fn(() => {
      // Have to do this as checks on PointType's set would require an active state...
      const createPointStub = () => {
        const pointStub = {
          key: '',
          offset: -1,
          set: (key: string, offset: number, type: string) => {},
          type: 'element',
        };
        pointStub.set = (key: string, offset: number, type: string) => {
          pointStub.key = key;
          pointStub.offset = offset;
          pointStub.type = type;
        };
        return pointStub;
      };

      return {
        anchor: createPointStub(),
        focus: createPointStub(),
      };
    }),
    $getNodeByKey: jest.fn(),
    $isElementNode: jest.fn((node) => {
      return node.__type === 'element' || node.__type === 'paragraph';
    }),
    $isTextNode: jest.fn((node) => {
      return node.__type === 'text';
    }),
  };
});
