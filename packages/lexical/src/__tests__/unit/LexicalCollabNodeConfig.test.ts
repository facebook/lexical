/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {ElementNode, getDeclaredCollabConfig, TextNode} from 'lexical';
import {describe, expect, test} from 'vitest';

class FormatNode extends ElementNode {
  $config() {
    return this.config('test_collab_format', {
      collab: {inline: 'format'},
      extends: ElementNode,
    });
  }
}

// Declares no collab hints of its own.
class InheritingNode extends FormatNode {
  $config() {
    return this.config('test_collab_inheriting', {extends: FormatNode});
  }
}

// Declares `collab` without `inline`: the inherited `inline` stays.
class EmptyCollabNode extends FormatNode {
  $config() {
    return this.config('test_collab_empty', {
      collab: {},
      extends: FormatNode,
    });
  }
}

class OverridingNode extends FormatNode {
  $config() {
    return this.config('test_collab_overriding', {
      collab: {inline: 'element'},
      extends: FormatNode,
    });
  }
}

// No $config of its own at all.
class NoConfigNode extends FormatNode {}

describe('getDeclaredCollabConfig', () => {
  test('returns no hints for classes that declare none', () => {
    expect(getDeclaredCollabConfig(ElementNode)).toEqual({});
    expect(getDeclaredCollabConfig(TextNode)).toEqual({});
  });

  test('returns the declared hints', () => {
    expect(getDeclaredCollabConfig(FormatNode)).toEqual({inline: 'format'});
  });

  test('a subclass inherits each key it does not declare', () => {
    expect(getDeclaredCollabConfig(InheritingNode)).toEqual({
      inline: 'format',
    });
    expect(getDeclaredCollabConfig(NoConfigNode)).toEqual({inline: 'format'});
    expect(getDeclaredCollabConfig(EmptyCollabNode)).toEqual({
      inline: 'format',
    });
  });

  test('a subclass can override a key', () => {
    expect(getDeclaredCollabConfig(OverridingNode)).toEqual({
      inline: 'element',
    });
  });
});
