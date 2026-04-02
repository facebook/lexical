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
  type EntitySpan,
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

describe('extractEntityNodes', () => {
  let editor: LexicalEditor;

  beforeEach(async () => {
    editor = createTestEditor();
    await editor.update(() => {
      $getRoot().clear();
    });
  });

  describe('$collectTextNodeOffsets', () => {
    test('collects offsets from a single paragraph', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('Hello world'));
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello world');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0].start).toBe(0);
      expect(result.textNodes[0].length).toBe(11);
    });

    test('collects offsets across multiple text nodes', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        // Use different formats to prevent Lexical from merging them
        const t1 = $createTextNode('Hello ');
        const t2 = $createTextNode('world').toggleFormat('bold');
        p.append(t1, t2);
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello world');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
    });

    test('accounts for paragraph breaks', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p1 = $createParagraphNode();
        p1.append($createTextNode('Line one'));
        const p2 = $createParagraphNode();
        p2.append($createTextNode('Line two'));
        root.append(p1, p2);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      // Blocks are joined with a single space (not \n\n from getTextContent)
      expect(result.fullText).toBe('Line one Line two');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 8, start: 0});
      // After "Line one" (8 chars) + space separator (1 char) = start at 9
      expect(result.textNodes[1]).toMatchObject({length: 8, start: 9});
    });

    test('accounts for line break nodes', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append(
          $createTextNode('Hello'),
          $createLineBreakNode(),
          $createTextNode('world'),
        );
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nworld');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      // After "Hello" (5) + "\n" (1) = start at 6
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
    });

    test('accounts for tab nodes', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append(
          $createTextNode('col1'),
          $createTabNode(),
          $createTextNode('col2'),
        );
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('col1\tcol2');
      expect(result.textNodes).toHaveLength(3);
      expect(result.textNodes[0]).toMatchObject({length: 4, start: 0});
      // TabNode extends TextNode so it appears in textNodes
      expect(result.textNodes[1]).toMatchObject({length: 1, start: 4});
      expect(result.textNodes[2]).toMatchObject({length: 4, start: 5});
    });

    test('accounts for inline decorator nodes', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append(
          $createTextNode('Visit '),
          $createTestEntityNode('London'),
          $createTextNode(' today'),
        );
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      // Decorator text content is included in fullText for correct offsets
      expect(result.fullText).toBe('Visit London today');
      // But decorator nodes are not in textNodes (they can't be split)
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
      // After "Visit " (6) + "London" (6) = start at 12
      expect(result.textNodes[1]).toMatchObject({length: 6, start: 12});
    });

    test('handles multiple line breaks in sequence', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append(
          $createTextNode('a'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createTextNode('b'),
        );
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('a\n\nb');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 1, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 1, start: 3});
    });

    test('handles mixed content: text, line breaks, tabs, decorators', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append(
          $createTextNode('Hello'),
          $createLineBreakNode(),
          $createTextNode('Visit '),
          $createTestEntityNode('London'),
          $createTabNode(),
          $createTextNode('end'),
        );
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nVisit London\tend');
      expect(result.textNodes).toHaveLength(4);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0}); // "Hello"
      expect(result.textNodes[1]).toMatchObject({length: 6, start: 6}); // "Visit "
      // "London" (decorator, 6 chars) is skipped in textNodes
      expect(result.textNodes[2]).toMatchObject({length: 1, start: 18}); // "\t" (TabNode)
      expect(result.textNodes[3]).toMatchObject({length: 3, start: 19}); // "end"
    });

    test('handles empty document', async () => {
      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('');
      expect(result.textNodes).toHaveLength(0);
    });

    test('handles paragraph with only a line break', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createLineBreakNode());
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('\n');
      expect(result.textNodes).toHaveLength(0);
    });

    test('handles decorator node at start of paragraph', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTestEntityNode('London'), $createTextNode(' is great'));
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('London is great');
      expect(result.textNodes).toHaveLength(1);
      // "London" (6) from decorator, then text starts at 6
      expect(result.textNodes[0]).toMatchObject({length: 9, start: 6});
    });

    test('handles decorator node at end of paragraph', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('Visit '), $createTestEntityNode('London'));
        root.append(p);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Visit London');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
    });

    test('handles multiple paragraphs with mixed node types', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p1 = $createParagraphNode();
        p1.append(
          $createTextNode('Hello'),
          $createLineBreakNode(),
          $createTextNode('world'),
        );
        const p2 = $createParagraphNode();
        p2.append($createTestEntityNode('London'), $createTextNode(' calling'));
        root.append(p1, p2);
      });

      const result = editor.getEditorState().read($collectTextNodeOffsets);
      // p1: "Hello\nworld" (11), space separator (1), p2: "London calling" (14)
      expect(result.fullText).toBe('Hello\nworld London calling');
      expect(result.textNodes).toHaveLength(3);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0}); // "Hello"
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6}); // "world"
      // space (1) + "London" decorator (6) = start at 18
      expect(result.textNodes[2]).toMatchObject({length: 8, start: 18}); // " calling"
    });
  });

  describe('$replaceTextWithEntityNodes', () => {
    test('replaces a single entity in the middle of text', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('Visit London today'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 12, entity: 'LOC', start: 6, text: 'London'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getTextContent(editor)).toBe('Visit London today');
      expect(getChildTypes(editor)).toEqual([
        'text:"Visit "',
        'entity:"London"',
        'text:" today"',
      ]);
    });

    test('replaces entity at the start of text', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('London is great'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 6, entity: 'LOC', start: 0, text: 'London'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getChildTypes(editor)).toEqual([
        'entity:"London"',
        'text:" is great"',
      ]);
    });

    test('replaces entity at the end of text', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('Visit London'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 12, entity: 'LOC', start: 6, text: 'London'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getChildTypes(editor)).toEqual([
        'text:"Visit "',
        'entity:"London"',
      ]);
    });

    test('replaces entity that spans the entire text node', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('London'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 6, entity: 'LOC', start: 0, text: 'London'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getChildTypes(editor)).toEqual(['entity:"London"']);
    });

    test('replaces multiple entities in the same text node', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('From London to Paris and back'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 11, entity: 'LOC', start: 5, text: 'London'},
        {end: 20, entity: 'LOC', start: 15, text: 'Paris'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getTextContent(editor)).toBe('From London to Paris and back');
      expect(getChildTypes(editor)).toEqual([
        'text:"From "',
        'entity:"London"',
        'text:" to "',
        'entity:"Paris"',
        'text:" and back"',
      ]);
    });

    test('replaces multiple entity types', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('Bob in London at Meta'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 3, entity: 'PER', start: 0, text: 'Bob'},
        {end: 13, entity: 'LOC', start: 7, text: 'London'},
        {end: 21, entity: 'ORG', start: 17, text: 'Meta'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: (text) => $createTestEntityNode(`loc:${text}`),
          ORG: (text) => $createTestEntityNode(`org:${text}`),
          PER: (text) => $createTestEntityNode(`per:${text}`),
        });
      });

      expect(getChildTypes(editor)).toEqual([
        'entity:"per:Bob"',
        'text:" in "',
        'entity:"loc:London"',
        'text:" at "',
        'entity:"org:Meta"',
      ]);
    });

    test('skips entities with unknown labels', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('Visit London'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 12, entity: 'MISC', start: 6, text: 'London'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getChildTypes(editor)).toEqual(['text:"Visit London"']);
    });

    test('handles adjacent entities with no text between them', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode('LondonParis'));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 6, entity: 'LOC', start: 0, text: 'London'},
        {end: 11, entity: 'LOC', start: 6, text: 'Paris'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      expect(getChildTypes(editor)).toEqual([
        'entity:"London"',
        'entity:"Paris"',
      ]);
    });

    test('handles entities across multiple paragraphs', async () => {
      await editor.update(() => {
        const root = $getRoot();
        const p1 = $createParagraphNode();
        p1.append($createTextNode('Visit London'));
        const p2 = $createParagraphNode();
        p2.append($createTextNode('See Paris'));
        root.append(p1, p2);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      // "Visit London See Paris" (blocks joined with single space)
      expect(textInfo.fullText).toBe('Visit London See Paris');
      const entities: EntitySpan[] = [
        {end: 12, entity: 'LOC', start: 6, text: 'London'},
        {end: 22, entity: 'LOC', start: 17, text: 'Paris'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
        });
      });

      // getTextContent still uses Lexical's \n\n between paragraphs
      expect(getTextContent(editor)).toBe('Visit London\n\nSee Paris');
    });

    test('realistic: multiple entity types in one text node', async () => {
      const sampleText =
        'Lexical was created by Dominic Gannaway in London while working at Meta';
      await editor.update(() => {
        const root = $getRoot();
        const p = $createParagraphNode();
        p.append($createTextNode(sampleText));
        root.append(p);
      });

      const textInfo = editor.getEditorState().read($collectTextNodeOffsets);
      const entities: EntitySpan[] = [
        {end: 39, entity: 'PER', start: 23, text: 'Dominic Gannaway'},
        {end: 49, entity: 'LOC', start: 43, text: 'London'},
        {end: 71, entity: 'ORG', start: 67, text: 'Meta'},
      ];

      await editor.update(() => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: $createTestEntityNode,
          ORG: $createTestEntityNode,
          PER: $createTestEntityNode,
        });
      });

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
