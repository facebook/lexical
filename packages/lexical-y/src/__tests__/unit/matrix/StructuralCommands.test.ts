/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Structural commands in block containers, where node structure is enforced
// (NodeStructureExtension in an unbound editor, and an editor bound with
// @lexical/y, which always enforces it): list conversion of each type, Enter
// in an empty last list item, pasting two paragraphs mid-text, inserting a
// horizontal rule at the nearest root, and the markdown block shortcuts, in
// the root, a container that declares nothing (`plain`), one that declares
// `children: 'block'` (`declared`), a shadow root, each nested in one of its
// own kind, and a shadow root held in a named slot of a block decorator.
//
// The expected outcome of each cell comes from a model of the rule (a
// container acts as a root for these commands when it is a shadow root, or a
// class declaring `children: 'block'`), checked with predicates on the
// result, not from another tree's output. Cells where main does not follow
// the rule yet are `test.fails` naming the pull request that adds it.

import {CodeExtension} from '@lexical/code-core';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  buildEditorFromExtensions,
  HorizontalRuleExtension,
  NodeStructureExtension,
} from '@lexical/extension';
import {LinkExtension} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $insertList,
  $isListItemNode,
  $isListNode,
  ListExtension,
  type ListType,
} from '@lexical/list';
import {registerMarkdownShortcuts} from '@lexical/markdown';
import {
  $isHeadingNode,
  $isQuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSlot,
  type AnyLexicalExtensionArgument,
  configExtension,
  DecoratorNode,
  defineExtension,
  ElementNode,
  INSERT_PARAGRAPH_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {YCollabExtension} from '../../..';
import {createYDoc} from '../../../headless';

class PlainBoxNode extends ElementNode {
  $config() {
    return this.config('catalog_plain_box', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
}
class DeclaredBoxNode extends ElementNode {
  $config() {
    return this.config('catalog_declared_box', {
      children: 'block',
      extends: ElementNode,
    });
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
}
class ShadowBoxNode extends ElementNode {
  $config() {
    return this.config('catalog_shadow_box', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
  isShadowRoot(): boolean {
    return true;
  }
}

class SlotHostNode extends DecoratorNode<null> {
  $config() {
    return this.config('catalog_slot_host', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

type Kind = 'root' | 'plain' | 'declared' | 'shadow' | 'slot';
type Ctx = {kind: Kind; nested: boolean};
const CTXS: Ctx[] = [
  {kind: 'root', nested: false},
  ...(['plain', 'declared', 'shadow'] as const).flatMap(kind => [
    {kind, nested: false},
    {kind, nested: true},
  ]),
  {kind: 'slot', nested: false},
];
const ctxName = (c: Ctx) =>
  c.kind === 'slot'
    ? 'shadow root in a named slot'
    : c.nested
      ? `${c.kind} in ${c.kind}`
      : c.kind;
const TYPE: Record<Kind, string> = {
  declared: 'catalog_declared_box',
  plain: 'catalog_plain_box',
  root: 'root',
  shadow: 'catalog_shadow_box',
  slot: 'catalog_shadow_box',
};

function $box(kind: Kind, ...children: LexicalNode[]): ElementNode {
  const box =
    kind === 'plain'
      ? new PlainBoxNode()
      : kind === 'declared'
        ? new DeclaredBoxNode()
        : new ShadowBoxNode();
  return box.append(...children);
}

const $p = (text: string) =>
  $createParagraphNode().append($createTextNode(text));

/** p("before") / CONTAINER(...inner) / p("after"); returns the container. */
function $build(ctx: Ctx, inner: () => LexicalNode[]) {
  const root = $getRoot().clear();
  if (ctx.kind === 'root') {
    root.append($p('before'), ...inner(), $p('after'));
    return;
  }
  if (ctx.kind === 'slot') {
    const host = new SlotHostNode();
    root.append($p('before'), host, $p('after'));
    $setSlot(host, 'body', $box('shadow', ...inner()));
    return;
  }
  const box = ctx.nested
    ? $box(ctx.kind, $box(ctx.kind, ...inner()))
    : $box(ctx.kind, ...inner());
  root.append($p('before'), box, $p('after'));
}

function $all(keep: (n: LexicalNode) => boolean): LexicalNode[] {
  const out: LexicalNode[] = [];
  const walk = (n: LexicalNode) => {
    if (keep(n)) {
      out.push(n);
    }
    for (const name of $getSlotNames(n)) {
      const slot = $getSlot(n, name);
      if (slot !== null) {
        walk(slot);
      }
    }
    if ($isElementNode(n)) {
      n.getChildren().forEach(walk);
    }
  };
  walk($getRoot());
  return out;
}

const $text = (s: string) =>
  $all(n => $isTextNode(n) && n.getTextContent().includes(s))[0] as
    | TextNode
    | undefined;

function $caret(s: string, offset: number) {
  const t = $text(s)!;
  t.select(offset, offset);
}

/** The innermost container of the context (the root for `root`). */
function $container(ctx: Ctx): ElementNode | undefined {
  if (ctx.kind === 'root') {
    return $getRoot();
  }
  const boxes = $all(n => n.getType() === TYPE[ctx.kind]) as ElementNode[];
  return ctx.nested ? boxes[1] : boxes[0];
}

const $count = (ctx: Ctx) =>
  ctx.kind === 'root' ? 1 : $all(n => n.getType() === TYPE[ctx.kind]).length;

type Outcome = 'in place' | 'not in place' | 'no list';

/**
 * The rule: where structure is enforced, a shadow root or a class declaring
 * `children: 'block'` is a block container, so the command acts inside it;
 * a container that declares nothing is one more block. `main` is what main
 * does before the rule (declared containers act like plain ones), and for
 * list conversion in a plain box inside a plain box it loses the list
 * (#9570).
 */
function model(cmd: Cmd, ctx: Ctx, tree: 'rule' | 'main'): Outcome {
  const container =
    ctx.kind === 'root' ||
    ctx.kind === 'shadow' ||
    ctx.kind === 'slot' ||
    (ctx.kind === 'declared' && tree === 'rule');
  if (container) {
    return 'in place';
  }
  if (cmd.list !== undefined && ctx.nested) {
    // #9570: the box stays and the paragraph becomes a list in place, with
    // the rule; main drops the outer box and makes no list.
    return tree === 'rule' ? 'in place' : 'no list';
  }
  return 'not in place';
}

type Cmd = {
  name: string;
  list?: ListType;
  inner: () => LexicalNode[];
  run: (editor: LexicalEditor) => void;
  type?: string;
  /** Whether the result is the command acting inside the container. */
  $check: (ctx: Ctx, before: number) => Outcome;
};

const $_PARAS = () => [$p('abc'), $p('def')];

const CMDS: Cmd[] = [
  ...(['bullet', 'number', 'check'] as const).map(
    (type): Cmd => ({
      $check: (ctx, before) => {
        const lists = $all(
          n => $isListNode(n) && n.getListType() === type,
        ) as ElementNode[];
        if (lists.length === 0) {
          return 'no list';
        }
        const list = lists.find(l => l.getTextContent().includes('abc'))!;
        const container = $container(ctx);
        const def = $text('def')!.getParent()!;
        return container !== undefined &&
          $count(ctx) === before &&
          list.getParent() === container &&
          !list.getTextContent().includes('def') &&
          $isParagraphNode(def) &&
          def.getParent() === container
          ? 'in place'
          : 'not in place';
      },
      inner: $_PARAS,
      list: type,
      name: `$insertList('${type}')`,
      run: () => {
        $caret('abc', 1);
        $insertList(type);
      },
    }),
  ),
  {
    $check: ctx => {
      const container = $container(ctx);
      const list = $all($isListNode)[0] as ElementNode | undefined;
      if (container === undefined || list === undefined) {
        return 'not in place';
      }
      const items = list.getChildren().filter($isListItemNode);
      const next = list.getNextSibling();
      return items.length === 1 &&
        list.getParent() === container &&
        $isParagraphNode(next) &&
        next.getTextContent() === ''
        ? 'in place'
        : 'not in place';
    },
    inner: () => [
      $createListNode('bullet').append(
        $createListItemNode().append($createTextNode('abc')),
        $createListItemNode(),
      ),
    ],
    name: 'Enter in an empty last list item',
    run: editor => {
      const items = $all($isListItemNode);
      (items[items.length - 1] as ElementNode).select(0, 0);
      editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
    },
  },
  {
    $check: (ctx, before) => {
      const container = $container(ctx);
      const x = $text('X')?.getParent();
      const y = $text('Y')?.getParent();
      return container !== undefined &&
        $count(ctx) === before &&
        x !== y &&
        x?.getParent() === container &&
        y?.getParent() === container
        ? 'in place'
        : 'not in place';
    },
    inner: $_PARAS,
    name: 'insertNodes of two paragraphs mid-text',
    run: () => {
      $caret('abc', 1);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([$p('X'), $p('Y')]);
      }
    },
  },
  {
    $check: (ctx, before) => {
      const container = $container(ctx);
      const hr = $all($isHorizontalRuleNode)[0];
      return container !== undefined &&
        hr !== undefined &&
        $count(ctx) === before &&
        hr.getParent() === container
        ? 'in place'
        : 'not in place';
    },
    inner: $_PARAS,
    name: '$insertNodeToNearestRoot(horizontal rule)',
    run: () => {
      $caret('abc', 1);
      $insertNodeToNearestRoot($createHorizontalRuleNode());
    },
  },
  ...(
    [
      ['# ', (n: LexicalNode) => $isHeadingNode(n)],
      ['- ', (n: LexicalNode) => $isListNode(n)],
      ['> ', (n: LexicalNode) => $isQuoteNode(n)],
    ] as const
  ).map(
    ([shortcut, is]): Cmd => ({
      $check: (ctx, before) => {
        const container = $container(ctx);
        const made = $all(is).find(n => n.getTextContent().includes('abc'));
        return container !== undefined &&
          made !== undefined &&
          $count(ctx) === before &&
          made.getParent() === container
          ? 'in place'
          : 'not in place';
      },
      inner: $_PARAS,
      name: `markdown "${shortcut}"`,
      run: () => $caret('abc', 0),
      type: shortcut,
    }),
  ),
];

type Mode = 'NodeStructureExtension' | '@lexical/y';
const MODES: Mode[] = ['NodeStructureExtension', '@lexical/y'];

function build(mode: Mode): ReturnType<typeof buildEditorFromExtensions> {
  const deps: AnyLexicalExtensionArgument[] = [
    RichTextExtension,
    ListExtension,
    LinkExtension,
    CodeExtension,
    HorizontalRuleExtension,
  ];
  if (mode === 'NodeStructureExtension') {
    deps.push(NodeStructureExtension);
  } else {
    deps.push(
      configExtension(YCollabExtension, {doc: createYDoc(), schemaVersion: 1}),
    );
  }
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      dependencies: deps,
      name: `catalog-structure-${mode}`,
      nodes: () => [PlainBoxNode, DeclaredBoxNode, ShadowBoxNode, SlotHostNode],
      onError: e => {
        throw e;
      },
      register: e => registerMarkdownShortcuts(e),
    }),
  );
}

describe('structural commands in block containers, where structure is enforced', () => {
  for (const cmd of CMDS) {
    for (const ctx of CTXS) {
      for (const mode of MODES) {
        const want = model(cmd, ctx, 'rule');
        // Main does not have the rule yet (#9590).
        const failsUntilFixed = model(cmd, ctx, 'main') !== want;
        (failsUntilFixed ? test.fails : test)(
          `${cmd.name} in ${ctxName(ctx)} [${mode}]: ${want}`,
          async () => {
            const editor = build(mode);
            const rootElement = document.createElement('div');
            rootElement.contentEditable = 'true';
            document.body.appendChild(rootElement);
            editor.setRootElement(rootElement);
            try {
              editor.update(() => $build(ctx, cmd.inner), {discrete: true});
              await Promise.resolve();
              const before = editor.read(() => $count(ctx));
              editor.update(() => cmd.run(editor), {discrete: true});
              for (const ch of cmd.type ?? '') {
                editor.update(
                  () => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      selection.insertText(ch);
                    }
                  },
                  {discrete: true},
                );
              }
              await Promise.resolve();
              expect(editor.read(() => cmd.$check(ctx, before))).toBe(want);
            } finally {
              editor.setRootElement(null);
              rootElement.remove();
              editor.dispose();
            }
          },
        );
      }
    }
  }
});
