/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Browser-test helper that simulates IME composition sequences by
 * dispatching the same event sequence a real IME produces, combined
 * with direct DOM text-node mutations (since untrusted events don't
 * trigger browser-level DOM updates).
 *
 * Chrome/Safari order:
 *   compositionstart → (compositionupdate + beforeinput + DOM mutation +
 *   input)* → beforeinput(insertCompositionText, final) + DOM mutation +
 *   input(isComposing=false) → compositionend
 *
 * Firefox order:
 *   compositionstart → (compositionupdate + beforeinput + DOM mutation +
 *   input)* → compositionend → input(isComposing=false)
 */

export interface CompositionStep {
  /** The cumulative composing text at this step. */
  text: string;
  /**
   * Selection offset within the composing text.
   * Defaults to `text.length` (cursor at end).
   */
  selectionStart?: number;
  selectionEnd?: number;
}

export interface CompositionSequence {
  /** Intermediate composition states (each keystroke). */
  steps: CompositionStep[];
  /** The final committed text. If omitted, uses the last step's text. */
  commitText?: string;
  /**
   * If true, simulate composition cancellation (Escape) instead of
   * committing. The DOM reverts to pre-composition text.
   */
  cancel?: boolean;
}

interface CompositionTarget {
  /** The contentEditable root element the editor is attached to. */
  rootElement: HTMLElement;
}

function getActiveTextNode(root: HTMLElement): Text | null {
  const sel = document.getSelection();
  if (sel && sel.rangeCount > 0) {
    const node = sel.focusNode;
    if (node instanceof Text && root.contains(node)) {
      return node;
    }
  }
  return null;
}

function dispatchCompositionEvent(
  target: HTMLElement,
  type: 'compositionstart' | 'compositionupdate' | 'compositionend',
  data: string,
): void {
  target.dispatchEvent(
    new CompositionEvent(type, {bubbles: true, cancelable: true, data}),
  );
}

function dispatchBeforeInput(
  target: HTMLElement,
  data: string,
  inputType: string,
  targetRange?: StaticRange,
): void {
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data,
    inputType,
  });
  Object.defineProperty(event, 'getTargetRanges', {
    value: () => (targetRange ? [targetRange] : []),
  });
  target.dispatchEvent(event);
}

function dispatchInputEvent(
  target: HTMLElement,
  data: string,
  inputType: string,
  isComposing: boolean,
): void {
  const event = new InputEvent('input', {
    bubbles: true,
    cancelable: false,
    data,
    inputType,
  });
  // InputEvent.isComposing is readonly; override it for untrusted events.
  Object.defineProperty(event, 'isComposing', {value: isComposing});
  target.dispatchEvent(event);
}

function setSelectionAt(textNode: Text, start: number, end: number): void {
  const sel = document.getSelection();
  if (!sel) {
    return;
  }
  sel.setBaseAndExtent(textNode, start, textNode, end);
}

/**
 * Mutate the DOM text node to reflect the current composition state,
 * replacing the composing region with the new text.
 *
 * Returns the text node (which may have been created if the target was
 * an empty element).
 */
function applyDOMMutation(
  root: HTMLElement,
  composingText: string,
  composingStart: number,
  previousComposingLength: number,
): Text {
  let textNode = getActiveTextNode(root);
  if (!textNode) {
    // Empty paragraph — create a text node.
    const sel = document.getSelection();
    const focusNode = sel?.focusNode;
    if (focusNode instanceof HTMLElement && root.contains(focusNode)) {
      // Remove any <br> placeholder.
      const br = focusNode.querySelector('br');
      if (br) {
        br.remove();
      }
      textNode = document.createTextNode('');
      focusNode.appendChild(textNode);
    } else {
      throw new Error('compose(): cannot find a suitable insertion point');
    }
  }

  const value = textNode.nodeValue || '';
  const before = value.slice(0, composingStart);
  const after = value.slice(composingStart + previousComposingLength);
  textNode.nodeValue = before + composingText + after;
  return textNode;
}

/**
 * Simulate a full IME composition sequence in a browser test.
 *
 * Usage:
 * ```ts
 * await compose(
 *   {rootElement: editor.getRootElement()!},
 *   {
 *     steps: [
 *       {text: 'ㅎ'},
 *       {text: '하'},
 *       {text: '한'},
 *     ],
 *     commitText: '한',
 *   },
 * );
 * ```
 */
