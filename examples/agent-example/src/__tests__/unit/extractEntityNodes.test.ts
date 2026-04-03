/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getState,
  $isElementNode,
  $isTextNode,
  $setState,
  createState,
  DecoratorNode,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {
  $collectTextNodeOffsets,
  $replaceTextWithEntityNodes,
} from '../../utils/extractEntityNodes';

const labelState = createState('label', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});

// Minimal inline decorator node for testing replacements
class TestEntityNode extends DecoratorNode<string> {
  $config() {
    return this.config('test-entity', {
      extends: DecoratorNode,
      stateConfigs: [{flat: true, stateConfig: labelState}],
    });
  }

  getLabel(): string {
    return $getState(this, labelState);
  }

  setLabel(label: string): this {
    return $setState(this, labelState, label);
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return this.getLabel();
  }

  decorate(): string {
    return this.getLabel();
  }
}

function $createTestEntityNode(label: string): TestEntityNode {
  return $create(TestEntityNode).setLabel(label);
}

const TestEntityExtension = defineExtension({
  name: 'test-entity',
  nodes: () => [TestEntityNode],
});

function createTestEditor(): LexicalEditor {
  return buildEditorFromExtensions(TestEntityExtension);
}

function getTextContent(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => $getRoot().getTextContent());
}

function getChildTypes(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => {
    const paragraph = $getRoot().getFirstChildOrThrow();
    if (!$isElementNode(paragraph)) {
      return [];
    }
    return paragraph.getChildren().map((child: LexicalNode) => {
      if ($isTextNode(child)) {
        return `text:"${child.getTextContent()}"`;
      }
      return `entity:"${child.getTextContent()}"`;
    });
  });
}

const discrete = {discrete: true};

