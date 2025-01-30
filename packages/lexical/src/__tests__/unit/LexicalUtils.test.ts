/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isTokenOrSegmented,
  $nodesOfType,
  createEditor,
  isSelectionWithinEditor,
  ParagraphNode,
  resetRandomKey,
  SerializedTextNode,
  TextNode,
} from 'lexical';

import {
  $onUpdate,
  emptyFunction,
  generateRandomKey,
  getCachedTypeToNodeMap,
  getTextDirection,
  isArray,
  scheduleMicroTask,
} from '../../LexicalUtils';
import {initializeUnitTest} from '../utils';

describe('LexicalUtils tests', () => {
  initializeUnitTest((testEnv) => {
    test('scheduleMicroTask(): native', async () => {
      jest.resetModules();

      let flag = false;

      scheduleMicroTask(() => {
        flag = true;
      });

      expect(flag).toBe(false);

      await null;

      expect(flag).toBe(true);
    });

    test('scheduleMicroTask(): promise', async () => {
      jest.resetModules();
      const nativeQueueMicrotask = window.queueMicrotask;
      const fn = jest.fn();
      try {
        // @ts-ignore
        window.queueMicrotask = undefined;
        scheduleMicroTask(fn);
      } finally {
        // Reset it before yielding control
        window.queueMicrotask = nativeQueueMicrotask;
      }

      expect(fn).toHaveBeenCalledTimes(0);

      await null;

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('emptyFunction()', () => {
      expect(emptyFunction).toBeInstanceOf(Function);
      expect(emptyFunction.length).toBe(0);
      expect(emptyFunction()).toBe(undefined);
    });

    test('resetRandomKey()', () => {
      resetRandomKey();
      const key1 = generateRandomKey();
      resetRandomKey();
      const key2 = generateRandomKey();
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
      expect(key1).not.toBe('');
      expect(key2).not.toBe('');
      expect(key1).toEqual(key2);
    });

    test('generateRandomKey()', () => {
      const key1 = generateRandomKey();
      const key2 = generateRandomKey();
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
      expect(key1).not.toBe('');
      expect(key2).not.toBe('');
      expect(key1).not.toEqual(key2);
    });

    test('isArray()', () => {
      expect(isArray).toBeInstanceOf(Function);
      expect(isArray).toBe(Array.isArray);
    });

    test('isSelectionWithinEditor()', async () => {
      const {editor} = testEnv;
      let textNode: TextNode;

      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        textNode = $createTextNode('foo');
        paragraph.append(textNode);
        root.append(paragraph);
      });

      await editor.update(() => {
        const domSelection = window.getSelection()!;

        expect(
          isSelectionWithinEditor(
            editor,
            domSelection.anchorNode,
            domSelection.focusNode,
          ),
        ).toBe(false);

        textNode.select(0, 0);
      });

      await editor.update(() => {
        const domSelection = window.getSelection()!;

        expect(
          isSelectionWithinEditor(
            editor,
            domSelection.anchorNode,
            domSelection.focusNode,
          ),
        ).toBe(true);
      });
    });

    test('getTextDirection()', () => {
      expect(getTextDirection('')).toBe(null);
      expect(getTextDirection(' ')).toBe(null);
      expect(getTextDirection('0')).toBe(null);
      expect(getTextDirection('A')).toBe('ltr');
      expect(getTextDirection('Z')).toBe('ltr');
      expect(getTextDirection('a')).toBe('ltr');
      expect(getTextDirection('z')).toBe('ltr');
      expect(getTextDirection('\u00C0')).toBe('ltr');
      expect(getTextDirection('\u00D6')).toBe('ltr');
      expect(getTextDirection('\u00D8')).toBe('ltr');
      expect(getTextDirection('\u00F6')).toBe('ltr');
      expect(getTextDirection('\u00F8')).toBe('ltr');
      expect(getTextDirection('\u02B8')).toBe('ltr');
      expect(getTextDirection('\u0300')).toBe('ltr');
      expect(getTextDirection('\u0590')).toBe('ltr');
      expect(getTextDirection('\u0800')).toBe('ltr');
      expect(getTextDirection('\u1FFF')).toBe('ltr');
      expect(getTextDirection('\u200E')).toBe('ltr');
      expect(getTextDirection('\u2C00')).toBe('ltr');
      expect(getTextDirection('\uFB1C')).toBe('ltr');
      expect(getTextDirection('\uFE00')).toBe('ltr');
      expect(getTextDirection('\uFE6F')).toBe('ltr');
      expect(getTextDirection('\uFEFD')).toBe('ltr');
      expect(getTextDirection('\uFFFF')).toBe('ltr');
      expect(getTextDirection(`\u0591`)).toBe('rtl');
      expect(getTextDirection(`\u07FF`)).toBe('rtl');
      expect(getTextDirection(`\uFB1D`)).toBe('rtl');
      expect(getTextDirection(`\uFDFD`)).toBe('rtl');
      expect(getTextDirection(`\uFE70`)).toBe('rtl');
      expect(getTextDirection(`\uFEFC`)).toBe('rtl');
    });

    test('isTokenOrSegmented()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const node = $createTextNode('foo');
        expect($isTokenOrSegmented(node)).toBe(false);

        const tokenNode = $createTextNode().setMode('token');
        expect($isTokenOrSegmented(tokenNode)).toBe(true);

        const segmentedNode = $createTextNode('foo').setMode('segmented');
        expect($isTokenOrSegmented(segmentedNode)).toBe(true);
      });
    });

    test('$getNodeByKey', async () => {
      const {editor} = testEnv;
      let paragraphNode: ParagraphNode;
      let textNode: TextNode;

      await editor.update(() => {
        const rootNode = $getRoot();
        paragraphNode = new ParagraphNode();
        textNode = new TextNode('foo');
        paragraphNode.append(textNode);
        rootNode.append(paragraphNode);
      });

      await editor.getEditorState().read(() => {
        expect($getNodeByKey('1')).toBe(paragraphNode);
        expect($getNodeByKey('2')).toBe(textNode);
        expect($getNodeByKey('3')).toBe(null);
      });

      // @ts-expect-error
      expect(() => $getNodeByKey()).toThrow();
    });

    test('$nodesOfType', async () => {
      const {editor} = testEnv;
      const paragraphKeys: string[] = [];

      const $paragraphKeys = () =>
        $nodesOfType(ParagraphNode).map((node) => node.getKey());

      await editor.update(() => {
        const root = $getRoot();
        const paragraph1 = $createParagraphNode();
        const paragraph2 = $createParagraphNode();
        $createParagraphNode();
        root.append(paragraph1, paragraph2);
        paragraphKeys.push(paragraph1.getKey(), paragraph2.getKey());
        const currentParagraphKeys = $paragraphKeys();
        expect(currentParagraphKeys).toHaveLength(paragraphKeys.length);
        expect(currentParagraphKeys).toEqual(
          expect.arrayContaining(paragraphKeys),
        );
      });
      editor.getEditorState().read(() => {
        const currentParagraphKeys = $paragraphKeys();
        expect(currentParagraphKeys).toHaveLength(paragraphKeys.length);
        expect(currentParagraphKeys).toEqual(
          expect.arrayContaining(paragraphKeys),
        );
      });
    });

    describe('$onUpdate', () => {
      test('deferred even when there are no dirty nodes', () => {
        const {editor} = testEnv;
        const runs: string[] = [];

        editor.update(
          () => {
            $onUpdate(() => {
              runs.push('second');
            });
          },
          {
            onUpdate: () => {
              runs.push('first');
            },
          },
        );
        expect(runs).toEqual([]);
        editor.update(() => {
          $onUpdate(() => {
            runs.push('third');
          });
        });
        expect(runs).toEqual([]);

        // Flush pending updates
        editor.read(() => {});

        expect(runs).toEqual(['first', 'second', 'third']);
      });

      test('added fn runs after update, original onUpdate, and prior calls to $onUpdate', () => {
        const {editor} = testEnv;
        const runs: string[] = [];

        editor.update(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('foo')),
            );
            $onUpdate(() => {
              runs.push('second');
            });
            $onUpdate(() => {
              runs.push('third');
            });
          },
          {
            onUpdate: () => {
              runs.push('first');
            },
          },
        );

        // Flush pending updates
        editor.read(() => {});

        expect(runs).toEqual(['first', 'second', 'third']);
      });

      test('adding fn throws outside update', () => {
        expect(() => {
          $onUpdate(() => {});
        }).toThrow();
      });
    });

    test('getCachedTypeToNodeMap', async () => {
      const {editor} = testEnv;
      const paragraphKeys: string[] = [];

      const initialTypeToNodeMap = getCachedTypeToNodeMap(
        editor.getEditorState(),
      );
      expect(getCachedTypeToNodeMap(editor.getEditorState())).toBe(
        initialTypeToNodeMap,
      );
      expect([...initialTypeToNodeMap.keys()]).toEqual(['root']);
      expect(initialTypeToNodeMap.get('root')).toMatchObject({size: 1});

      editor.update(
        () => {
          const root = $getRoot();
          const paragraph1 = $createParagraphNode().append(
            $createTextNode('a'),
          );
          const paragraph2 = $createParagraphNode().append(
            $createTextNode('b'),
          );
          // these will be garbage collected and not in the readonly map
          $createParagraphNode().append($createTextNode('c'));
          root.append(paragraph1, paragraph2);
          paragraphKeys.push(paragraph1.getKey(), paragraph2.getKey());
        },
        {discrete: true},
      );

      const typeToNodeMap = getCachedTypeToNodeMap(editor.getEditorState());
      // verify that the initial cache was not used
      expect(typeToNodeMap).not.toBe(initialTypeToNodeMap);
      // verify that the cache is used for subsequent calls
      expect(getCachedTypeToNodeMap(editor.getEditorState())).toBe(
        typeToNodeMap,
      );
      expect(typeToNodeMap.size).toEqual(3);
      expect([...typeToNodeMap.keys()]).toEqual(
        expect.arrayContaining(['root', 'paragraph', 'text']),
      );
      const paragraphMap = typeToNodeMap.get('paragraph')!;
      expect(paragraphMap.size).toEqual(paragraphKeys.length);
      expect([...paragraphMap.keys()]).toEqual(
        expect.arrayContaining(paragraphKeys),
      );
      const textMap = typeToNodeMap.get('text')!;
      expect(textMap.size).toEqual(2);
      expect(
        [...textMap.values()].map((node) => (node as TextNode).__text),
      ).toEqual(expect.arrayContaining(['a', 'b']));
    });
  });
});
describe('$applyNodeReplacement', () => {
  class ExtendedTextNode extends TextNode {
    static getType() {
      return 'extended-text';
    }
    static clone(node: ExtendedTextNode): ExtendedTextNode {
      return new ExtendedTextNode(node.__text, node.getKey());
    }
    initWithTextNode(node: TextNode): this {
      const self = this.getWritable();
      TextNode.prototype.updateFromJSON.call(self, node.exportJSON());
      return self;
    }
    static importJSON(serializedNode: SerializedTextNode): ExtendedTextNode {
      return $createExtendedTextNode().updateFromJSON(serializedNode);
    }
  }
  class ExtendedExtendedTextNode extends ExtendedTextNode {
    static getType() {
      return 'extended-extended-text';
    }
    static clone(node: ExtendedExtendedTextNode): ExtendedExtendedTextNode {
      return new ExtendedExtendedTextNode(node.__text, node.getKey());
    }
    initWithExtendedTextNode(node: ExtendedTextNode): this {
      return this.initWithTextNode(node);
    }
    static importJSON(
      serializedNode: SerializedTextNode,
    ): ExtendedExtendedTextNode {
      return $createExtendedExtendedTextNode().updateFromJSON(serializedNode);
    }
  }
  function $createExtendedTextNode(text: string = '') {
    return $applyNodeReplacement(new ExtendedTextNode(text));
  }
  function $createExtendedExtendedTextNode(text: string = '') {
    return $applyNodeReplacement(new ExtendedExtendedTextNode(text));
  }
  test('validates replace node configuration', () => {
    const editor = createEditor({
      nodes: [
        {
          replace: TextNode,
          with: (node) => $createExtendedTextNode().initWithTextNode(node),
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('text')));
        },
        {discrete: true},
      );
    }).toThrow(
      'Attempted to create node ExtendedTextNode that was not configured to be used on the editor',
    );
  });
  test('validates replace node type withKlass', () => {
    const editor = createEditor({
      nodes: [
        {
          replace: TextNode,
          with: (node) => node,
          withKlass: ExtendedTextNode,
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('text')));
        },
        {discrete: true},
      );
    }).toThrow(
      '$applyNodeReplacement failed. Expected replacement node to be an instance of ExtendedTextNode with type extended-text but returned TextNode with type text from original node TextNode with type text',
    );
  });
  test('validates replace node type change', () => {
    const editor = createEditor({
      nodes: [
        {
          replace: TextNode,
          with: (node: TextNode) => new TextNode(node.__text),
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('text')));
        },
        {discrete: true},
      );
    }).toThrow(
      '$applyNodeReplacement failed. Ensure replacement node TextNode with type text is a subclass of the original node TextNode with type text',
    );
  });
  test('validates replace node key change', () => {
    const editor = createEditor({
      nodes: [
        {
          replace: TextNode,
          with: (node: TextNode) =>
            new ExtendedTextNode(node.__text, node.getKey()),
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('text')));
        },
        {discrete: true},
      );
    }).toThrow(
      'Lexical node with constructor ExtendedTextNode attempted to re-use key from node in active editor state with constructor TextNode. Keys must not be re-used when the type is changed.',
    );
  });
  test('validates replace node configuration withKlass', () => {
    const editor = createEditor({
      nodes: [
        {
          replace: TextNode,
          with: (node) => $createExtendedTextNode().initWithTextNode(node),
          withKlass: ExtendedTextNode,
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('text')));
        },
        {discrete: true},
      );
    }).toThrow(
      'Attempted to create node ExtendedTextNode that was not configured to be used on the editor',
    );
  });
  test('validates nested replace node configuration', () => {
    const editor = createEditor({
      nodes: [
        ExtendedTextNode,
        {
          replace: ExtendedTextNode,
          with: (node) =>
            $createExtendedExtendedTextNode().initWithExtendedTextNode(node),
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append($createExtendedTextNode('text')),
            );
        },
        {discrete: true},
      );
    }).toThrow(
      'Attempted to create node ExtendedExtendedTextNode that was not configured to be used on the editor',
    );
  });
  test('validates nested replace node configuration withKlass', () => {
    const editor = createEditor({
      nodes: [
        ExtendedTextNode,
        {
          replace: TextNode,
          with: (node) => $createExtendedTextNode().initWithTextNode(node),
          withKlass: ExtendedTextNode,
        },
        {
          replace: ExtendedTextNode,
          with: (node) =>
            $createExtendedExtendedTextNode().initWithExtendedTextNode(node),
          withKlass: ExtendedExtendedTextNode,
        },
      ],
      onError(err) {
        throw err;
      },
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('text')));
        },
        {discrete: true},
      );
    }).toThrow(
      'Attempted to create node ExtendedExtendedTextNode that was not configured to be used on the editor',
    );
  });
  test('nested replace node configuration works', () => {
    const editor = createEditor({
      nodes: [
        ExtendedTextNode,
        ExtendedExtendedTextNode,
        {
          replace: TextNode,
          with: (node) => $createExtendedTextNode().initWithTextNode(node),
          withKlass: ExtendedTextNode,
        },
        {
          replace: ExtendedTextNode,
          with: (node) =>
            $createExtendedExtendedTextNode().initWithExtendedTextNode(node),
          withKlass: ExtendedExtendedTextNode,
        },
      ],
      onError(err) {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('text')));
      },
      {discrete: true},
    );
    editor.read(() => {
      const textNodes = $getRoot().getAllTextNodes();
      expect(textNodes).toHaveLength(1);
      expect(textNodes[0].constructor).toBe(ExtendedExtendedTextNode);
      expect(textNodes[0].getTextContent()).toBe('text');
    });
  });
});
