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
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  MenuRenderFn,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {TextNode} from 'lexical';
import * as React from 'react';
import {useCallback} from 'react';
import ReactDOM from 'react-dom';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

class TestMenuOption extends MenuOption {
  title: string;
  constructor(title: string) {
    super(title);
    this.title = title;
  }
}

const TEST_OPTIONS = [
  new TestMenuOption('Alpha'),
  new TestMenuOption('Beta'),
  new TestMenuOption('Gamma'),
];

function TypeaheadPluginWithMenuRenderFn({
  options = TEST_OPTIONS,
}: {
  options?: TestMenuOption[];
}) {
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const onSelectOption = useCallback(
    (
      _option: TestMenuOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
    ) => {
      closeMenu();
    },
    [],
  );

  const menuRenderFn: MenuRenderFn<TestMenuOption> = useCallback(
    (anchorElementRef, itemProps, matchingString) => {
      return anchorElementRef.current && itemProps.options.length
        ? ReactDOM.createPortal(
            <div
              className="custom-typeahead-menu"
              data-testid="custom-typeahead">
              <ul>
                {itemProps.options.map((option, i) => (
                  <li
                    key={option.key}
                    data-selected={itemProps.selectedIndex === i}
                    className="custom-item">
                    {option.title}
                  </li>
                ))}
              </ul>
              {matchingString != null && (
                <span data-testid="matching-string">{matchingString}</span>
              )}
            </div>,
            anchorElementRef.current,
          )
        : null;
    },
    [],
  );

  return (
    <LexicalTypeaheadMenuPlugin<TestMenuOption>
      onQueryChange={vi.fn()}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={menuRenderFn}
    />
  );
}

function TypeaheadPluginWithoutMenuRenderFn({
  options = TEST_OPTIONS,
}: {
  options?: TestMenuOption[];
}) {
  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const onSelectOption = useCallback(
    (
      _option: TestMenuOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
    ) => {
      closeMenu();
    },
    [],
  );

  return (
    <LexicalTypeaheadMenuPlugin<TestMenuOption>
      onQueryChange={vi.fn()}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
    />
  );
}

function createApp(plugin: React.ReactNode): React.FC {
  return function App() {
    return (
      <LexicalComposer
        initialConfig={{
          namespace: 'test-typeahead',
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

describe('LexicalTypeaheadMenuPlugin', () => {
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
      // This test validates that MenuRenderFn is exported from the plugin.
      // If the export is missing, this file won't compile.
      const fn: MenuRenderFn<TestMenuOption> = () => null;
      expect(fn).toBeDefined();
    });

    it('should export MenuOption class', () => {
      const option = new MenuOption('key');
      expect(option.key).toBe('key');
    });
  });

  describe('with menuRenderFn (backward compatibility)', () => {
    it('should render without errors when menuRenderFn is provided', async () => {
      const App = createApp(<TypeaheadPluginWithMenuRenderFn />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      // The plugin should mount without errors.
      // Since the typeahead menu is not triggered (no user input),
      // the menu should not be visible yet.
      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });

    it('should accept menuRenderFn as an optional prop', async () => {
      // Verify that TypeScript accepts menuRenderFn in the props.
      // This is a compile-time check that also confirms the prop is wired.
      const App = createApp(<TypeaheadPluginWithMenuRenderFn options={[]} />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });
  });

  describe('without menuRenderFn (new default rendering)', () => {
    it('should render without errors when menuRenderFn is omitted', async () => {
      const App = createApp(<TypeaheadPluginWithoutMenuRenderFn />);

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      // The plugin should mount without errors even without menuRenderFn.
      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });

    it('should accept props without menuRenderFn', async () => {
      const App = createApp(
        <TypeaheadPluginWithoutMenuRenderFn options={[]} />,
      );

      await ReactTestUtils.act(async () => {
        reactRoot.render(<App />);
      });

      expect(container.querySelector('[contenteditable]')).not.toBeNull();
    });
  });
});