describe('extractEntityNodes', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createTestEditor();
    editor.update(() => {
      $getRoot().clear();
    }, discrete);
  });

  describe('$collectTextNodeOffsets', () => {
    test('collects offsets from a single paragraph', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Hello world')),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello world');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0].start).toBe(0);
      expect(result.textNodes[0].length).toBe(11);
    });

    test('collects offsets across multiple text nodes', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Hello '),
            $createTextNode('world').toggleFormat('bold'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello world');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
    });

    test('accounts for paragraph breaks', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Line one')),
          $createParagraphNode().append($createTextNode('Line two')),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Line one Line two');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 8, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 8, start: 9});
    });

    test('accounts for line break nodes', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Hello'),
            $createLineBreakNode(),
            $createTextNode('world'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nworld');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
    });

    test('accounts for tab nodes', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('col1'),
            $createTabNode(),
            $createTextNode('col2'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('col1\tcol2');
      expect(result.textNodes).toHaveLength(3);
      expect(result.textNodes[0]).toMatchObject({length: 4, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 1, start: 4});
      expect(result.textNodes[2]).toMatchObject({length: 4, start: 5});
    });

    test('accounts for inline decorator nodes', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Visit '),
            $createTestEntityNode('London'),
            $createTextNode(' today'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Visit London today');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 6, start: 12});
    });

    test('handles multiple line breaks in sequence', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            $createTextNode('b'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('a\n\nb');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 1, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 1, start: 3});
    });

    test('handles mixed content: text, line breaks, tabs, decorators', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Hello'),
            $createLineBreakNode(),
            $createTextNode('Visit '),
            $createTestEntityNode('London'),
            $createTabNode(),
            $createTextNode('end'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nVisit London\tend');
      expect(result.textNodes).toHaveLength(4);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 6, start: 6});
      expect(result.textNodes[2]).toMatchObject({length: 1, start: 18});
      expect(result.textNodes[3]).toMatchObject({length: 3, start: 19});
    });

    test('handles empty document', () => {
      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('');
      expect(result.textNodes).toHaveLength(0);
    });

    test('handles paragraph with only a line break', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createLineBreakNode()),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('\n');
      expect(result.textNodes).toHaveLength(0);
    });

    test('handles decorator node at start of paragraph', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTestEntityNode('London'),
            $createTextNode(' is great'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('London is great');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0]).toMatchObject({length: 9, start: 6});
    });

    test('handles decorator node at end of paragraph', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Visit '),
            $createTestEntityNode('London'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Visit London');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
    });

    test('handles multiple paragraphs with mixed node types', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Hello'),
            $createLineBreakNode(),
            $createTextNode('world'),
          ),
          $createParagraphNode().append(
            $createTestEntityNode('London'),
            $createTextNode(' calling'),
          ),
        );
      }, discrete);

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nworld London calling');
      expect(result.textNodes).toHaveLength(3);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
      expect(result.textNodes[2]).toMatchObject({length: 8, start: 18});
    });
  });

  describe('$replaceTextWithEntityNodes', () => {
    test('replaces a single entity in the middle of text', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London today')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [{end: 12, entity: 'LOC', start: 6, text: 'London'}],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getTextContent(editor)).toBe('Visit London today');
      expect(getChildTypes(editor)).toEqual([
        'text:"Visit "',
        'entity:"London"',
        'text:" today"',
      ]);
    });

    test('replaces entity at the start of text', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('London is great')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [{end: 6, entity: 'LOC', start: 0, text: 'London'}],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getChildTypes(editor)).toEqual([
        'entity:"London"',
        'text:" is great"',
      ]);
    });

    test('replaces entity at the end of text', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [{end: 12, entity: 'LOC', start: 6, text: 'London'}],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getChildTypes(editor)).toEqual([
        'text:"Visit "',
        'entity:"London"',
      ]);
    });

    test('replaces entity that spans the entire text node', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('London')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [{end: 6, entity: 'LOC', start: 0, text: 'London'}],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getChildTypes(editor)).toEqual(['entity:"London"']);
    });

    test('replaces multiple entities in the same text node', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('From London to Paris and back'),
          ),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [
            {end: 11, entity: 'LOC', start: 5, text: 'London'},
            {end: 20, entity: 'LOC', start: 15, text: 'Paris'},
          ],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getTextContent(editor)).toBe('From London to Paris and back');
      expect(getChildTypes(editor)).toEqual([
        'text:"From "',
        'entity:"London"',
        'text:" to "',
        'entity:"Paris"',
        'text:" and back"',
      ]);
    });

    test('replaces multiple entity types', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Bob in London at Meta'),
          ),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [
            {end: 3, entity: 'PER', start: 0, text: 'Bob'},
            {end: 13, entity: 'LOC', start: 7, text: 'London'},
            {end: 21, entity: 'ORG', start: 17, text: 'Meta'},
          ],
          {
            LOC: (text) => $createTestEntityNode(`loc:${text}`),
            ORG: (text) => $createTestEntityNode(`org:${text}`),
            PER: (text) => $createTestEntityNode(`per:${text}`),
          },
        );
      }, discrete);

      expect(getChildTypes(editor)).toEqual([
        'entity:"per:Bob"',
        'text:" in "',
        'entity:"loc:London"',
        'text:" at "',
        'entity:"org:Meta"',
      ]);
    });

    test('skips entities with unknown labels', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [{end: 12, entity: 'MISC', start: 6, text: 'London'}],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getChildTypes(editor)).toEqual(['text:"Visit London"']);
    });

    test('handles adjacent entities with no text between them', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('LondonParis')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [
            {end: 6, entity: 'LOC', start: 0, text: 'London'},
            {end: 11, entity: 'LOC', start: 6, text: 'Paris'},
          ],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getChildTypes(editor)).toEqual([
        'entity:"London"',
        'entity:"Paris"',
      ]);
    });

    test('handles entities across multiple paragraphs', () => {
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London')),
          $createParagraphNode().append($createTextNode('See Paris')),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      expect(textInfo.fullText).toBe('Visit London See Paris');

      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [
            {end: 12, entity: 'LOC', start: 6, text: 'London'},
            {end: 22, entity: 'LOC', start: 17, text: 'Paris'},
          ],
          {LOC: $createTestEntityNode},
        );
      }, discrete);

      expect(getTextContent(editor)).toBe('Visit London\n\nSee Paris');
    });

    test('realistic: multiple entity types in one text node', () => {
      const sampleText =
        'Lexical was created by Dominic Gannaway in London while working at Meta';
      editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode(sampleText)),
        );
      }, discrete);

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      editor.update(() => {
        $replaceTextWithEntityNodes(
          textInfo.textNodes,
          [
            {end: 39, entity: 'PER', start: 23, text: 'Dominic Gannaway'},
            {end: 49, entity: 'LOC', start: 43, text: 'London'},
            {end: 71, entity: 'ORG', start: 67, text: 'Meta'},
          ],
          {
            LOC: $createTestEntityNode,
            ORG: $createTestEntityNode,
            PER: $createTestEntityNode,
          },
        );
      }, discrete);

      expect(getTextContent(editor)).toBe(sampleText);
      expect(getChildTypes(editor)).toEqual([
        'text:"Lexical was created by "',
        'entity:"Dominic Gannaway"',
        'text:" in "',
        'entity:"London"',
        'text:" while working at "',
        'entity:"Meta"',
      ]);
    });
  });
});
