/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */



import type {LexicalEditor, SerializedLexicalNode} from 'lexical';

import {createHeadlessEditor} from '@lexical/headless';
import {$createLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {registerBlockNodeNormalizerPlugin__EXPERIMENTAL} from '@lexical/react/LexicalBlockNodeNormalizerPlugin__EXPERIMENTAL';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  DecoratorNode,
  ParagraphNode,
} from 'lexical';

class BlockDecorator extends DecoratorNode<null | JSX.Element> {
  static getType(): string {
    return 'block-decorator';
  }

  isInline(): false {
    return false;
  }

  exportJSON(): SerializedLexicalNode {
    return {type: this.getType(), version: 1};
  }

  decorate(): null | JSX.Element {
    return null;
  }
}

class InlineDecorator extends DecoratorNode<null | JSX.Element> {
  static getType(): string {
    return 'inline-decorator';
  }

  isInline(): true {
    return true;
  }

  exportJSON(): SerializedLexicalNode {
    return {type: this.getType(), version: 1};
  }

  decorate(): null | JSX.Element {
    return null;
  }
}

describe('NestingEnforcementPlugin', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createHeadlessEditor({
      namespace: 'headless',
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        BlockDecorator,
        InlineDecorator,
      ],
      onError: (error) => {
        throw error;
      },
    });
    registerBlockNodeNormalizerPlugin__EXPERIMENTAL(
      editor,
      [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        BlockDecorator,
        ParagraphNode,
      ],
      {
        onError: (errorMessage) => {
          throw new Error(errorMessage);
        },
      },
    );
  });

  test('p > h1 > text unwraps into h1 > text', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createHeadingNode('h1').append($createTextNode('Heading H1')),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Heading H1'})],
        tag: 'h1',
        type: 'heading',
      }),
    ]);
  });

  test('h1 > p > text unwraps into h1 > text', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createHeadingNode('h1').append(
            $createParagraphNode().append($createTextNode('Text inside')),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({text: 'Text inside', type: 'text'}),
        ],
        type: 'heading',
      }),
    ]);
  });

  test('h1 > h2 > text unwraps into h2 > text', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createHeadingNode('h1').append(
            $createHeadingNode('h2').append(
              $createParagraphNode().append($createTextNode('Text inside')),
            ),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({text: 'Text inside', type: 'text'}),
        ],
        tag: 'h2',
        type: 'heading',
      }),
    ]);
  });

  test('p > [text, h1, text] unwraps into p > text, h1 > text, p > text', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createLinkNode('https://test.com').append($createTextNode('Link')),
            $createTextNode('Text before'),
            $createHeadingNode('h1').append($createTextNode('Heading H1')),
            $createTextNode('Text after'),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [expect.objectContaining({text: 'Link', type: 'text'})],
            type: 'link',
          }),
          expect.objectContaining({text: 'Text before', type: 'text'}),
        ],
        type: 'paragraph',
      }),
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Heading H1', type: 'text'})],
        type: 'heading',
      }),
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Text after', type: 'text'})],
        type: 'paragraph',
      }),
    ]);
  });

  test('p > p > [text, p > h1 > text] unwraps into p > text, h1 > text', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createParagraphNode().append(
              $createTextNode('Text before'),
              $createParagraphNode().append(
                $createParagraphNode().append(
                  $createHeadingNode('h1').append(
                    $createTextNode('Heading H1'),
                  ),
                ),
              ),
              $createTextNode('Text after'),
            ),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({text: 'Text before', type: 'text'}),
        ],
        type: 'paragraph',
      }),
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Heading H1', type: 'text'})],
        type: 'heading',
      }),
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Text after', type: 'text'})],
        type: 'paragraph',
      }),
    ]);
  });

  test('p > p > [block-decorator, inline-decorator, text] unwraps into block-decorator, p > [inline-decorator, text]', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createParagraphNode().append(
              $createBlockDecoratorNode(),
              $createInlineDecoratorNode(),
              $createTextNode('Text after'),
            ),
          ),
        );
      },
      {
        discrete: true,
      },
    );

    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        type: 'block-decorator',
      }),
      expect.objectContaining({
        children: [
          expect.objectContaining({type: 'inline-decorator'}),
          expect.objectContaining({text: 'Text after', type: 'text'}),
        ],
        type: 'paragraph',
      }),
    ]);
  });

  test('ul > li > [h1 > text 1 + text 2] unwrapps into ul > li > [text 1 + text 2]', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append(
              $createHeadingNode('h1').append(
                $createTextNode('Left'),
                $createLinkNode('https://lexical.dev').append(
                  $createTextNode('Right'),
                ),
              ),
            ),
          ),
        );
      },
      {
        discrete: true,
      },
    );

    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'Left',
                type: 'text',
              }),
              expect.objectContaining({
                children: [
                  expect.objectContaining({
                    text: 'Right',
                    type: 'text',
                  }),
                ],
                type: 'link',
              }),
            ],
            type: 'listitem',
          }),
        ],
        type: 'list',
      }),
    ]);
  });

  test('ul > li > [h1 > text, text] unwrapps into ul > li > [text, text]', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append(
              $createHeadingNode('h1').append($createTextNode('Heading H1')),
              $createTextNode('Text After'),
            ),
            $createListItemNode().append($createTextNode('Text After #2')),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'Heading H1Text After',
                type: 'text',
              }),
            ],
            type: 'listitem',
          }),
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'Text After #2',
                type: 'text',
              }),
            ],
            type: 'listitem',
          }),
        ],
        type: 'list',
      }),
    ]);
  });

  test('quote > [text, quote > text] unwraps into [quote > text, quote > text]', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createQuoteNode().append(
            $createTextNode('Quote #1'),
            $createQuoteNode().append($createTextNode('Quote #2')),
          ),
        );
      },
      {
        discrete: true,
      },
    );
    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Quote #1'})],
        type: 'quote',
      }),
      expect.objectContaining({
        children: [expect.objectContaining({text: 'Quote #2'})],
        type: 'quote',
      }),
    ]);
  });

  test('h1 > ul > li > text unwraps into ul > li > text', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createHeadingNode('h1').append(
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('bullet #1')),
              $createListItemNode().append($createTextNode('bullet #2')),
            ),
          ),
        );
      },
      {
        discrete: true,
      },
    );

    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'bullet #1',
                type: 'text',
              }),
            ],
            type: 'listitem',
          }),
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'bullet #2',
                type: 'text',
              }),
            ],
            type: 'listitem',
          }),
        ],
        type: 'list',
      }),
    ]);
  });

  test('ul > li > text does not unwrap, same as other valid nestings', () => {
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('paragraph #1')),
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('bullet #1')),
            $createListItemNode().append($createTextNode('bullet #2')),
            $createListItemNode().append(
              $createListNode('bullet').append(
                $createListItemNode().append($createTextNode('bullet #3')),
                $createListItemNode().append($createTextNode('bullet #4')),
              ),
            ),
          ),
          $createParagraphNode().append($createTextNode('paragraph #2')),
        );
      },
      {
        discrete: true,
      },
    );

    expect(toRootChildren(editor)).toEqual([
      expect.objectContaining({
        children: [expect.objectContaining({text: 'paragraph #1'})],
        type: 'paragraph',
      }),
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'bullet #1',
              }),
            ],
            type: 'listitem',
          }),
          expect.objectContaining({
            children: [
              expect.objectContaining({
                text: 'bullet #2',
              }),
            ],
            type: 'listitem',
          }),
          expect.objectContaining({
            children: [
              expect.objectContaining({
                children: [
                  expect.objectContaining({
                    children: [
                      expect.objectContaining({
                        text: 'bullet #3',
                      }),
                    ],
                    type: 'listitem',
                  }),
                  expect.objectContaining({
                    children: [
                      expect.objectContaining({
                        text: 'bullet #4',
                      }),
                    ],
                    type: 'listitem',
                  }),
                ],
                type: 'list',
              }),
            ],
            type: 'listitem',
          }),
        ],
        type: 'list',
      }),
      expect.objectContaining({
        children: [expect.objectContaining({text: 'paragraph #2'})],
        type: 'paragraph',
      }),
    ]);
  });
});

function toRootChildren(editor: LexicalEditor): Array<SerializedLexicalNode> {
  return editor.getEditorState().toJSON().root.children;
}

function $createBlockDecoratorNode(): BlockDecorator {
  return new BlockDecorator();
}

function $createInlineDecoratorNode(): InlineDecorator {
  return new InlineDecorator();
}
