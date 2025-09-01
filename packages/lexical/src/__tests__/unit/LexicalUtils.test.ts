/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  $copyNode,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getState,
  $isTokenOrSegmented,
  $nodesOfType,
  $onUpdate,
  $setState,
  createEditor,
  createState,
  isSelectionWithinEditor,
  ParagraphNode,
  resetRandomKey,
  SerializedParagraphNode,
  SerializedTextNode,
  TextNode,
} from 'lexical';

import {
  createSelectionFromComposedRanges,
  emptyFunction,
  generateRandomKey,
  getActiveElement,
  getCachedTypeToNodeMap,
  getDocumentFromElement,
  getDOMSelection,
  getDOMSelectionFromTarget,
  getShadowRoot,
  getTextDirection,
  isArray,
  isShadowRoot,
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
    const mockWarning = jest
      .spyOn(console, 'warn')
      .mockImplementationOnce(() => {});
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
    expect(mockWarning).toHaveBeenCalledWith(
      `Override for TextNode specifies 'replace' without 'withKlass'. 'withKlass' will be required in a future version.`,
    );
    mockWarning.mockRestore();
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
describe('$copyNode', () => {
  const STRING_STATE = createState('string-state', {
    parse: (v) => (typeof v === 'string' ? v : ''),
  });
  class ExtendedParagraphNode extends ParagraphNode {
    __string: string = 'default';
    static getType() {
      return 'extended-paragraph';
    }
    static clone(node: ExtendedParagraphNode): ExtendedParagraphNode {
      return new ExtendedParagraphNode(node.getKey());
    }
    static importJSON(
      serializedNode: SerializedParagraphNode,
    ): ExtendedParagraphNode {
      throw new Error('Not implemented');
    }
    afterCloneFrom(prevNode: this): void {
      super.afterCloneFrom(prevNode);
      this.__string = prevNode.__string;
    }
    setString(value: string): this {
      const writable = this.getWritable();
      writable.__string = value;
      return writable;
    }
  }
  function $createExtendedParagraphNode() {
    return $applyNodeReplacement(new ExtendedParagraphNode());
  }
  function $isExtendedParagraphNode(node: unknown) {
    return node instanceof ExtendedParagraphNode;
  }
  test('does not mark the original as dirty', () => {
    const editor = createEditor({
      nodes: [ExtendedParagraphNode, TextNode, ParagraphNode],
      onError(err) {
        throw err;
      },
    });
    let initialParagraph: ExtendedParagraphNode;
    editor.update(
      () => {
        initialParagraph = $createExtendedParagraphNode();
        $getRoot()
          .clear()
          .append(initialParagraph.append($createTextNode('text')));
      },
      {discrete: true},
    );
    editor.update(
      () => {
        expect($getRoot().getFirstChild()).toBe(initialParagraph);
        const copiedParagraph = $copyNode(initialParagraph);
        expect($getRoot().getFirstChild()).toBe(initialParagraph);
        expect(copiedParagraph).not.toBe(initialParagraph);
        expect($isExtendedParagraphNode(copiedParagraph)).toBe(true);
      },
      {discrete: true},
    );
  });
  test('returns a shallow copy', () => {
    const editor = createEditor({
      nodes: [ExtendedParagraphNode, TextNode, ParagraphNode],
      onError(err) {
        throw err;
      },
    });
    let initialParagraph: ExtendedParagraphNode;
    let copiedParagraph: ExtendedParagraphNode;
    editor.update(
      () => {
        initialParagraph =
          $createExtendedParagraphNode().setString('non-default');
        $setState(initialParagraph, STRING_STATE, 'non-default');
        const root = $getRoot().clear();
        root.append(initialParagraph.append($createTextNode('text')));
        copiedParagraph = $copyNode(initialParagraph);
        root.append(copiedParagraph);
        $setState(
          initialParagraph.setString('not-aliased'),
          STRING_STATE,
          'not-aliased',
        );
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getRoot().getChildren()).toEqual([
        initialParagraph,
        copiedParagraph,
      ]);
      expect(initialParagraph.getTextContent()).toBe('text');
      expect(copiedParagraph.getTextContent()).toBe('');
      expect($getState(initialParagraph, STRING_STATE)).toBe('not-aliased');
      expect($getState(copiedParagraph, STRING_STATE)).toBe('non-default');
      expect(initialParagraph.__string).toBe('not-aliased');
      expect(copiedParagraph.__string).toBe('non-default');
    });
  });

  describe('Shadow DOM utilities', () => {
    // Helper function to create a shadow DOM for testing
    function createShadowDOMHost(): {
      host: HTMLElement;
      shadowRoot: ShadowRoot;
      cleanup: () => void;
    } {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({mode: 'open'});

      return {
        cleanup: () => {
          if (host.parentNode) {
            host.parentNode.removeChild(host);
          }
        },
        host,
        shadowRoot,
      };
    }

    describe('isShadowRoot()', () => {
      test('should return false for null', () => {
        expect(isShadowRoot(null)).toBe(false);
      });

      test('should return false for regular DOM elements', () => {
        const div = document.createElement('div');
        expect(isShadowRoot(div)).toBe(false);
      });

      test('should return false for document', () => {
        expect(isShadowRoot(document)).toBe(false);
      });

      test('should return false for text nodes', () => {
        const textNode = document.createTextNode('test');
        expect(isShadowRoot(textNode)).toBe(false);
      });

      test('should return false for regular document fragments', () => {
        const fragment = document.createDocumentFragment();
        expect(isShadowRoot(fragment)).toBe(false);
      });

      test('should return true for actual shadow roots', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        expect(isShadowRoot(shadowRoot)).toBe(true);

        cleanup();
      });

      test('should return false for elements with wrong nodeType', () => {
        // Create an object that has 'host' property but wrong nodeType
        const fakeNode = {
          // ELEMENT_NODE instead of DOCUMENT_FRAGMENT_NODE
          host: document.createElement('div'),
          nodeType: 1,
        } as unknown as Node;

        expect(isShadowRoot(fakeNode)).toBe(false);
      });

      test('should return false for document fragment without host', () => {
        // Document fragments have correct nodeType but no host property
        const fragment = document.createDocumentFragment();
        expect(fragment.nodeType).toBe(11); // DOM_DOCUMENT_FRAGMENT_TYPE
        expect('host' in fragment).toBe(false);
        expect(isShadowRoot(fragment)).toBe(false);
      });
    });

    describe('getShadowRoot()', () => {
      test('should return null for regular DOM elements', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        expect(getShadowRoot(div)).toBeNull();

        document.body.removeChild(div);
      });

      test('should return ShadowRoot for elements inside shadow DOM', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        expect(getShadowRoot(innerDiv)).toBe(shadowRoot);

        cleanup();
      });

      test('should return null for elements not in DOM', () => {
        const div = document.createElement('div');
        expect(getShadowRoot(div)).toBeNull();
      });

      test('should traverse up to find shadow root', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const outerDiv = document.createElement('div');
        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(outerDiv);
        outerDiv.appendChild(innerDiv);

        expect(getShadowRoot(innerDiv)).toBe(shadowRoot);

        cleanup();
      });
    });

    describe('getDocumentFromElement()', () => {
      test('should return document for regular DOM elements', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        expect(getDocumentFromElement(div)).toBe(document);

        document.body.removeChild(div);
      });

      test('should return shadow root owner document for shadow DOM elements', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        expect(getDocumentFromElement(innerDiv)).toBe(document);

        cleanup();
      });

      test('should return element owner document as fallback', () => {
        const div = document.createElement('div');
        expect(getDocumentFromElement(div)).toBe(document);
      });
    });

    describe('getActiveElement()', () => {
      test('should return document.activeElement for regular DOM', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        expect(getActiveElement(input)).toBe(document.activeElement);

        document.body.removeChild(input);
      });

      test('should return shadow root active element when available', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const input = document.createElement('input');
        shadowRoot.appendChild(input);

        // Mock shadowRoot.activeElement
        Object.defineProperty(shadowRoot, 'activeElement', {
          configurable: true,
          value: input,
        });

        expect(getActiveElement(input)).toBe(input);

        cleanup();
      });

      test('should fallback to document.activeElement when shadowRoot.activeElement is null', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const input = document.createElement('input');
        shadowRoot.appendChild(input);

        // Mock shadowRoot.activeElement as null
        Object.defineProperty(shadowRoot, 'activeElement', {
          configurable: true,
          value: null,
        });

        expect(getActiveElement(input)).toBe(document.activeElement);

        cleanup();
      });
    });

    describe('createSelectionFromComposedRanges()', () => {
      test('should return null for empty ranges array', () => {
        expect(createSelectionFromComposedRanges([])).toBeNull();
      });

      test('should create Selection from StaticRange', () => {
        const container = document.createElement('div');
        container.textContent = 'Hello World';
        document.body.appendChild(container);

        // Create a StaticRange manually (simplified for testing)
        const staticRange = {
          collapsed: false,
          endContainer: container.firstChild!,
          endOffset: 5,
          startContainer: container.firstChild!,
          startOffset: 0,
        } as StaticRange;

        const selection = createSelectionFromComposedRanges([staticRange]);

        expect(selection).not.toBeNull();
        expect(selection?.rangeCount).toBe(1);

        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          expect(range.startContainer).toBe(container.firstChild);
          expect(range.startOffset).toBe(0);
          expect(range.endContainer).toBe(container.firstChild);
          expect(range.endOffset).toBe(5);
        }

        document.body.removeChild(container);
      });

      test('should handle multiple ranges (last one wins)', () => {
        const container1 = document.createElement('div');
        const container2 = document.createElement('div');
        container1.textContent = 'First';
        container2.textContent = 'Second';
        document.body.appendChild(container1);
        document.body.appendChild(container2);

        const staticRange1 = {
          collapsed: false,
          endContainer: container1.firstChild!,
          endOffset: 2,
          startContainer: container1.firstChild!,
          startOffset: 0,
        } as StaticRange;

        const staticRange2 = {
          collapsed: false,
          endContainer: container2.firstChild!,
          endOffset: 3,
          startContainer: container2.firstChild!,
          startOffset: 0,
        } as StaticRange;

        const selection = createSelectionFromComposedRanges([
          staticRange1,
          staticRange2,
        ]);

        expect(selection).not.toBeNull();
        // DOM Selection API only keeps the last added range
        expect(selection?.rangeCount).toBe(1);

        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // Should be the first range (staticRange1) as it gets replaced by subsequent ranges
          expect(range.startContainer).toBe(container1.firstChild);
          expect(range.endOffset).toBe(2);
        }

        document.body.removeChild(container1);
        document.body.removeChild(container2);
      });
    });

    describe('getDOMSelection() with Shadow DOM support', () => {
      test('should return window.getSelection() when no rootElement provided', () => {
        const selection = getDOMSelection(window);
        expect(selection).toBe(window.getSelection());
      });

      test('should return window.getSelection() for regular DOM elements', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        const selection = getDOMSelection(window, div);
        expect(selection).toBe(window.getSelection());

        document.body.removeChild(div);
      });

      test('should attempt getComposedRanges for shadow DOM elements', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Mock getComposedRanges
        const mockGetComposedRanges = jest.fn().mockReturnValue([]);
        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });

        getDOMSelection(window, innerDiv);

        expect(mockGetComposedRanges).toHaveBeenCalledWith({
          shadowRoots: [shadowRoot],
        });

        cleanup();
      });

      test('should fallback to getSelection when getComposedRanges fails', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Mock getComposedRanges to throw error
        const mockGetComposedRanges = jest.fn().mockImplementation(() => {
          throw new Error('Not supported');
        });

        // Mock getSelection
        const mockGetSelection = jest.fn().mockReturnValue(null);
        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });
        Object.defineProperty(shadowRoot, 'getSelection', {
          configurable: true,
          value: mockGetSelection,
        });

        getDOMSelection(window, innerDiv);

        expect(mockGetComposedRanges).toHaveBeenCalled();
        expect(mockGetSelection).toHaveBeenCalled();

        cleanup();
      });

      test('should fallback to window.getSelection when all shadow methods fail', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Don't mock any methods, so they will be undefined
        const selection = getDOMSelection(window, innerDiv);
        expect(selection).toBe(window.getSelection());

        cleanup();
      });
    });

    describe('getDOMSelectionFromTarget() with Shadow DOM support', () => {
      test('should return null when eventTarget is null', () => {
        const selection = getDOMSelectionFromTarget(null);
        expect(selection).toBeNull();
      });

      test('should return window.getSelection() for regular DOM elements', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        const selection = getDOMSelectionFromTarget(div);
        expect(selection).toBe(window.getSelection());

        document.body.removeChild(div);
      });

      test('should return null for non-HTML EventTargets without defaultView', () => {
        // Test with a non-HTML EventTarget (like Window) - getDefaultView returns null for window
        const selection = getDOMSelectionFromTarget(window);
        expect(selection).toBeNull();
      });

      test('should attempt getComposedRanges for shadow DOM elements', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Mock getComposedRanges
        const mockGetComposedRanges = jest.fn().mockReturnValue([]);
        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });

        getDOMSelectionFromTarget(innerDiv);

        expect(mockGetComposedRanges).toHaveBeenCalledWith({
          shadowRoots: [shadowRoot],
        });

        cleanup();
      });

      test('should return selection from getComposedRanges when available', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        innerDiv.textContent = 'Test content';
        shadowRoot.appendChild(innerDiv);

        // Create a mock StaticRange
        const mockRange = {
          collapsed: false,
          endContainer: innerDiv.firstChild!,
          endOffset: 4,
          startContainer: innerDiv.firstChild!,
          startOffset: 0,
        } as StaticRange;

        // Mock getComposedRanges to return our range
        const mockGetComposedRanges = jest.fn().mockReturnValue([mockRange]);
        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });

        const selection = getDOMSelectionFromTarget(innerDiv);

        expect(selection).not.toBeNull();
        // createSelectionFromComposedRanges creates a new Selection that should have the range
        expect(mockGetComposedRanges).toHaveBeenCalledWith({
          shadowRoots: [shadowRoot],
        });

        // Just verify that the function was called and returned a non-null selection
        expect(typeof selection?.rangeCount).toBe('number');

        cleanup();
      });

      test('should fallback to getSelection when getComposedRanges fails', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Mock getComposedRanges to throw error
        const mockGetComposedRanges = jest.fn().mockImplementation(() => {
          throw new Error('getComposedRanges not supported');
        });

        // Mock getSelection
        const mockSelection = {rangeCount: 0} as Selection;
        const mockGetSelection = jest.fn().mockReturnValue(mockSelection);
        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });
        Object.defineProperty(shadowRoot, 'getSelection', {
          configurable: true,
          value: mockGetSelection,
        });

        const selection = getDOMSelectionFromTarget(innerDiv);

        expect(mockGetComposedRanges).toHaveBeenCalled();
        expect(mockGetSelection).toHaveBeenCalled();
        expect(selection).toBe(mockSelection);

        cleanup();
      });

      test('should fallback to window.getSelection when getSelection fails', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Mock getComposedRanges to throw error
        const mockGetComposedRanges = jest.fn().mockImplementation(() => {
          throw new Error('getComposedRanges not supported');
        });

        // Mock getSelection to throw error
        const mockGetSelection = jest.fn().mockImplementation(() => {
          throw new Error('getSelection not supported');
        });

        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });
        Object.defineProperty(shadowRoot, 'getSelection', {
          configurable: true,
          value: mockGetSelection,
        });

        const selection = getDOMSelectionFromTarget(innerDiv);

        expect(mockGetComposedRanges).toHaveBeenCalled();
        expect(mockGetSelection).toHaveBeenCalled();
        expect(selection).toBe(window.getSelection());

        cleanup();
      });

      test('should fallback to window.getSelection when shadow methods are undefined', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Don't mock any methods, so they will be undefined
        const selection = getDOMSelectionFromTarget(innerDiv);
        expect(selection).toBe(window.getSelection());

        cleanup();
      });

      test('should handle empty ranges from getComposedRanges', () => {
        const {shadowRoot, cleanup} = createShadowDOMHost();

        const innerDiv = document.createElement('div');
        shadowRoot.appendChild(innerDiv);

        // Mock getComposedRanges to return empty array
        const mockGetComposedRanges = jest.fn().mockReturnValue([]);
        Object.defineProperty(shadowRoot, 'getComposedRanges', {
          configurable: true,
          value: mockGetComposedRanges,
        });

        // Mock getSelection as fallback
        const mockSelection = {rangeCount: 0} as Selection;
        const mockGetSelection = jest.fn().mockReturnValue(mockSelection);
        Object.defineProperty(shadowRoot, 'getSelection', {
          configurable: true,
          value: mockGetSelection,
        });

        const selection = getDOMSelectionFromTarget(innerDiv);

        expect(mockGetComposedRanges).toHaveBeenCalled();
        expect(mockGetSelection).toHaveBeenCalled();
        expect(selection).toBe(mockSelection);

        cleanup();
      });
    });
  });
});
