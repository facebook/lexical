/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalEditor} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import ReactDOM from 'react-dom';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  LexicalMenu,
  MenuOption,
  MenuRenderFn,
  MenuResolution,
} from '../../shared/LexicalMenu';

// Mock the composer context to provide a test editor
vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [createTestEditor()],
}));

class TestOption extends MenuOption {
  title: string;
  constructor(title: string) {
    super(title);
    this.title = title;
  }
}

function createTestResolution(matchingString?: string): MenuResolution {
  return {
    getRect: () =>
      ({
        bottom: 100,
        height: 20,
        left: 10,
        right: 110,
        top: 80,
        width: 100,
        x: 10,
        y: 80,
      }) as DOMRect,
    match: matchingString
      ? {
          leadOffset: 0,
          matchingString,
          replaceableString: matchingString,
        }
      : undefined,
  };
}

describe('MenuOption', () => {
  it('should set key from constructor', () => {
    const option = new MenuOption('test-key');
    expect(option.key).toBe('test-key');
  });

  it('should initialize ref with null current', () => {
    const option = new MenuOption('test-key');
    expect(option.ref).toBeDefined();
    expect(option.ref!.current).toBeNull();
  });

  it('should update ref via setRefElement', () => {
    const option = new MenuOption('test-key');
    const el = document.createElement('div');
    option.setRefElement(el);
    expect(option.ref!.current).toBe(el);
  });

  it('should support optional icon property', () => {
    const option = new MenuOption('test-key');
    expect(option.icon).toBeUndefined();
    option.icon = <i className="test-icon" />;
    expect(option.icon).toBeDefined();
  });

  it('should support optional title property', () => {
    const option = new MenuOption('test-key');
    expect(option.title).toBeUndefined();
    option.title = 'Test Title';
    expect(option.title).toBe('Test Title');
  });

  it('should support JSX Element as title', () => {
    const option = new MenuOption('test-key');
    option.title = <span>Rich Title</span>;
    expect(option.title).toBeDefined();
  });
});

describe('MenuRenderFn type export', () => {
  it('MenuRenderFn should be importable and usable as a type', () => {
    // This test validates that MenuRenderFn is properly exported and has the
    // correct shape. If the type were removed or broken, this file would fail
    // to compile.
    const fn: MenuRenderFn<TestOption> = (
      anchorElementRef,
      itemProps,
      matchingString,
    ) => {
      // Verify the shape of itemProps at runtime
      expect(typeof itemProps.selectOptionAndCleanUp).toBe('function');
      expect(typeof itemProps.setHighlightedIndex).toBe('function');
      expect(Array.isArray(itemProps.options)).toBe(true);
      return null;
    };
    expect(fn).toBeDefined();
  });
});

