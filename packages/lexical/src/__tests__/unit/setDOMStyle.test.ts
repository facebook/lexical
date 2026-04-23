/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  getStyleObjectFromCSS,
  setDOMStyleFromCSS,
  setDOMStyleObject,
} from 'lexical';
import {describe, expect, it} from 'vitest';

describe('setDOMStyle', () => {
  it('parses CSS text into a style object', () => {
    expect(
      getStyleObjectFromCSS(
        'color: red; margin: 0 !important; --custom: example;',
      ),
    ).toEqual({
      '--custom': 'example',
      color: 'red',
      margin: '0 !important',
    });
  });

  it('parses values with comments, semicolons and colons inside quotes and parentheses', () => {
    expect(
      getStyleObjectFromCSS(
        'background-image: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'></svg>"); /* ignored */ content: "semi;colon:value"; color: red;',
      ),
    ).toEqual({
      'background-image':
        'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'></svg>")',
      color: 'red',
      content: '"semi;colon:value"',
    });
  });

  it('returns a fresh style object for each parse', () => {
    const styleObject = getStyleObjectFromCSS('color: red;');
    styleObject.color = 'blue';

    expect(getStyleObjectFromCSS('color: red;')).toEqual({color: 'red'});
  });

  it('applies CSS text without cssText', () => {
    const element = document.createElement('div');

    setDOMStyleFromCSS(
      element.style,
      'color: red; margin: 0 !IMPORTANT; --custom: example;',
    );

    expect(element.style.color).toBe('red');
    expect(element.style.getPropertyPriority('margin')).toBe('important');
    expect(element.style.getPropertyValue('--custom')).toBe('example');
  });

  it('replaces previous inline styles when CSS text changes', () => {
    const element = document.createElement('div');

    setDOMStyleFromCSS(
      element.style,
      'color: red; margin: 0 !important; --custom: example;',
    );
    setDOMStyleFromCSS(
      element.style,
      'padding: 1px;',
      'color: red; margin: 0 !important; --custom: example;',
    );

    expect(element.style.color).toBe('');
    expect(element.style.margin).toBe('');
    expect(element.style.getPropertyValue('--custom')).toBe('');
    expect(element.style.padding).toBe('1px');
  });

  it('applies direct style objects', () => {
    const element = document.createElement('div');

    setDOMStyleObject(element.style, {
      color: 'red',
      margin: '0 !IMPORTANT',
      padding: null,
    });

    expect(element.style.color).toBe('red');
    expect(element.style.getPropertyPriority('margin')).toBe('important');
    expect(element.style.padding).toBe('');
  });
});