export async function compose(
  target: CompositionTarget,
  sequence: CompositionSequence,
): Promise<void> {
  const {rootElement} = target;
  const {steps, cancel} = sequence;
  const commitText =
    sequence.commitText ??
    (steps.length > 0 ? steps[steps.length - 1].text : '');

  if (steps.length === 0) {
    return;
  }

  const isFirefox =
    typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent);

  let previousComposingLength = 0;
  let composingStart = 0;

  // --- intermediate steps ---
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const {text} = step;
    const selStart = step.selectionStart ?? text.length;
    const selEnd = step.selectionEnd ?? selStart;

    // Each keystroke fires keydown(Process). The first keystroke also
    // triggers compositionstart before compositionupdate — this matches
    // the real browser sequence where one keydown produces both events.
    rootElement.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Process',
        keyCode: 229,
      }),
    );

    if (i === 0) {
      dispatchCompositionEvent(rootElement, 'compositionstart', '');

      // Re-read the cursor position AFTER compositionstart: Lexical may
      // have inserted a ZWSP (format mismatch, element anchor, etc.),
      // shifting the actual composing start offset.
      const sel = document.getSelection();
      composingStart = sel ? sel.focusOffset : 0;
    }

    dispatchCompositionEvent(rootElement, 'compositionupdate', text);

    const rangeNode = getActiveTextNode(rootElement);
    const targetRange =
      rangeNode != null
        ? new StaticRange({
            endContainer: rangeNode,
            endOffset: composingStart + previousComposingLength,
            startContainer: rangeNode,
            startOffset: composingStart,
          })
        : undefined;
    dispatchBeforeInput(
      rootElement,
      text,
      'insertCompositionText',
      targetRange,
    );

    const textNode = applyDOMMutation(
      rootElement,
      text,
      composingStart,
      previousComposingLength,
    );

    setSelectionAt(
      textNode,
      composingStart + selStart,
      composingStart + selEnd,
    );

    previousComposingLength = text.length;

    dispatchInputEvent(rootElement, text, 'insertCompositionText', true);
  }

  // --- commit or cancel ---
  if (cancel) {
    rootElement.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Escape'}),
    );
    // Revert the composing text.
    applyDOMMutation(rootElement, '', composingStart, previousComposingLength);
    const textNode = getActiveTextNode(rootElement);
    if (textNode) {
      setSelectionAt(textNode, composingStart, composingStart);
    }

    dispatchCompositionEvent(rootElement, 'compositionend', '');
    dispatchInputEvent(rootElement, '', 'insertCompositionText', false);
  } else {
    // Build the commit targetRange (composing region before final mutation).
    const commitRangeNode = getActiveTextNode(rootElement);
    const commitTargetRange =
      commitRangeNode != null
        ? new StaticRange({
            endContainer: commitRangeNode,
            endOffset: composingStart + previousComposingLength,
            startContainer: commitRangeNode,
            startOffset: composingStart,
          })
        : undefined;

    // Firefox fires compositionend before the final input; Chrome/Safari
    // fires it after. The beforeinput → mutation → input sequence is the
    // same in both — only compositionend placement differs.
    if (isFirefox) {
      dispatchCompositionEvent(rootElement, 'compositionend', commitText);
    }

    dispatchBeforeInput(
      rootElement,
      commitText,
      'insertCompositionText',
      commitTargetRange,
    );
    const textNode = applyDOMMutation(
      rootElement,
      commitText,
      composingStart,
      previousComposingLength,
    );
    setSelectionAt(
      textNode,
      composingStart + commitText.length,
      composingStart + commitText.length,
    );
    dispatchInputEvent(rootElement, commitText, 'insertCompositionText', false);

    if (!isFirefox) {
      dispatchCompositionEvent(rootElement, 'compositionend', commitText);
    }
  }

  // Let microtasks (update listeners, mutation observer) flush.
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Convenience: build a Korean Hangul composition sequence from
 * incremental jamo assembly. Each string in `parts` is the cumulative
 * composing text at that keystroke.
 *
 * Example — typing "한":
 * ```ts
 * korean(['ㅎ', '하', '한'])
 * // → {steps: [{text: 'ㅎ'}, {text: '하'}, {text: '한'}], commitText: '한'}
 * ```
 */
export function korean(
  parts: string[],
  commitText?: string,
): CompositionSequence {
  return {
    commitText: commitText ?? parts[parts.length - 1],
    steps: parts.map(text => ({text})),
  };
}
