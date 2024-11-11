/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalEditor} from 'lexical';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

import {ContentEditableElement} from '../../shared/LexicalContentEditableElement';

describe('ContentEditableElement tests', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;
  let mockEditor: LexicalEditor;

  beforeEach(() => {
    // Create a container for rendering
    container = document.createElement('div');
    document.body.appendChild(container);
    reactRoot = createRoot(container);

    // Mock LexicalEditor
    mockEditor = {
      isEditable: jest.fn(() => true),
      registerEditableListener: jest.fn((cb) => {
        cb(true || false); // Simulate editable state
        return jest.fn(); // Mock unregister function
      }),
      setRootElement: jest.fn(),
    } as unknown as LexicalEditor;
  });

  afterEach(async () => {
    // Cleanup the DOM and mocks
    if (container) {
      await ReactTestUtils.act(async () => {
        reactRoot.unmount(); // Wrap unmount in act
      });
      document.body.removeChild(container);
    }
    jest.restoreAllMocks(); // Restore mocks after each test
  });

  it('renders the correct ARIA attributes when editable', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          ariaLabelledBy="test-label"
          role="textbox"
        />,
      );
    });

    const element = container!.querySelector('[role="textbox"]')!;
    expect(element.getAttribute('aria-labelledby')).toBe('test-label');
    expect(element.getAttribute('contenteditable')).toBe('true');
  });

  it('renders the correct ARIA attributes for different roles', async () => {
    const roles = ['textbox', 'combobox', 'listbox', 'spinbutton'];

    for (const role of roles) {
      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <ContentEditableElement editor={mockEditor} role={role} />,
        );
      });

      const element = container!.querySelector(`[role="${role}"]`)!;
      expect(element.getAttribute('role')).toBe(role);
    }
  });
  it('renders optional ARIA attributes when provided', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          ariaDescribedBy="test-description"
          role="textbox"
        />,
      );
    });

    const element = container!.querySelector('[role="textbox"]')!;
    expect(element.getAttribute('aria-describedby')).toBe('test-description'); // Check aria-describedby
  });

  it('renders aria-expanded correctly for role combobox', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          role="combobox"
          ariaExpanded={true} // Provide ariaExpanded
        />,
      );
    });

    const element = container!.querySelector('[role="combobox"]')!;

    expect(element.getAttribute('aria-expanded')).toBe('true'); // Verify that aria-expanded is correctly set.
  });

  it('renders aria-invalid and aria-required correctly', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          ariaInvalid="true" // Mark as invalid
          ariaRequired={true} // Mark as required
          role="textbox"
        />,
      );
    });

    const element = container!.querySelector('[role="textbox"]')!;
    expect(element.getAttribute('aria-invalid')).toBe('true'); // Verify aria-invalid
    expect(element.getAttribute('aria-required')).toBe('true'); // Verify aria-required
  });

  it('applies custom attributes and styles correctly', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          role="textbox"
          data-testid="test-element"
          style={{color: 'red', fontSize: '16px'}}
        />,
      );
    });

    const element = container!.querySelector('[role="textbox"]') as HTMLElement;
    expect(element.getAttribute('data-testid')).toBe('test-element'); // Verify custom data attribute
    expect(element.style.color).toBe('red'); // Verify inline styles
    expect(element.style.fontSize).toBe('16px'); // Verify inline styles
  });

  it('renders aria-invalid and aria-required correctly when set to false', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          ariaInvalid="false" // Not invalid
          ariaRequired={false} // Not required
          role="textbox"
        />,
      );
    });

    const element = container!.querySelector('[role="textbox"]')!;
    expect(element.getAttribute('aria-invalid')).toBe('false'); // Verify aria-invalid
    expect(element.getAttribute('aria-required')).toBe('false'); // Verify aria-required
  });

  it('renders custom data attributes correctly', async () => {
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement
          editor={mockEditor}
          role="textbox"
          data-testid="test-element"
          data-custom-attribute="custom-value"
        />,
      );
    });

    const element = container!.querySelector('[role="textbox"]')!;
    expect(element.getAttribute('data-testid')).toBe('test-element'); // Verify custom data attribute
    expect(element.getAttribute('data-custom-attribute')).toBe('custom-value'); // Verify custom data attribute
  });

  it('registers and cleans up root element properly', async () => {
    let rootElement: HTMLElement | null = null;
    mockEditor.setRootElement = jest.fn((element) => {
      rootElement = element;
    });

    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <ContentEditableElement editor={mockEditor} role="textbox" />,
      );
    });

    const element = container!.querySelector('[role="textbox"]')!;
    expect(rootElement).toBe(element); // Verify registration.

    await ReactTestUtils.act(async () => {
      reactRoot.unmount(); // Unmount the component.
    });

    expect(rootElement).toBeNull(); // Verify cleanup.
  });

  it('renders the correct spellCheck attribute for different values', async () => {
    const spellCheckValues = [true, false];

    for (const spellCheck of spellCheckValues) {
      await ReactTestUtils.act(async () => {
        reactRoot.render(
          <ContentEditableElement
            editor={mockEditor}
            spellCheck={spellCheck}
            role="textbox"
          />,
        );
      });

      const element = container!.querySelector('[role="textbox"]')!;
      expect(element.getAttribute('spellcheck')).toBe(spellCheck.toString());
    }
  });
});
