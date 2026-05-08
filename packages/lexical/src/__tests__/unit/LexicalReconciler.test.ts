/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type NodeMutation,
  ParagraphNode,
} from 'lexical';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {$getReconciledDirection} from '../../LexicalReconciler';
import {
  $createTestDecoratorNode,
  $createTestElementNode,
  initializeUnitTest,
  TestDecoratorNode,
  TestElementNode,
} from '../utils';

describe('LexicalReconciler', () => {
  initializeUnitTest(testEnv => {
    test('Should set direction of root node children to auto if root node has no direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['auto', 'auto', 'auto']);
    });

    test('Should not set direction of root node children if root node has direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.setDirection('rtl');
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual([null, null, null]);
    });

    test('Should allow overriding direction of root node children when root node has no direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode()
            .setDirection('rtl')
            .append($createTextNode('فرعي')),
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('فرعي')),
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('Hello')),
          $createParagraphNode()
            .setDirection('rtl')
            .append($createLineBreakNode()),
          $createParagraphNode()
            .setDirection(null)
            .append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['rtl', 'ltr', 'ltr', 'rtl', 'auto']);
    });

    test('Should allow overriding direction of root node children when root node has direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.setDirection('rtl');
        root.append(
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['ltr', null, null]);
    });

    test('Should update root children when root node direction changes', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('Hello')),
        );
      });

      let directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['auto', 'ltr']);

      // Remove 'auto' from un-directioned children.
      editor.update(() => {
        $getRoot().setDirection('rtl');
      });

      directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual([null, 'ltr']);

      // Re-add 'auto' to children.
      editor.update(() => {
        $getRoot().setDirection(null);
      });

      directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map(child => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['auto', 'ltr']);
    });

    describe('Cross-parent moves reuse DOM (regression #8420)', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      test('Decorator wrapped in another element reuses its DOM', async () => {
        const {editor} = testEnv;
        let decoratorKey = '';
        await editor.update(() => {
          const decorator = $createTestDecoratorNode();
          decoratorKey = decorator.getKey();
          $getRoot().clear().append($createParagraphNode().append(decorator));
        });

        const domBefore = editor.getElementByKey(decoratorKey);
        expect(domBefore).not.toBeNull();

        const mutations: NodeMutation[] = [];
        editor.registerMutationListener(
          TestDecoratorNode,
          nodes => {
            for (const m of nodes.values()) {
              mutations.push(m);
            }
          },
          {skipInitialization: true},
        );

        await editor.update(() => {
          const decorator = $getRoot()
            .getFirstChildOrThrow<ParagraphNode>()
            .getFirstChildOrThrow<TestDecoratorNode>();
          const wrapper = $createTestElementNode();
          decorator.insertBefore(wrapper);
          wrapper.append(decorator);
        });

        expect(editor.getElementByKey(decoratorKey)).toBe(domBefore);
        expect(domBefore?.parentElement?.tagName).toBe('DIV');
        expect(mutations).toEqual(['updated']);
      });

      test('Element subtree move preserves descendant DOM identities', async () => {
        const {editor} = testEnv;
        let elementKey = '';
        let textKey = '';
        await editor.update(() => {
          const element = $createTestElementNode();
          const text = $createTextNode('hello');
          elementKey = element.getKey();
          textKey = text.getKey();
          element.append(text);
          $getRoot().clear().append($createParagraphNode().append(element));
        });

        const elementDOMBefore = editor.getElementByKey(elementKey);
        const textDOMBefore = editor.getElementByKey(textKey);

        await editor.update(() => {
          const root = $getRoot();
          const newParagraph = $createParagraphNode();
          root.append(newParagraph);
          const element = root
            .getFirstChildOrThrow<ParagraphNode>()
            .getFirstChildOrThrow<TestElementNode>();
          newParagraph.append(element);
        });

        expect(editor.getElementByKey(elementKey)).toBe(elementDOMBefore);
        expect(editor.getElementByKey(textKey)).toBe(textDOMBefore);
      });

      test('Multi-level nested subtree move preserves all descendant DOMs', async () => {
        const {editor} = testEnv;
        let outerKey = '';
        let innerKey = '';
        let leafKey = '';
        await editor.update(() => {
          const outer = $createTestElementNode();
          const inner = $createTestElementNode();
          const leaf = $createTextNode('leaf');
          outerKey = outer.getKey();
          innerKey = inner.getKey();
          leafKey = leaf.getKey();
          inner.append(leaf);
          outer.append(inner);
          $getRoot().clear().append($createParagraphNode().append(outer));
        });

        const outerDOMBefore = editor.getElementByKey(outerKey);
        const innerDOMBefore = editor.getElementByKey(innerKey);
        const leafDOMBefore = editor.getElementByKey(leafKey);

        await editor.update(() => {
          const root = $getRoot();
          const newParagraph = $createParagraphNode();
          root.append(newParagraph);
          const outer = root
            .getFirstChildOrThrow<ParagraphNode>()
            .getFirstChildOrThrow<TestElementNode>();
          newParagraph.append(outer);
        });

        expect(editor.getElementByKey(outerKey)).toBe(outerDOMBefore);
        expect(editor.getElementByKey(innerKey)).toBe(innerDOMBefore);
        expect(editor.getElementByKey(leafKey)).toBe(leafDOMBefore);
      });

      test('Wrapping decorator emits a single "updated" listener event and re-decorates', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTestDecoratorNode()));
        });

        const decorateSpy = vi.spyOn(TestDecoratorNode.prototype, 'decorate');
        const events: Array<{klass: string; mutation: NodeMutation}> = [];
        const recordMutations =
          (klass: string) => (nodes: Map<string, NodeMutation>) => {
            for (const m of nodes.values()) {
              events.push({klass, mutation: m});
            }
          };
        editor.registerMutationListener(
          TestDecoratorNode,
          recordMutations('decorator'),
          {skipInitialization: true},
        );
        editor.registerMutationListener(
          TestElementNode,
          recordMutations('element'),
          {skipInitialization: true},
        );

        await editor.update(() => {
          const decorator = $getRoot()
            .getFirstChildOrThrow<ParagraphNode>()
            .getFirstChildOrThrow<TestDecoratorNode>();
          const wrapper = $createTestElementNode();
          decorator.insertBefore(wrapper);
          wrapper.append(decorator);
        });

        expect(events.filter(e => e.klass === 'decorator')).toEqual([
          {klass: 'decorator', mutation: 'updated'},
        ]);
        expect(decorateSpy).toHaveBeenCalled();
      });

      test('Cross-parent swap with updateDOM=true does not throw', async () => {
        // Two single-child paragraphs swap their decorator children, and one
        // of the decorators also reports updateDOM=true (block flag flipped).
        // Without a slot guard in $createNode's reuse branch, the prev=1/
        // next=1 fast path would call $reconcileNode(key, null) and the
        // updateDOM=true replacement path would hit a parentDOM=null
        // invariant. With the guard, the reuse is skipped for slot=null
        // call sites and the move falls back to the regular create path.
        const {editor} = testEnv;
        let keyA = '';
        let keyB = '';
        await editor.update(() => {
          const a = $createTestDecoratorNode();
          const b = $createTestDecoratorNode();
          keyA = a.getKey();
          keyB = b.getKey();
          $getRoot()
            .clear()
            .append($createParagraphNode().append(a))
            .append($createParagraphNode().append(b));
        });

        // Should not throw — slot=null call sites fall back to the regular
        // create path when reuse would be unsafe.
        await editor.update(() => {
          const [pX, pY] = $getRoot().getChildren<ParagraphNode>();
          const a = pX.getFirstChildOrThrow<TestDecoratorNode>();
          const b = pY.getFirstChildOrThrow<TestDecoratorNode>();
          a.setIsInline(false); // forces updateDOM=true on a
          pY.append(a);
          pX.append(b);
        });

        // Final structure: pX -> [b], pY -> [a (now block)]
        expect(editor.getElementByKey(keyA)?.tagName).toBe('DIV');
        expect(editor.getElementByKey(keyB)?.tagName).toBe('SPAN');
      });

      test('Same-parent reorder is unaffected by the reuse branch', async () => {
        // Reordering siblings goes through the slow-path "Move next" branch,
        // not $createNode. DOM identities for all reordered children must
        // survive, regardless of the new reuse logic.
        const {editor} = testEnv;
        let keyA = '';
        let keyB = '';
        let keyC = '';
        await editor.update(() => {
          const a = $createParagraphNode().append($createTextNode('a'));
          const b = $createParagraphNode().append($createTextNode('b'));
          const c = $createParagraphNode().append($createTextNode('c'));
          keyA = a.getKey();
          keyB = b.getKey();
          keyC = c.getKey();
          $getRoot().clear().append(a, b, c);
        });

        const domA = editor.getElementByKey(keyA);
        const domB = editor.getElementByKey(keyB);
        const domC = editor.getElementByKey(keyC);

        await editor.update(() => {
          const root = $getRoot();
          // Reorder [a, b, c] → [c, a, b] within the same parent.
          const c = root.getLastChildOrThrow<ParagraphNode>();
          c.remove();
          root.getFirstChildOrThrow<ParagraphNode>().insertBefore(c);
        });

        expect(editor.getElementByKey(keyA)).toBe(domA);
        expect(editor.getElementByKey(keyB)).toBe(domB);
        expect(editor.getElementByKey(keyC)).toBe(domC);
      });
    });
  });

  describe('setElementIndent', () => {
    test('emits a CSS variable reference rather than a pre-resolved value', () => {
      using editor = buildEditorFromExtensions(
        RichTextExtension,
        defineExtension({
          $initialEditorState: () => {
            const para = $createParagraphNode().append(
              $createTextNode('hello'),
            );
            para.setIndent(3);
            $getRoot().clear().append(para);
          },
          name: 'set-element-indent-var',
        }),
      );
      editor.setRootElement(document.createElement('div'));

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
        const dom = editor.getElementByKey(para.getKey());
        // The resolved CSS variable would only cascade after the element is
        // attached and styled. Emitting `var(...)` defers resolution to the
        // browser, so the inline style works regardless of where
        // `--lexical-indent-base-value` is defined or whether the element is
        // mounted at the time `setElementIndent` runs.
        expect(dom!.style.paddingInlineStart).toBe(
          'calc(3 * var(--lexical-indent-base-value, 40px))',
        );
      });
    });

    test('clears padding when indent returns to 0', () => {
      using editor = buildEditorFromExtensions(
        RichTextExtension,
        defineExtension({
          $initialEditorState: () => {
            const para = $createParagraphNode().append(
              $createTextNode('hello'),
            );
            para.setIndent(2);
            $getRoot().clear().append(para);
          },
          name: 'set-element-indent-clear',
        }),
      );
      editor.setRootElement(document.createElement('div'));

      editor.update(
        () => {
          const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          para.setIndent(0);
        },
        {discrete: true},
      );

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
        const dom = editor.getElementByKey(para.getKey());
        expect(dom!.style.paddingInlineStart).toBe('');
      });
    });
  });
});
