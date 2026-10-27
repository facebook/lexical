/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  decodeNativeNamedCharacterReference,
} from '@lexical/markdown';
import {characterEntities} from 'character-entities';
import {$getRoot} from 'lexical';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {assert, beforeEach, describe, expect, it, onTestFinished} from 'vitest';

import {$unescapeText} from '../../utils';
import {MarkdownTestExtension} from '../utils';

let decoderEditor: ReturnType<typeof buildEditorFromExtensions>;
beforeEach(() => {
  decoderEditor = buildEditorFromExtensions();
  onTestFinished(() => decoderEditor.dispose());
});

function unescapeText(value: string) {
  return decoderEditor.read(() => $unescapeText(value));
}

describe('browser Markdown reference semantics', () => {
  it('rejects incomplete or invalid names at the native adapter boundary', () => {
    for (const name of ['', 'amp;copy', '<b>', '&copy', 'a'.repeat(33)]) {
      expect(decodeNativeNamedCharacterReference(name)).toBeUndefined();
    }
  });
  it.skipIf(!('setHTML' in Element.prototype))(
    'uses safe native decoding when string HTML assignments are unavailable',
    () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'innerHTML',
      );
      assert(descriptor);
      Object.defineProperty(Element.prototype, 'innerHTML', {
        configurable: true,
        get: descriptor.get,
        set() {
          throw new TypeError('HTML string assignment is unavailable');
        },
      });
      try {
        expect(unescapeText('&amp;&NotEqualTilde;')).toBe('&\u2242\u0338');
      } finally {
        Object.defineProperty(Element.prototype, 'innerHTML', descriptor);
      }
    },
  );
  it('decodes the complete named-reference set once through the browser entry', () => {
    for (const [name, value] of Object.entries(characterEntities)) {
      expect(unescapeText('&' + name + ';'), name).toBe(value);
      expect(unescapeText('\\&' + name + ';'), name).toBe('&' + name + ';');
      expect(unescapeText('&amp;' + name + ';'), name).toBe('&' + name + ';');
    }
    for (const name of ['notit', 'constructor', 'toString', 'semiX', 'AMPx'])
      expect(unescapeText('&' + name + ';')).toBe('&' + name + ';');
  });

  it('supports the legacy native decoder when setHTML is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'setHTML',
    );
    Object.defineProperty(Element.prototype, 'setHTML', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(unescapeText('&semi; &notit; &amp; &NotEqualTilde;')).toBe(
        '; &notit; & \u2242\u0338',
      );
    } finally {
      if (descriptor)
        Object.defineProperty(Element.prototype, 'setHTML', descriptor);
      else Reflect.deleteProperty(Element.prototype, 'setHTML');
    }
  });

  it.each([
    ['&lt;b&gt;text&lt;/b&gt;', '<b>text</b>'],
    ['&NotEqualTilde;', '\u2242\u0338'],
    [String.raw`\&lt;b\&gt;`, '&lt;b&gt;'],
    ['&amp;#60;', '&#60;'],
    ['&#x3c;b&#62;', '<b>'],
    ['&nosuch;', '&nosuch;'],
  ])('imports %j once and exports literal text', (markdown, text) => {
    const editor = buildEditorFromExtensions([MarkdownTestExtension]);
    const element = document.createElement('div');
    document.body.append(element);
    editor.setRootElement(element);
    try {
      editor.update(() => $convertFromMarkdownString(markdown), {
        discrete: true,
      });
      expect(element.textContent).toBe(text);
      expect(element.querySelector('b')).toBeNull();
      const exported = editor.read(() => $convertToMarkdownString());
      const tree = fromMarkdown(exported);
      expect(tree.children).toMatchObject([
        {children: [{type: 'text', value: text}], type: 'paragraph'},
      ]);
      editor.update(() => $convertFromMarkdownString(exported), {
        discrete: true,
      });
      expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    } finally {
      editor.dispose();
      element.remove();
    }
  });
});
