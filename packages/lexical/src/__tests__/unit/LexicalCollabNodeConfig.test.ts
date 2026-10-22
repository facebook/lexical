/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {CodeNode} from '@lexical/code-core';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  booleanValue,
  createEditor,
  ElementNode,
  getDeclaredCollabConfig,
  nodeSchema,
  ParagraphNode,
  TextNode,
  withField,
} from 'lexical';
import {describe, expect, test} from 'vitest';

class FormatNode extends ElementNode {
  $config() {
    return this.config('test_collab_format', {
      collab: {inline: 'format'},
      extends: ElementNode,
    });
  }
}

// Declares no collab keys of its own.
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

// Inherits `inline` from FormatNode and declares `block` itself.
class InlineAndBlockNode extends FormatNode {
  $config() {
    return this.config('test_collab_inline_and_block', {
      collab: {block: 'line'},
      extends: FormatNode,
    });
  }
}

class InlineContentNode extends ElementNode {
  $config() {
    return this.config('test_collab_inline_content', {
      collab: {content: 'inline'},
      extends: ElementNode,
    });
  }
}

class InlineContentChildNode extends InlineContentNode {
  $config() {
    return this.config('test_collab_inline_content_child', {
      collab: {block: 'node'},
      extends: InlineContentNode,
    });
  }
}

class SlottedLineNode extends ElementNode {
  $config() {
    return this.config('test_collab_slotted_line', {
      collab: {block: 'line'},
      extends: ElementNode,
      slots: ['caption'],
    });
  }
}

class KeylessGroupNode extends ElementNode {
  $config() {
    return this.config('test_collab_keyless_group', {
      collab: {block: {items: () => [ParagraphNode], key: [], mode: 'group'}},
      extends: ElementNode,
    });
  }
}

const toggleSchema = nodeSchema<ToggleNode>()({
  block: withField(booleanValue(), {field: '__block'}),
});

// Computes isInline() from a field. The same class without a declaration
// (UndeclaredToggleNode) must behave identically.
class ToggleNode extends ElementNode {
  __block = false;
  $config() {
    return this.config('test_collab_toggle', {
      collab: {inline: 'format'},
      extends: ElementNode,
      json: toggleSchema,
    });
  }
  isInline(): boolean {
    return !this.__block;
  }
  setBlock(block: boolean): this {
    const self = this.getWritable();
    self.__block = block;
    return self;
  }
}

const undeclaredToggleSchema = nodeSchema<UndeclaredToggleNode>()({
  block: withField(booleanValue(), {field: '__block'}),
});

class UndeclaredToggleNode extends ElementNode {
  __block = false;
  $config() {
    return this.config('test_collab_toggle_undeclared', {
      extends: ElementNode,
      json: undeclaredToggleSchema,
    });
  }
  isInline(): boolean {
    return !this.__block;
  }
  setBlock(block: boolean): this {
    const self = this.getWritable();
    self.__block = block;
    return self;
  }
}

