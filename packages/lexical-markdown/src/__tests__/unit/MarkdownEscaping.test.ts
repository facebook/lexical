/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  LINK,
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isTextNode,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {unescapeText} from '../../utils';
import {MarkdownTestExtension} from '../utils';

const LITERALS = [
  ['<b>text</b>', '&#60;b>text&#60;/b>'],
  ['<https://example.com>', '&#60;https://example.com>'],
  ['<0@a.b>', '&#60;0@a.b>'],
  ['<+@a.b>', '&#60;+@a.b>'],
  ['&#65;', '&#38;#65;'],
  ['&#x41;', '&#38;#x41;'],
  ['[label](uri)', '&#91;label&#93;(uri)'],
  ['[ref]: uri', '&#91;ref&#93;: uri'],
];

describe('literal Markdown text', () => {
  it.each(LITERALS)('escapes %j across styled text nodes', (text, expected) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    for (let split = 0; split <= text.length; split++) {
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode(text.slice(0, split)).setStyle('color: red'),
                $createTextNode(text.slice(split)).setStyle('color: blue'),
              ),
            );
        },
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      expect(written).toBe(expected);
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    }
  });

  it.each(['AT&T', 'a < b', '&nbsp;', '&copy;'])(
    'keeps legacy-readable text unchanged: %j',
    text => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode(text))),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      expect(written).toBe(text);
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    },
  );

  it.each(['bold', 'italic', 'strikethrough'] as const)(
    'preserves existing formatted markers after plain text: %s',
    format => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('a'),
              $createTextNode('*').toggleFormat(format),
            ),
          ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('a*');
        const [plain, formatted] = $getRoot().getAllTextNodes();
        expect(plain.getFormat()).toBe(0);
        expect(formatted.hasFormat(format)).toBe(true);
      });
    },
  );

  it.each(['*', '**', '~~'])(
    'keeps literal delimiters beside escaped punctuation: %j',
    delimiter => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      for (const inside of ['[', '&', '<']) {
        for (const outside of ['[', '&', '<']) {
          const source = `a${delimiter}\\${inside}${delimiter}\\${outside}`;
          editor.update(() => $convertFromMarkdownString(source), {
            discrete: true,
          });
          editor.read(() => {
            expect($getRoot().getTextContent()).toBe(
              `a${delimiter}${inside}${delimiter}${outside}`,
            );
            for (const text of $getRoot().getAllTextNodes()) {
              expect(text.getFormat()).toBe(0);
            }
          });
        }
      }
    },
  );

  it.each([
    [['&', '#65;'], '&#38;#65;'],
    [['&', 'copy;'], '&#38;copy;'],
    [['<', 'b>text</b>'], '&#60;b>text&#60;/b>'],
    [['AT&', 'T'], 'AT&#38;T'],
    [['a <', ' b'], 'a &#60; b'],
  ] as const)('guards ambiguous node boundaries: %j', (pieces, expected) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              ...pieces.map((text, index) =>
                $createTextNode(text).setStyle(
                  index ? 'color: blue' : 'color: red',
                ),
              ),
            ),
          ),
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString())).toBe(expected);
  });

  it.each([
    ['\\<b>text\\</b>', '<b>text</b>'],
    ['&#60;b&#62;text&#60;/b&#62;', '<b>text</b>'],
    ['\\&#65;', '&#65;'],
    ['\\&#x41;', '&#x41;'],
    ['&#38;#65;', '&#65;'],
    ['&#x26;#x41;', '&#x41;'],
    ['\\[label\\](uri)', '[label](uri)'],
    ['\\[label](uri)', '[label](uri)'],
  ])(
    'keeps imported literal text through repeated conversion: %j',
    (source, text) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      let written = source;
      for (let round = 0; round < 3; round++) {
        editor.update(() => $convertFromMarkdownString(written), {
          discrete: true,
        });
        expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
        written = editor.read(() => $convertToMarkdownString());
      }
    },
  );

  it('escapes only the selected literal content', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => {
        const text = $createTextNode('before <b>&copy; [x](u)</b> after');
        $getRoot().clear().append($createParagraphNode().append(text));
        text.select(7, text.getTextContentSize() - 6);
      },
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $convertSelectionToMarkdownString(TRANSFORMERS, $getSelection()),
      ),
    ).toBe('&#60;b>&copy; &#91;x&#93;(u)&#60;/b>');
  });

  it.each(['[label]', 'a]b', 'a[b', 'a](other)'])(
    'preserves real link label %j',
    label => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createLinkNode('uri').append($createTextNode(label)),
              ),
            ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const link = paragraph.getFirstChildOrThrow();
        assert($isLinkNode(link));
        expect(link.getURL()).toBe('uri');
        expect(link.getTextContent()).toBe(label);
      });
    },
  );

  it.each(['[\\]', '\\[x]', '[\\]`'])(
    'preserves existing backslashes in code-formatted link label %j',
    label => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createLinkNode('uri').append(
                  $createTextNode(label).toggleFormat('code'),
                ),
              ),
            ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const link = paragraph.getFirstChildOrThrow();
        assert($isLinkNode(link));
        const text = link.getFirstChildOrThrow();
        assert($isTextNode(text));
        expect(text.getTextContent()).toBe(label);
        expect(text.hasFormat('code')).toBe(true);
      });
    },
  );

  it.each([
    ['[', ']'],
    [']', '['],
  ])('preserves mixed code/plain brackets in a link: %j', (code, plain) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createLinkNode('uri').append(
                $createTextNode(code).toggleFormat('code'),
                $createTextNode(plain),
              ),
            ),
          ),
      {discrete: true},
    );
    const written = editor.read(() => $convertToMarkdownString());
    editor.update(() => $convertFromMarkdownString(written), {discrete: true});
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      expect(paragraph.getChildrenSize()).toBe(1);
      const link = paragraph.getFirstChildOrThrow();
      assert($isLinkNode(link));
      expect(link.getURL()).toBe('uri');
      expect(
        link.getChildren().map(node => {
          assert($isTextNode(node));
          return [node.getTextContent(), node.hasFormat('code')];
        }),
      ).toEqual([
        [code, true],
        [plain, false],
      ]);
    });
  });

  it('continues searching after an escaped link opener', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => $convertFromMarkdownString('\\[literal](a) [real](b)'),
      {discrete: true},
    );
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      const links = paragraph.getChildren().filter($isLinkNode);
      expect(links.map(link => link.getURL())).toEqual(['b']);
      expect(paragraph.getTextContent()).toBe('[literal](a) real');
    });
  });

  it('does not let an escaped closer absorb a later real link', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString('[a]\\](u) [b](v)'), {
      discrete: true,
    });
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      expect(paragraph.getTextContent()).toBe('[a]](u) b');
      const links = paragraph.getChildren().filter($isLinkNode);
      expect(links.map(link => [link.getTextContent(), link.getURL()])).toEqual(
        [['b', 'v']],
      );
    });
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const)(
    'preserves copied LINK imports (cloned pattern: %s, wrapped replace: %s)',
    (clonedPattern, wrappedReplace) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      const exportLink = LINK.export;
      assert(exportLink);
      const pattern = LINK.importRegExp;
      assert(pattern);
      const replaceLink = LINK.replace;
      assert(replaceLink);
      const customLink: TextMatchTransformer = {
        ...LINK,
        export: (...args) => exportLink(...args),
        importRegExp: clonedPattern
          ? new RegExp(pattern.source, pattern.flags)
          : pattern,
        replace: wrappedReplace
          ? (...args) => replaceLink(...args)
          : replaceLink,
      };
      const transformers = TRANSFORMERS.map(transformer =>
        transformer === LINK ? customLink : transformer,
      );
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode('[a]](u) '),
                $createLinkNode('v', {title: 'title'}).append(
                  $createTextNode('b'),
                ),
              ),
            ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString(transformers));
      editor.update(() => $convertFromMarkdownString(written, transformers), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const [text, link] = paragraph.getChildren();
        assert($isTextNode(text));
        expect(text.getTextContent()).toBe('[a]](u) ');
        assert($isLinkNode(link));
        expect([link.getTextContent(), link.getURL(), link.getTitle()]).toEqual(
          ['b', 'v', 'title'],
        );
      });
    },
  );

  it.each(['<', '&', '[', ']'])(
    'retains bold before an exported literal escape: %j',
    literal => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTextNode('!').toggleFormat('bold'),
                $createTextNode(literal),
              ),
            ),
        {discrete: true},
      );
      const written = editor.read(() => $convertToMarkdownString());
      editor.update(() => $convertFromMarkdownString(written), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        expect(
          paragraph.getChildren().map(node => {
            assert($isTextNode(node));
            return [node.getTextContent(), node.hasFormat('bold')];
          }),
        ).toEqual([
          ['!', true],
          [literal, false],
        ]);
      });
    },
  );

  it.each(['bold', 'italic', 'strikethrough', 'bold+italic'] as const)(
    'preserves formatted backslashes next to plain text: %s',
    format => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      for (const before of [false, true]) {
        const text = before ? '\\path' : 'path\\';
        let expectedFormat = 0;
        editor.update(
          () => {
            const formatted = $createTextNode(text);
            if (format === 'bold+italic') {
              formatted.toggleFormat('bold').toggleFormat('italic');
            } else formatted.toggleFormat(format);
            expectedFormat = formatted.getFormat();
            const plain = $createTextNode('file');
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append(
                  ...(before ? [plain, formatted] : [formatted, plain]),
                ),
              );
          },
          {discrete: true},
        );
        const written = editor.read(() => $convertToMarkdownString());
        editor.update(() => $convertFromMarkdownString(written), {
          discrete: true,
        });
        editor.read(() => {
          const paragraph = $getRoot().getFirstChildOrThrow();
          assert($isElementNode(paragraph));
          const expected = [
            [text, expectedFormat],
            ['file', 0],
          ];
          expect(
            paragraph.getChildren().map(node => {
              assert($isTextNode(node));
              return [node.getTextContent(), node.getFormat()];
            }),
          ).toEqual(before ? expected.reverse() : expected);
        });
      }
    },
  );

  it.each([
    ['[a\\]\\](u) ', '[a]](u) '],
    ['[&#65;\\]\\](u) ', '[A]](u) '],
    ['[\\&#65;\\]\\](u) ', '[&#65;]](u) '],
  ])('decodes escaped text before a later link: %j', (prefix, expected) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(prefix + '[ok](v)'), {
      discrete: true,
    });
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      const [text, link] = paragraph.getChildren();
      assert($isTextNode(text));
      expect(text.getTextContent()).toBe(expected);
      assert($isLinkNode(link));
      expect(link.getURL()).toBe('v');
      expect(link.getTextContent()).toBe('ok');
    });
  });

  it.each([
    ['[a\\][]\\](u) ', '[a][]](u) '],
    ['[&#65;\\][]\\](u) ', '[A][]](u) '],
  ])(
    'preserves balanced bracket prefixes before a later link: %j',
    (prefix, expected) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(() => $convertFromMarkdownString(prefix + '[ok](v)'), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const [text, link] = paragraph.getChildren();
        assert($isTextNode(text));
        expect(text.getTextContent()).toBe(expected);
        assert($isLinkNode(link));
        expect(link.getURL()).toBe('v');
        expect(link.getTextContent()).toBe('ok');
      });
    },
  );

  it.each([
    ['[[b](v)', '['],
    ['[a[b](v)', '[a'],
  ])(
    'preserves nested openers after an escaped prefix: %j',
    (suffix, prefix) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(() => $convertFromMarkdownString('[a\\]\\](u) ' + suffix), {
        discrete: true,
      });
      editor.read(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const [text, link] = paragraph.getChildren();
        assert($isTextNode(text));
        expect(text.getTextContent()).toBe('[a]](u) ' + prefix);
        assert($isLinkNode(link));
        expect(link.getURL()).toBe('v');
        expect(link.getTextContent()).toBe('b');
      });
    },
  );

  it.each([
    ['~~[]~~~](u)', '~~[]~~~](u)', ''],
    ['~~[]~~~](u)', '~~[]~~~](u)', ' [ok](v)'],
    ['~~[\\a]~~~](u)', '~~[\\a]~~~](u)', ''],
    ['~~[\\a]~~~](u)', '~~[\\a]~~~](u)', ' [ok](v)'],
    ['~~[\\]]~~~](u)', '~~[]]~~~](u)', ''],
    ['~~[\\]]~~~](u)', '~~[]]~~~](u)', ' [ok](v)'],
  ])(
    'keeps legacy grouping for malformed link candidates: %j',
    (source, expected, suffix) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(() => $convertFromMarkdownString(source + suffix), {
        discrete: true,
      });
      editor.read(() => {
        const root = $getRoot();
        expect(root.getTextContent()).toBe(expected + (suffix ? ' ok' : ''));
        for (const text of root.getAllTextNodes()) {
          expect(text.getFormat()).toBe(0);
        }
        if (suffix) {
          const paragraph = root.getFirstChildOrThrow();
          assert($isElementNode(paragraph));
          const link = paragraph.getLastChildOrThrow();
          assert($isLinkNode(link));
          expect(link.getURL()).toBe('v');
          expect(link.getTextContent()).toBe('ok');
        }
      });
    },
  );

  it.each(['code', 'custom'] as const)(
    'runs import transformers after escaped link text: %s',
    kind => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      let calls = 0;
      const custom: TextMatchTransformer = {
        dependencies: [],
        importRegExp: /@\w+/,
        regExp: /@\w+$/,
        replace: node => {
          calls++;
          node.setTextContent('MENTION');
          return node;
        },
        type: 'text-match',
      };
      const middle = kind === 'code' ? '`code`' : '@name';
      editor.update(
        () =>
          $convertFromMarkdownString(
            '[a\\]\\](u) ' + middle + ' [link](v)',
            kind === 'custom' ? [custom, ...TRANSFORMERS] : TRANSFORMERS,
          ),
        {discrete: true},
      );
      editor.read(() => {
        const root = $getRoot();
        expect(root.getTextContent()).toBe(
          '[a]](u) ' + (kind === 'code' ? 'code' : 'MENTION') + ' link',
        );
        if (kind === 'code') {
          expect(
            root
              .getAllTextNodes()
              .find(node => node.hasFormat('code'))
              ?.getTextContent(),
          ).toBe('code');
        }
        const paragraph = root.getFirstChildOrThrow();
        assert($isElementNode(paragraph));
        const link = paragraph.getLastChildOrThrow();
        assert($isLinkNode(link));
        expect(link.getURL()).toBe('v');
        expect(link.getTextContent()).toBe('link');
      });
      expect(calls).toBe(kind === 'custom' ? 1 : 0);
    },
  );

  it('reads the text before an unbalanced link as ordinary Markdown', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    // CommonMark reads `[` as literal text and `` `\` `` as a code span here.
    editor.update(() => $convertFromMarkdownString('[`\\`[x](u)'), {
      discrete: true,
    });
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      const [text, code, link] = paragraph.getChildren();
      assert($isTextNode(text));
      expect(text.getTextContent()).toBe('[');
      assert($isTextNode(code) && code.hasFormat('code'));
      expect(code.getTextContent()).toBe('\\');
      assert($isLinkNode(link));
      expect(link.getURL()).toBe('u');
      expect(link.getTextContent()).toBe('x');
    });
  });

  it('keeps the existing raw-source newline mode', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    const source = '\\&#65; \\<b> \\[x](u)';
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode(source))),
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      ),
    ).toBe(source);
  });

  it('does not escape code or authored custom transformer output', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    const raw = '<b>&copy; [x](u)</b>';
    editor.update(
      () =>
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode(raw).toggleFormat('code'),
              $createTextNode('owned'),
            ),
          ),
      {discrete: true},
    );
    const custom: TextMatchTransformer = {
      dependencies: [],
      export: node => (node.getTextContent() === 'owned' ? raw : null),
      regExp: /$^/,
      type: 'text-match',
    };
    expect(
      editor.read(() => $convertToMarkdownString([custom, ...TRANSFORMERS])),
    ).toBe('`' + raw + '`' + raw);
  });

  it('keeps custom matchers responsible for their escape rules', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    let calls = 0;
    const custom: TextMatchTransformer = {
      dependencies: [],
      importRegExp: /@\w+/,
      regExp: /@\w+$/,
      replace: node => {
        calls++;
        node.setTextContent('seen');
      },
      type: 'text-match',
    };
    editor.update(() => $convertFromMarkdownString('\\@name', [custom]), {
      discrete: true,
    });
    expect(calls).toBe(1);
    expect(editor.read(() => $getRoot().getTextContent())).toBe('\\seen');
  });
});

describe('one-pass numeric reference decoding', () => {
  it.each([
    ['&#65;', 'A'],
    ['&#x41;', 'A'],
    ['&#X41;', 'A'],
    ['\\&#65;', '&#65;'],
    ['\\&#x41;', '&#x41;'],
    ['&#38;#65;', '&#65;'],
    ['&#x26;#x41;', '&#x41;'],
    ['\\\\&#65;', '\\A'],
    ['&copy;', '&copy;'],
    ['&#0;', '\uFFFD'],
    ['&#xD800;', '\uFFFD'],
    ['&#x110000;', '\uFFFD'],
  ])('decodes %j once', (source, expected) => {
    expect(unescapeText(source)).toBe(expected);
  });
});
