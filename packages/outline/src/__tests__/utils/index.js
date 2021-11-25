/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {OutlineEditor} from 'outline';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor, BlockNode, TextNode, DecoratorNode} from 'outline';
import {ParagraphNode} from 'outline/ParagraphNode';
import {HeadingNode} from 'outline/HeadingNode';
import {ListNode} from 'outline/ListNode';
import {ListItemNode} from 'outline/ListItemNode';
import {LinkNode} from 'outline/LinkNode';
import {QuoteNode} from 'outline/QuoteNode';
import {CodeNode} from 'outline/CodeNode';
import {resetRandomKey} from '../../core/OutlineUtils';

type TestEnv = {
  editor: OutlineEditor | null,
  container: HTMLDivElement | null,
  outerHTML: string,
};

export function createTestEditor(config): OutlineEditor {
  const editor = createEditor(config);
  editor.registerNodeType('paragraph', ParagraphNode);
  editor.registerNodeType('heading', HeadingNode);
  editor.registerNodeType('list', ListNode);
  editor.registerNodeType('listitem', ListItemNode);
  editor.registerNodeType('link', LinkNode);
  editor.registerNodeType('quote', QuoteNode);
  editor.registerNodeType('code', CodeNode);
  editor.registerNodeType('test_block', TestBlockNode);
  editor.registerNodeType('test_segmented', TestSegmentedNode);
  editor.registerNodeType(
    'test_exclude_from_copy_block',
    TestExcludeFromCopyBlockNode,
  );
  editor.registerNodeType('test_decorator', TestDecoratorNode);
  return editor;
}

export function initializeUnitTest(runTests: (testEnv: TestEnv) => void) {
  const testEnv: TestEnv = {
    editor: null,
    container: null,
    get outerHTML() {
      return this.container.innerHTML;
    },
  };

  beforeEach(async () => {
    resetRandomKey();

    testEnv.container = document.createElement('div');
    document.body.appendChild(testEnv.container);
    const ref = React.createRef();

    const useOutlineEditor = (rootElementRef) => {
      const outlineEditor = React.useMemo(() => {
        const outline = createTestEditor();
        outline.addListener('error', (error) => {
          throw error;
        });
        return outline;
      }, []);

      React.useEffect(() => {
        const rootElement = rootElementRef.current;
        outlineEditor.setRootElement(rootElement);
      }, [rootElementRef, outlineEditor]);
      return outlineEditor;
    };

    const Editor = () => {
      testEnv.editor = useOutlineEditor(ref);
      testEnv.editor.addListener('error', (error) => {
        throw error;
      });
      return <div ref={ref} contentEditable={true} />;
    };

    ReactTestUtils.act(() => {
      ReactDOM.createRoot(testEnv.container).render(<Editor />);
    });
  });

  afterEach(() => {
    document.body.removeChild(testEnv.container);
    testEnv.container = null;
  });

  runTests(testEnv);
}

export class TestBlockNode extends BlockNode {
  static clone(node: BlockNode) {
    return new TestBlockNode(node.__key);
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
}

export function createTestBlockNode(): TestBlockNode {
  return new TestBlockNode();
}

export class TestSegmentedNode extends TextNode {
  static clone(node: $FlowFixMe): TestSegmentedNode {
    return new TestSegmentedNode(node.__text, node.__key);
  }
}

export function createTestSegmentedNode(text): TestSegmentedNode {
  return new TestSegmentedNode(text).makeSegmented();
}

export class TestExcludeFromCopyBlockNode extends BlockNode {
  static clone(node: TestExcludeFromCopyBlockNode) {
    return new TestExcludeFromCopyBlockNode(node.__key);
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
  excludeFromCopy() {
    return true;
  }
}

export function createTestExcludeFromCopyBlockNode(): TestExcludeFromCopyBlockNode {
  return new TestExcludeFromCopyBlockNode();
}

export class TestDecoratorNode extends DecoratorNode {
  static clone(node: TestNode) {
    return new TestNode(node.__key);
  }
  getTextContent() {
    return 'Hello world';
  }
  createDOM() {
    return document.createElement('span');
  }
  decorate() {
    return <Decorator text={'Hello world'} />;
  }
}

function Decorator({text}): React.MixedElement {
  return <span>{text}</span>;
}

export function createTestDecoratorNode(): TestDecoratorNode {
  return new TestDecoratorNode();
}