describe('LexicalMenu', () => {
  let container: HTMLDivElement;
  let reactRoot: Root;
  let editor: LexicalEditor;
  let anchorElement: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    reactRoot = createRoot(container);

    // Create anchor element that portals render into
    anchorElement = document.createElement('div');
    anchorElement.id = 'typeahead-menu';
    document.body.appendChild(anchorElement);

    editor = createTestEditor();
    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    document.body.appendChild(rootElement);
    editor.setRootElement(rootElement);
  });

  afterEach(() => {
    document.body.removeChild(container);
    if (anchorElement.parentNode) {
      document.body.removeChild(anchorElement);
    }
    const rootEl = editor.getRootElement();
    if (rootEl && rootEl.parentNode) {
      document.body.removeChild(rootEl);
    }
    vi.restoreAllMocks();
  });

  describe('default rendering (without menuRenderFn)', () => {
    it('should render menu items using default MenuItem component', async () => {
      const options = [
        new TestOption('Option A'),
        new TestOption('Option B'),
        new TestOption('Option C'),
      ];

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('test')}
            options={options}
            onSelectOption={vi.fn()}
          />,
        );
      });

      // Default rendering creates a portal into the anchor element
      const portal = anchorElement.querySelector('.typeahead-popover');
      expect(portal).not.toBeNull();

      const items = anchorElement.querySelectorAll('li[role="option"]');
      expect(items.length).toBe(3);

      // Verify text content
      const texts = Array.from(items).map(
        (item) => item.querySelector('.text')?.textContent,
      );
      expect(texts).toEqual(['Option A', 'Option B', 'Option C']);
    });

    it('should apply selected class to preselected first item', async () => {
      const options = [new TestOption('First'), new TestOption('Second')];

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('test')}
            options={options}
            onSelectOption={vi.fn()}
            preselectFirstItem={true}
          />,
        );
      });

      const items = anchorElement.querySelectorAll('li[role="option"]');
      expect(items[0].className).toContain('selected');
      expect(items[1].className).not.toContain('selected');
    });

    it('should render nothing when options array is empty', async () => {
      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('test')}
            options={[]}
            onSelectOption={vi.fn()}
          />,
        );
      });

      const portal = anchorElement.querySelector('.typeahead-popover');
      expect(portal).toBeNull();
    });

    it('should render icon and title in default MenuItem', async () => {
      const option = new TestOption('With Icon');
      option.icon = <i className="custom-icon" />;

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('test')}
            options={[option]}
            onSelectOption={vi.fn()}
          />,
        );
      });

      const icon = anchorElement.querySelector('.custom-icon');
      expect(icon).not.toBeNull();

      const text = anchorElement.querySelector('.text');
      expect(text?.textContent).toBe('With Icon');
    });
  });

  describe('custom rendering (with menuRenderFn)', () => {
    it('should use menuRenderFn when provided', async () => {
      const options = [new TestOption('Custom A'), new TestOption('Custom B')];

      const customRenderFn: MenuRenderFn<TestOption> = (
        anchorElementRef,
        itemProps,
        matchingString,
      ) => {
        return anchorElementRef.current
          ? ReactDOM.createPortal(
              <div className="custom-menu" data-testid="custom-menu">
                {itemProps.options.map((option, i) => (
                  <button
                    key={option.key}
                    className={
                      itemProps.selectedIndex === i ? 'active' : 'inactive'
                    }
                    onClick={() => itemProps.selectOptionAndCleanUp(option)}>
                    {option.title}
                  </button>
                ))}
                <span className="matching-string">{matchingString}</span>
              </div>,
              anchorElementRef.current,
            )
          : null;
      };

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('hello')}
            options={options}
            menuRenderFn={customRenderFn}
            onSelectOption={vi.fn()}
          />,
        );
      });

      // Custom rendering should be used, NOT the default
      const defaultMenu = anchorElement.querySelector('.typeahead-popover');
      expect(defaultMenu).toBeNull();

      const customMenu = anchorElement.querySelector('.custom-menu');
      expect(customMenu).not.toBeNull();

      const buttons = anchorElement.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('Custom A');
      expect(buttons[1].textContent).toBe('Custom B');

      // Verify matchingString is passed through
      const matchingStr = anchorElement.querySelector('.matching-string');
      expect(matchingStr?.textContent).toBe('hello');
    });

    it('should pass selectedIndex to menuRenderFn', async () => {
      const options = [new TestOption('A'), new TestOption('B')];
      let capturedSelectedIndex: number | null = null;

      const customRenderFn: MenuRenderFn<TestOption> = (
        _anchorRef,
        itemProps,
      ) => {
        capturedSelectedIndex = itemProps.selectedIndex;
        return null;
      };

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('test')}
            options={options}
            menuRenderFn={customRenderFn}
            onSelectOption={vi.fn()}
            preselectFirstItem={true}
          />,
        );
      });

      // With preselectFirstItem=true, selectedIndex should be 0
      expect(capturedSelectedIndex).toBe(0);
    });

    it('should pass options array to menuRenderFn', async () => {
      const options = [
        new TestOption('X'),
        new TestOption('Y'),
        new TestOption('Z'),
      ];
      let capturedOptions: TestOption[] = [];

      const customRenderFn: MenuRenderFn<TestOption> = (
        _anchorRef,
        itemProps,
      ) => {
        capturedOptions = itemProps.options;
        return null;
      };

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution('test')}
            options={options}
            menuRenderFn={customRenderFn}
            onSelectOption={vi.fn()}
          />,
        );
      });

      expect(capturedOptions).toHaveLength(3);
      expect(capturedOptions.map((o) => o.title)).toEqual(['X', 'Y', 'Z']);
    });

    it('should pass empty string as matchingString when no match', async () => {
      let capturedMatchingString: string | null = 'NOT_SET';

      const customRenderFn: MenuRenderFn<TestOption> = (
        _anchorRef,
        _itemProps,
        matchingString,
      ) => {
        capturedMatchingString = matchingString;
        return null;
      };

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <LexicalMenu<TestOption>
            close={vi.fn()}
            editor={editor}
            anchorElementRef={{current: anchorElement}}
            resolution={createTestResolution()}
            options={[new TestOption('A')]}
            menuRenderFn={customRenderFn}
            onSelectOption={vi.fn()}
          />,
        );
      });

      // When resolution.match is undefined, matchingString should be ''
      expect(capturedMatchingString).toBe('');
    });
  });
});