describe('getDeclaredCollabConfig', () => {
  test('returns no keys for classes that declare none', () => {
    expect(getDeclaredCollabConfig(ElementNode)).toStrictEqual({});
    expect(getDeclaredCollabConfig(TextNode)).toStrictEqual({});
  });

  test('returns the declared keys', () => {
    expect(getDeclaredCollabConfig(FormatNode)).toStrictEqual({
      inline: 'format',
    });
  });

  test('a subclass inherits each key it does not declare', () => {
    expect(getDeclaredCollabConfig(InheritingNode)).toStrictEqual({
      inline: 'format',
    });
    expect(getDeclaredCollabConfig(NoConfigNode)).toStrictEqual({
      inline: 'format',
    });
    expect(getDeclaredCollabConfig(EmptyCollabNode)).toStrictEqual({
      inline: 'format',
    });
  });

  test('a subclass can override a key', () => {
    expect(getDeclaredCollabConfig(OverridingNode)).toStrictEqual({
      inline: 'element',
    });
  });

  test('block declarations are inherited per key', () => {
    expect(getDeclaredCollabConfig(InlineAndBlockNode)).toStrictEqual({
      block: 'line',
      inline: 'format',
    });
  });

  test('content declarations are inherited per key', () => {
    expect(getDeclaredCollabConfig(InlineContentNode)).toStrictEqual({
      content: 'inline',
    });
    expect(getDeclaredCollabConfig(InlineContentChildNode)).toStrictEqual({
      block: 'node',
      content: 'inline',
    });
  });

  test('reading never throws; bindings validate what they use', () => {
    expect(getDeclaredCollabConfig(SlottedLineNode)).toStrictEqual({
      block: 'line',
    });
    expect(getDeclaredCollabConfig(KeylessGroupNode).block).toMatchObject({
      key: [],
      mode: 'group',
    });
  });

  test('the result is per class, cached and frozen', () => {
    const config = getDeclaredCollabConfig(FormatNode);
    expect(getDeclaredCollabConfig(FormatNode)).toBe(config);
    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe('collab declarations of the built-in nodes', () => {
  test('lines', () => {
    for (const klass of [ParagraphNode, HeadingNode, QuoteNode, ListItemNode]) {
      expect(getDeclaredCollabConfig(klass)).toStrictEqual({block: 'line'});
    }
  });

  test('lists are groups of list items keyed by type and start', () => {
    const {block} = getDeclaredCollabConfig(ListNode);
    expect(block).toMatchObject({
      derived: ['value', 'indent'],
      key: ['listType', 'start'],
      mode: 'group',
      nested: true,
    });
    expect(typeof block === 'object' && block.items()).toEqual([ListItemNode]);
  });

  test('links are formats; AutoLinkNode inherits it', () => {
    expect(getDeclaredCollabConfig(LinkNode)).toStrictEqual({
      inline: 'format',
    });
    expect(getDeclaredCollabConfig(AutoLinkNode)).toStrictEqual({
      inline: 'format',
    });
  });

  test('a code block holds inline content', () => {
    expect(getDeclaredCollabConfig(CodeNode)).toStrictEqual({
      content: 'inline',
    });
  });

  test('the declaration is not serialized', () => {
    const editor = createEditor({
      nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
      onError: e => {
        throw e;
      },
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode().append($createTextNode('x')));
      },
      {discrete: true},
    );
    expect(JSON.stringify(editor.getEditorState().toJSON())).not.toContain(
      'collab',
    );
  });
});

describe('isInline() disagreeing with collab.inline at runtime', () => {
  function run(klass: typeof ToggleNode | typeof UndeclaredToggleNode) {
    const editor = createEditor({
      nodes: [klass],
      onError: e => {
        throw e;
      },
    });
    const states: unknown[] = [];
    const record = () => {
      const json = JSON.stringify(editor.getEditorState().toJSON()).replaceAll(
        klass.getType(),
        'toggle',
      );
      const inline = editor.read(() => {
        const node = $getRoot().getFirstChildOrThrow<ElementNode>();
        const toggle = node.getChildAtIndex(1);
        return $isElementNode(toggle) && toggle.isInline();
      });
      states.push([json, inline]);
    };
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('a '),
            $create(klass as typeof ToggleNode).append($createTextNode('b')),
            $createTextNode(' c'),
          ),
        );
      },
      {discrete: true},
    );
    record();
    for (const block of [true, false]) {
      editor.update(
        () => {
          $getRoot()
            .getFirstChildOrThrow<ElementNode>()
            .getChildAtIndex<ToggleNode>(1)!
            .setBlock(block);
        },
        {discrete: true},
      );
      record();
    }
    // A round trip through JSON keeps the instance's own isInline().
    const restored = createEditor({
      nodes: [klass],
      onError: e => {
        throw e;
      },
    });
    restored.setEditorState(
      restored.parseEditorState(editor.getEditorState().toJSON()),
    );
    states.push(
      JSON.stringify(restored.getEditorState().toJSON()).replaceAll(
        klass.getType(),
        'toggle',
      ),
    );
    return states;
  }

  test('the declaration belongs to the class; isInline() to the instance', () => {
    const states = run(ToggleNode);
    expect(states.map(s => (Array.isArray(s) ? s[1] : null))).toEqual([
      true,
      false,
      true,
      null,
    ]);
    expect(getDeclaredCollabConfig(ToggleNode)).toStrictEqual({
      inline: 'format',
    });
  });

  test('Lexical behaves exactly as without the declaration', () => {
    expect(run(ToggleNode)).toEqual(run(UndeclaredToggleNode));
  });
});
