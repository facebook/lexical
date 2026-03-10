/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {
  LexicalNodeMenuPlugin,
  MenuOption,
  MenuRenderFn,
  MenuResolution,
} from '@lexical/react/LexicalNodeMenuPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {TextNode} from 'lexical';
import * as React from 'react';
import {useCallback} from 'react';
import ReactDOM from 'react-dom';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

class TestNodeMenuOption extends MenuOption {
  title: string;
  constructor(title: string) {
    super(title);
    this.title = title;
  }
}

const TEST_OPTIONS = [
  new TestNodeMenuOption('Edit'),
  new TestNodeMenuOption('Delete'),
  new TestNodeMenuOption('Copy'),
];

function NodeMenuPluginWithMenuRenderFn({
  nodeKey = null,
  options = TEST_OPTIONS,
}: {
  nodeKey?: string | null;
  options?: TestNodeMenuOption[];
}) {
  const onSelectOption = useCallback(
    (
      _option: TestNodeMenuOption,
      _textNode: TextNode | null,
      closeMenu: () => void,
    ) => {
      closeMenu();
    },
    [],
  );

  const menuRenderFn: MenuRenderFn<TestNodeMenuOption> = useCallback(
    (anchorElementRef, itemProps, matchingString) => {
      return anchorElementRef.current && itemProps.options.length
        ? ReactDOM.createPortal(
            <div className="custom-node-menu" data-testid="custom-node-menu">
              {itemProps.options.map((option, i) => (
                <div
                  key={option.key}
                  data-selected={itemProps.selectedIndex === i}
                  className="custom-node-menu-item">
                  {option.title}
                </div>
              ))}
            </div>,
            anchorElementRef.current,
          )
        : null;
    },
    [],
  );

  return (
    <LexicalNodeMenuPlugin<TestNodeMenuOption>
      nodeKey={nodeKey}
      onSelectOption={onSelectOption}
      options={options}
      menuRenderFn={menuRenderFn}
    />
  );
}

function NodeMenuPluginWithoutMenuRenderFn({
  nodeKey = null,
  options = TEST_OPTIONS,
}: {
  nodeKey?: string | null;
  options?: TestNodeMenuOption[];
}) {
  const onSelectOption = useCallback(
    (
      _option: TestNodeMenuOption,
      _textNode: TextNode | null,
      closeMenu: () => void,
    ) => {
      closeMenu();
    },
    [],
  );

  return (
    <LexicalNodeMenuPlugin<TestNodeMenuOption>
      nodeKey={nodeKey}
      onSelectOption={onSelectOption}
      options={options}
    />
  );
}

function createApp(plugin: React.ReactNode): React.FC {
  return function App() {
    return (
      <LexicalComposer
        initialConfig={{
          namespace: 'test-node-menu',
          nodes: [],
          onError: (err) => {
            throw err;
          },
          theme: {},
        }}>
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        {plugin}
      </LexicalComposer>
    );
  };
}

describe('LexicalNodeMenuPlugin', () => {
  let container: HTMLDivElement;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    reactRoot = createRoot(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('exports', () => {
    it('should export MenuRenderFn type', () => {
      // Validates that MenuRenderFn is exported. If missing, this file
      // won't compile.
      const fn: MenuRenderFn<TestNodeMenuOption> = () => null;
      expect(fn).toBeDefined();
    });

    it('should export MenuOption class', () => {
      const option = new MenuOption('key');
      expect(option.key).toBe('key');
    });

    it('should export MenuResolution type', () => {
      // Validates MenuResolution type export at compile time.
      const res: MenuResolution = {
        getRect: () =>
          ({
            bottom: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            width: 0,
            x: 0,
            y: 0,
          }) as DOMRect,
      };
      expect(res.getRect).toBeDefined();
    });
  });

  describe('with menuRenderFn (backward compatibility)', () => {
    it('should render without errors when menuRenderFn is provided', async () => {
      const App = createApp(<NodeMenuPluginWithMenuRenderFn />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      // With nodeKey=null the menu should not be open
      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });

    it('should accept menuRenderFn as an optional prop', async () => {
      const App = createApp(<NodeMenuPluginWithMenuRenderFn options={[]} />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });
  });

  describe('without menuRenderFn (new default rendering)', () => {
    it('should render without errors when menuRenderFn is omitted', async () => {
      const App = createApp(<NodeMenuPluginWithoutMenuRenderFn />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });

    it('should accept props without menuRenderFn', async () => {
      const App = createApp(<NodeMenuPluginWithoutMenuRenderFn options={[]} />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });
  });
});
