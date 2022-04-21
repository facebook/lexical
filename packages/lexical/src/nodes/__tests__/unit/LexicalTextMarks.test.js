/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';

describe('LexicalTextMarks tests', () => {
  const setupTestCase = (marks, cb, finishCb) => {
    const editor = createTestEditor();
    const domElement = document.createElement('div');
    editor.setRootElement(domElement);

    editor.update(
      () => {
        const root = $getRoot();
        const element = $createParagraphNode();
        const textNode = $createTextNode('hello world');
        element.append(textNode);
        root.append(element);
        for (const mark of marks) {
          textNode.setMark(mark.id, mark.start, mark.end);
        }
        cb(textNode);
      },
      {
        onUpdate: () => {
          if (finishCb) {
            editor.getEditorState().read(() => {
              finishCb();
            });
          }
        },
      },
    );
  };

  describe('Normalization', () => {
    test('Can handle text node merging (before)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(
        testMarks,
        (textNode) => {
          const sibling = $createTextNode('123');
          textNode.insertBefore(sibling);
        },
        () => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant();
          expect(textNode.getTextContent()).toBe('123hello world');
          expect(textNode.getMark('foo')).toEqual({
            end: 6,
            id: 'foo',
            start: 4,
          });
        },
      );
    });

    test('Can handle text node merging + extra marks (before)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(
        testMarks,
        (textNode) => {
          const sibling = $createTextNode('123');
          sibling.setMark('bar', 1, 2);
          textNode.insertBefore(sibling);
        },
        () => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant();
          expect(textNode.getTextContent()).toBe('123hello world');
          expect(textNode.getMark('foo')).toEqual({
            end: 6,
            id: 'foo',
            start: 4,
          });
          expect(textNode.getMark('bar')).toEqual({
            end: 2,
            id: 'bar',
            start: 1,
          });
        },
      );
    });

    test('Can handle text node merging (after)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(
        testMarks,
        (textNode) => {
          const sibling = $createTextNode('123');
          textNode.insertAfter(sibling);
        },
        () => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant();
          expect(textNode.getTextContent()).toBe('hello world123');
          expect(textNode.getMark('foo')).toEqual({
            end: 3,
            id: 'foo',
            start: 1,
          });
        },
      );
    });

    test('Can handle text node merging + extra marks (after)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(
        testMarks,
        (textNode) => {
          const sibling = $createTextNode('123');
          sibling.setMark('bar', 1, 2);
          textNode.insertAfter(sibling);
        },
        () => {
          const root = $getRoot();
          const textNode = root.getFirstDescendant();
          expect(textNode.getTextContent()).toBe('hello world123');
          expect(textNode.getMark('foo')).toEqual({
            end: 3,
            id: 'foo',
            start: 1,
          });
          expect(textNode.getMark('bar')).toEqual({
            end: 13,
            id: 'bar',
            start: 12,
          });
        },
      );
    });
  });

  describe('splitText', () => {
    test('Can handle splitText of the entire mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        const [a, b, c] = textNode.splitText(1, 3);
        expect(a.getTextContent()).toBe('h');
        expect(a.getMark('foo')).toEqual(null);
        expect(b.getTextContent()).toBe('el');
        expect(b.getMark('foo')).toEqual({end: 2, id: 'foo', start: 0});
        expect(c.getTextContent()).toBe('lo world');
        expect(c.getMark('foo')).toEqual(null);
      });
    });

    test('Can handle splitText before the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        const [a, b] = textNode.splitText(1);
        expect(a.getTextContent()).toBe('h');
        expect(a.getMark('foo')).toEqual(null);
        expect(b.getTextContent()).toBe('ello world');
        expect(b.getMark('foo')).toEqual({end: 2, id: 'foo', start: 0});
      });
    });

    test('Can handle splitText after the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        const [a, b] = textNode.splitText(4);
        expect(a.getTextContent()).toBe('hell');
        expect(a.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        expect(b.getTextContent()).toBe('o world');
        expect(b.getMark('foo')).toEqual(null);
      });
    });

    test('Can handle splitText between the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        const [a, b] = textNode.splitText(2);
        expect(a.getTextContent()).toBe('he');
        expect(a.getMark('foo')).toEqual({end: null, id: 'foo', start: 1});
        expect(b.getTextContent()).toBe('llo world');
        expect(b.getMark('foo')).toEqual({end: 1, id: 'foo', start: null});
      });
    });

    test('Can handle splitText between a larger mark', () => {
      const testMarks = [{end: 6, id: 'foo', start: 2}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 6, id: 'foo', start: 2});
        const [a, b, c] = textNode.splitText(3, 5);
        expect(a.getTextContent()).toBe('hel');
        expect(a.getMark('foo')).toEqual({end: null, id: 'foo', start: 2});
        expect(b.getTextContent()).toBe('lo');
        expect(b.getMark('foo')).toEqual(null);
        expect(c.getTextContent()).toBe(' world');
        expect(c.getMark('foo')).toEqual({end: 1, id: 'foo', start: null});
      });
    });

    test('Can handle splitText before and including entire mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        const [a, b] = textNode.splitText(3);
        expect(a.getTextContent()).toBe('hel');
        expect(a.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        expect(b.getTextContent()).toBe('lo world');
        expect(b.getMark('foo')).toEqual(null);
      });
    });
  });

  describe('spliceText', () => {
    test('Can handle spliceText (before)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(0, 0, '123');
        expect(textNode.getTextContent()).toBe('123hello world');
        expect(textNode.getMark('foo')).toEqual({end: 6, id: 'foo', start: 4});
        textNode.spliceText(0, 3, '123');
        expect(textNode.getMark('foo')).toEqual({end: 6, id: 'foo', start: 4});
        textNode.spliceText(0, 3, '');
        expect(textNode.getTextContent()).toBe('hello world');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(0, 1, 'y');
        expect(textNode.getTextContent()).toBe('yello world');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(0, 2, 'ha');
        expect(textNode.getTextContent()).toBe('hallo world');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 2});
        textNode.spliceText(0, 5, 'goodbye');
        expect(textNode.getTextContent()).toBe('goodbye world');
        expect(textNode.getMark('foo')).toEqual(null);
      });
    });

    test('Can handle spliceText (inside)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(2, 0, '123');
        expect(textNode.getTextContent()).toBe('he123llo world');
        expect(textNode.getMark('foo')).toEqual({end: 6, id: 'foo', start: 1});
      });
    });

    test('Can handle spliceText (after)', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(5, 0, '123');
        expect(textNode.getTextContent()).toBe('hello123 world');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(4, 4, 'o');
        expect(textNode.getTextContent()).toBe('hello world');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(3, 2, 'lo');
        expect(textNode.getTextContent()).toBe('hello world');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.spliceText(2, 3, 'llo');
        expect(textNode.getTextContent()).toBe('hello world');
        expect(textNode.getMark('foo')).toEqual({end: 2, id: 'foo', start: 1});
        textNode.spliceText(1, 4, 'ello');
        expect(textNode.getTextContent()).toBe('hello world');
        expect(textNode.getMark('foo')).toEqual(null);
      });
    });
  });

  describe('setTextContent', () => {
    test('Can handle altering text before the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.setTextContent('123hello world');
        expect(textNode.getTextContent()).toBe('123hello world');
        expect(textNode.getMark('foo')).toEqual({end: 6, id: 'foo', start: 4});
      });
    });

    test('Can handle altering text after the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.setTextContent('hello world123');
        expect(textNode.getTextContent()).toBe('hello world123');
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
      });
    });

    test('Can handle altering inside the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.setTextContent('he123llo world');
        expect(textNode.getTextContent()).toBe('he123llo world');
        expect(textNode.getMark('foo')).toEqual({end: 6, id: 'foo', start: 1});
      });
    });

    test('Can handle altering part of the mark', () => {
      const testMarks = [{end: 3, id: 'foo', start: 1}];
      setupTestCase(testMarks, (textNode) => {
        expect(textNode.getMark('foo')).toEqual({end: 3, id: 'foo', start: 1});
        textNode.setTextContent('he123 world');
        expect(textNode.getTextContent()).toBe('he123 world');
        expect(textNode.getMark('foo')).toEqual({end: 2, id: 'foo', start: 1});
      });
    });
  });
});
