---
sidebar_position: 5
---

# Creating an Extension

An extension keeps a feature's nodes, configuration, dependencies, and behavior
together. Adding it to an editor includes everything the feature needs, and the
editor cleans up its registrations on disposal. It works with both
`buildEditorFromExtensions` and `LexicalExtensionComposer`.

This guide builds `EmojiExtension`: a node transform replaces shortcodes such as
`:)` and `:smiley:` with a custom `EmojiNode` that displays an emoji image. The
[runnable example](#putting-it-all-together) includes the lookup data, images,
and CSS.

## Finding emoji shortcodes

The example's `findEmoji.ts` uses `emoji-datasource-facebook` to find the first
space-delimited shortcode in a string. Its result has this shape:

```ts
export type EmojiMatch = Readonly<{
  position: number;
  shortcode: string;
  unifiedID: string;
}>;
```

For example, `findEmoji('Hello :)')` returns the match position, `:)`, and a
hexadecimal Unicode code point ID used to find the corresponding image.

## Creating a custom node

An emoji is text with a custom appearance, so extend `TextNode`. Use `ElementNode`
for nodes with children, or `DecoratorNode` for arbitrary embedded UI. See
[Nodes](../concepts/nodes.mdx) for those alternatives.

Use `$config()` and [NodeState](../concepts/node-state.md) to declare the emoji ID.
Lexical then supplies cloning and JSON serialization, including inherited text
properties, without handwritten `clone`, `importJSON`, or `exportJSON` methods:

```ts
import {
  $create,
  $getState,
  $getStateChange,
  $setState,
  createState,
  type EditorConfig,
  TextNode,
} from 'lexical';

// Serve the example's emoji PNGs from this directory.
const BASE_EMOJI_URI = '/emojis';

const unifiedIDState = createState('unifiedID', {
  parse: value => typeof value === 'string' ? value.toLowerCase() : '',
});

export class EmojiNode extends TextNode {
  $config() {
    return this.config('emoji', {
      extends: TextNode,
      stateConfigs: [{flat: true, stateConfig: unifiedIDState}],
    });
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add('emoji-node');
    dom.style.backgroundImage = `url('${BASE_EMOJI_URI}/${$getState(this, unifiedIDState)}.png')`;
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    if (super.updateDOM(prevNode, dom, config)) {
      return true;
    }
    const change = $getStateChange(this, prevNode, unifiedIDState);
    if (change !== null) {
      dom.style.backgroundImage = `url('${BASE_EMOJI_URI}/${change[0]}.png')`;
    }
    return false;
  }
}

export function $createEmojiNode(unifiedID: string): EmojiNode {
  const text = String.fromCodePoint(
    ...unifiedID.split('-').map(value => parseInt(value, 16)),
  );
  return $setState(
    $create(EmojiNode).setTextContent(text).setMode('token'),
    unifiedIDState,
    unifiedID.toLowerCase(),
  );
}
```

The inherited `TextNode` constructor accepts no arguments, which allows `$create`
and the generated deserializer to construct the node. The factory sets its text,
its ID, and `token` mode: an emoji is deleted as a unit, and typing beside it
creates regular text.

`stateConfigs` declares the node's custom data. `flat: true` stores `unifiedID`
as a top-level JSON property, preserving the format used by the earlier version
of this example. The parser validates imported values and supplies a default.

`createDOM` and `updateDOM` preserve `TextNode`'s rendering behavior while adding
the emoji image. `$getStateChange` detects a change to the stored ID during
reconciliation. The example includes CSS that hides the Unicode text visually
while keeping it in the document:

```css
.emoji-node {
  color: transparent;
  caret-color: #050505;
  background-size: 1em 1em;
  display: inline-block;
  vertical-align: top;
  width: 1em;
  height: 1em;
}
```

The runnable example resolves its images from the installed emoji package with
Vite. If you use the `/emojis` path above, serve the same images there.

## Creating a node transform

A [node transform](../concepts/transforms.md) runs before DOM reconciliation,
within the update that changed a node. Use it to replace shortcodes without
starting a second update from an update listener.

The transform below:

1. Skips custom text nodes, token nodes, and inline code.
2. Finds a shortcode and splits it out of the surrounding text.
3. Replaces that part with an `EmojiNode`, preserving text formatting and styles.

The remaining text is dirty after splitting, so Lexical runs transforms on it
again to find additional shortcodes. The `isSimpleText()` guard excludes
`EmojiNode`, so replacements do not transform themselves in a loop.

Define the transform and its extension together:

```ts
import {defineExtension, TextNode} from 'lexical';

import {$createEmojiNode, EmojiNode} from './EmojiNode';
import findEmoji from './findEmoji';

function $textNodeTransform(node: TextNode): void {
  if (!node.isSimpleText() || node.hasFormat('code')) {
    return;
  }

  const text = node.getTextContent();

  // Find only 1st occurrence as transform will be re-run anyway for the rest
  // because newly inserted nodes are considered to be dirty
  const emojiMatch = findEmoji(text);
  if (emojiMatch === null) {
    return;
  }

  let targetNode;
  if (emojiMatch.position === 0) {
    // First text chunk within string, splitting into 2 parts
    [targetNode] = node.splitText(
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  } else {
    // In the middle of a string
    [, targetNode] = node.splitText(
      emojiMatch.position,
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  }

  const emojiNode = $createEmojiNode(emojiMatch.unifiedID)
    .setFormat(targetNode.getFormat())
    .setStyle(targetNode.getStyle());
  targetNode.replace(emojiNode);
}

export const EmojiExtension = defineExtension({
  name: '@lexical/examples/Emoji',
  nodes: () => [EmojiNode],
  register(editor) {
    return editor.registerNodeTransform(TextNode, $textNodeTransform);
  },
});
```

`nodes` registers the custom node before the editor is initialized. `register`
installs the transform and returns its cleanup function. Consumers only add
`EmojiExtension`; they do not separately register `EmojiNode` or call a bootstrap
function.

## Putting it all together

Add the feature to a root extension:

```ts
import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';

import {EmojiExtension} from './emoji-plugin/EmojiExtension';

const appExtension = defineExtension({
  name: 'EmojiEditor',
  namespace: 'EmojiEditor',
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ClipboardDOMImportExtension,
    EmojiExtension,
  ],
});

const editor = buildEditorFromExtensions(appExtension);
editor.setRootElement(document.getElementById('editor'));
// Call editor.dispose() when removing this editor permanently.
```

Use the editable element from [Quick Start](quick-start.md). In React, pass the
same root extension to `LexicalExtensionComposer` instead of building and
attaching the editor yourself. No React-specific emoji plugin is needed.

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js-plugin?embed=1&file=src%2Femoji-plugin%2FEmojiExtension.ts&terminalHeight=1&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>

## Publishing your extension

If the extension ships as its own npm package, declare `lexical` and any
`@lexical/*` packages you import as `peerDependencies`, plus `devDependencies`
for your build and tests. Applications must resolve
[one copy of each Lexical package](../concepts/one-lexical-per-app.md).

For configurable features, outputs, and dependency configuration, continue with
[Defining Extensions](../extensions/defining-extensions.md).
