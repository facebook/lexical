/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, DecoratorTextNode} from '@lexical/extension';
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
  defineExtension,
  LexicalEditorWithDispose,
  LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $collectTextNodeOffsets,
  $replaceTextWithEntityNodes,
  replaceWithEntity,
} from '../../utils/extractEntityNodes';

const labelState = createState('label', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});

// Minimal inline decorator node for testing replacements
class TestEntityNode extends DecoratorTextNode {
  $config() {
    return this.config('test-entity', {
      extends: DecoratorTextNode,
      stateConfigs: [{flat: true, stateConfig: labelState}],
    });
  }

  getLabel(): string {
    return $getState(this, labelState);
  }

  setLabel(label: string): this {
    return $setState(this, labelState, label);
  }

  getTextContent(): string {
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

function createTestEditor(
  $initialEditorState?: () => void,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState,
      dependencies: [TestEntityExtension],
      name: 'test-root',
      namespace: 'test',
    }),
  );
}

function getTextContent(editor: LexicalEditorWithDispose): string {
  return editor.read(() => $getRoot().getTextContent());
}

function getChildTypes(editor: LexicalEditorWithDispose): string[] {
  return editor.read(() => {
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
  describe('$collectTextNodeOffsets', () => {
    test('collects offsets from a single paragraph', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Hello world')),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello world');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0].start).toBe(0);
      expect(result.textNodes[0].length).toBe(11);
    });

    test('collects offsets across multiple text nodes', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Hello '),
            $createTextNode('world').toggleFormat('bold'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello world');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
    });

    test('accounts for paragraph breaks', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Line one')),
          $createParagraphNode().append($createTextNode('Line two')),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Line one Line two');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 8, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 8, start: 9});
    });

    test('accounts for line break nodes', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Hello'),
            $createLineBreakNode(),
            $createTextNode('world'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nworld');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
    });

    test('accounts for tab nodes', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('col1'),
            $createTabNode(),
            $createTextNode('col2'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('col1\tcol2');
      expect(result.textNodes).toHaveLength(3);
      expect(result.textNodes[0]).toMatchObject({length: 4, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 1, start: 4});
      expect(result.textNodes[2]).toMatchObject({length: 4, start: 5});
    });

    test('accounts for inline decorator nodes', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Visit '),
            $createTestEntityNode('London'),
            $createTextNode(' today'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Visit London today');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 6, start: 12});
    });

    test('handles multiple line breaks in sequence', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            $createTextNode('b'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('a\n\nb');
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0]).toMatchObject({length: 1, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 1, start: 3});
    });

    test('handles mixed content: text, line breaks, tabs, decorators', () => {
      using editor = createTestEditor(() => {
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
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nVisit London\tend');
      expect(result.textNodes).toHaveLength(4);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 6, start: 6});
      expect(result.textNodes[2]).toMatchObject({length: 1, start: 18});
      expect(result.textNodes[3]).toMatchObject({length: 3, start: 19});
    });

    test('handles empty document', () => {
      using editor = createTestEditor();
      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('');
      expect(result.textNodes).toHaveLength(0);
    });

    test('handles paragraph with only a line break', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('\n');
      expect(result.textNodes).toHaveLength(0);
    });

    test('handles decorator node at start of paragraph', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTestEntityNode('London'),
            $createTextNode(' is great'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('London is great');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0]).toMatchObject({length: 9, start: 6});
    });

    test('handles decorator node at end of paragraph', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Visit '),
            $createTestEntityNode('London'),
          ),
        );
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Visit London');
      expect(result.textNodes).toHaveLength(1);
      expect(result.textNodes[0]).toMatchObject({length: 6, start: 0});
    });

    test('handles multiple paragraphs with mixed node types', () => {
      using editor = createTestEditor(() => {
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
      });

      const result = editor.read($collectTextNodeOffsets);
      expect(result.fullText).toBe('Hello\nworld London calling');
      expect(result.textNodes).toHaveLength(3);
      expect(result.textNodes[0]).toMatchObject({length: 5, start: 0});
      expect(result.textNodes[1]).toMatchObject({length: 5, start: 6});
      expect(result.textNodes[2]).toMatchObject({length: 8, start: 18});
    });
  });

  describe('$replaceTextWithEntityNodes', () => {
    test('replaces a single entity in the middle of text', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London today')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [{end: 12, entity: 'LOC', start: 6, text: 'London'}],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getTextContent(editor)).toBe('Visit London today');
      expect(getChildTypes(editor)).toEqual([
        'text:"Visit "',
        'entity:"London"',
        'text:" today"',
      ]);
    });

    test('replaces entity at the start of text', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('London is great')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [{end: 6, entity: 'LOC', start: 0, text: 'London'}],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getChildTypes(editor)).toEqual([
        'entity:"London"',
        'text:" is great"',
      ]);
    });

    test('replaces entity at the end of text', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [{end: 12, entity: 'LOC', start: 6, text: 'London'}],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getChildTypes(editor)).toEqual([
        'text:"Visit "',
        'entity:"London"',
      ]);
    });

    test('replaces entity that spans the entire text node', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('London')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [{end: 6, entity: 'LOC', start: 0, text: 'London'}],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getChildTypes(editor)).toEqual(['entity:"London"']);
    });

    test('replaces multiple entities in the same text node', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('From London to Paris and back'),
          ),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [
              {end: 11, entity: 'LOC', start: 5, text: 'London'},
              {end: 20, entity: 'LOC', start: 15, text: 'Paris'},
            ],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

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
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Bob in London at Meta'),
          ),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [
              {end: 3, entity: 'PER', start: 0, text: 'Bob'},
              {end: 13, entity: 'LOC', start: 7, text: 'London'},
              {end: 21, entity: 'ORG', start: 17, text: 'Meta'},
            ],
            {
              LOC: replaceWithEntity((text) =>
                $createTestEntityNode(`loc:${text}`),
              ),
              ORG: replaceWithEntity((text) =>
                $createTestEntityNode(`org:${text}`),
              ),
              PER: replaceWithEntity((text) =>
                $createTestEntityNode(`per:${text}`),
              ),
            },
          );
        },
        {discrete: true},
      );

      expect(getChildTypes(editor)).toEqual([
        'entity:"per:Bob"',
        'text:" in "',
        'entity:"loc:London"',
        'text:" at "',
        'entity:"org:Meta"',
      ]);
    });

    test('skips entities with unknown labels', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [{end: 12, entity: 'MISC', start: 6, text: 'London'}],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getChildTypes(editor)).toEqual(['text:"Visit London"']);
    });

    test('handles adjacent entities with no text between them', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('LondonParis')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [
              {end: 6, entity: 'LOC', start: 0, text: 'London'},
              {end: 11, entity: 'LOC', start: 6, text: 'Paris'},
            ],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getChildTypes(editor)).toEqual([
        'entity:"London"',
        'entity:"Paris"',
      ]);
    });

    test('handles entities across multiple paragraphs', () => {
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Visit London')),
          $createParagraphNode().append($createTextNode('See Paris')),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      expect(textInfo.fullText).toBe('Visit London See Paris');

      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [
              {end: 12, entity: 'LOC', start: 6, text: 'London'},
              {end: 22, entity: 'LOC', start: 17, text: 'Paris'},
            ],
            {LOC: replaceWithEntity($createTestEntityNode)},
          );
        },
        {discrete: true},
      );

      expect(getTextContent(editor)).toBe('Visit London\n\nSee Paris');
    });

    test('realistic: multiple entity types in one text node', () => {
      const sampleText =
        'Lexical was created by Dominic Gannaway in London while working at Meta';
      using editor = createTestEditor(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode(sampleText)),
        );
      });

      const textInfo = editor.read($collectTextNodeOffsets);
      editor.update(
        () => {
          $replaceTextWithEntityNodes(
            textInfo.textNodes,
            [
              {end: 39, entity: 'PER', start: 23, text: 'Dominic Gannaway'},
              {end: 49, entity: 'LOC', start: 43, text: 'London'},
              {end: 71, entity: 'ORG', start: 67, text: 'Meta'},
            ],
            {
              LOC: replaceWithEntity($createTestEntityNode),
              ORG: replaceWithEntity($createTestEntityNode),
              PER: replaceWithEntity($createTestEntityNode),
            },
          );
        },
        {discrete: true},
      );

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
