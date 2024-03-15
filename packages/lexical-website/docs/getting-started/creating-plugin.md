---
sidebar_position: 15
---

# Creating a Plugin

This page covers Lexical plugin creation, independently of any framework or library. For those not yet familiar with Lexical it's advisable to [check out the Quick Start (Vanilla JS) page](/docs/getting-started/quick-start).

Lexical, on the contrary to many other frameworks, doesn't define any specific interface for its plugins. The plugin in its simplest form is a function that accepts a `LexicalEditor` instance, and returns a cleanup function. With access to the `LexicalEditor`, plugin can extend editor via [Commands](/docs/concepts/commands), [Transforms](/docs/concepts/transforms), [Nodes](/docs/concepts/nodes), or other APIs.

In this guide we'll create plugin that replaces smiles (`:)`, `:P`, etc...) with actual emojis (using [Node Transforms](/docs/concepts/transforms)) and uses own graphics for emojis rendering by creating our own custom node that extends [TextNode](/docs/concepts/nodes#textnode).

<figure class="text--center">
 <img src="/img/docs/lexical-emoji-plugin-design.drawio.svg" alt="Conceptual View"/>
</figure>

## Preconditions

We assume that you have already implemented (see `findEmoji.ts` within provided code) function that allows you to find emoji shortcodes (smiles) in text and return their position as well as some other info:

```typescript
// findEmoji.ts
export type EmojiMatch = Readonly<{position: number, shortcode: string, unifiedID: string}>;

export default function findEmoji(text: string): EmojiMatch | null;
```

## Creating own `LexicalNode`

Lexical as a framework provides 2 ways to customize appearance of it's content:
- By extending one of the base nodes:
   - [`ElementNode`](/docs/concepts/nodes#elementnode) – used as parent for other nodes, can be block level or inline.
   - [`TextNode`](/docs/concepts/nodes#textnode) - leaf type (_so it can't have child elements_) of node that contains text.
   - [`DecoratorNode`](/docs/concepts/nodes#decoratornode) - useful to insert arbitrary view (component) inside the editor.
- Via [Node Overrides](/docs/concepts/node-replacement) – useful if you want to augment behavior of the built in nodes, such as `ParagraphNode`.

As in our case we don't expect `EmojiNode` to have any child nodes nor we aim to insert arbitrary component the best choice for us is to proceed with [`TextNode`](/docs/concepts/nodes#textnode) extension.

```typescript
export class EmojiNode extends TextNode {
  __unifiedID: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__unifiedID, node.__key);
  }

  constructor(unifiedID: string, key?: NodeKey) {
    const unicodeEmoji = /*...*/;
    super(unicodeEmoji, key);

    this.__unifiedID = unifiedID.toLowerCase();
  }

  /**
  * DOM that will be rendered by browser within contenteditable
  * This is what Lexical renders
  */
  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'emoji-node';
    dom.style.backgroundImage = `url('${BASE_EMOJI_URI}/${this.__unifiedID}.png')`;
    dom.innerText = this.__text;

    return dom;
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    return $createEmojiNode(serializedNode.unifiedID);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      type: 'emoji',
      unifiedID: this.__unifiedID,
    };
  }
}
```

Example above represents absolute minimal setup of the custom node that extends [`TextNode`](/docs/concepts/nodes#textnode). Let's look at the key elements here:

- `constructor(...)` + class props – Allows us to store custom data within nodes at runtime as well as accept custom parameters.
- `getType()` & `clone(...)` – methods allow Lexical to correctly identify node type as well as being able to clone it correctly as we may want to customize cloning behavior.
- `importJSON(...)` & `exportJSON()` – define how our data will be serialized / deserialized to/from Lexical state. Here you define your node presentation in state.
- `createDOM(...)` – defines DOM that will be rendered by Lexical

## Creating Node Transform

[Transforms](/docs/concepts/transforms) allow efficient response to changes to the `EditorState`, and so user input. Their efficiency comes from the fact that transforms are executed before DOM reconciliation (the most expensive operation in Lexical's life cycle).

Additionally it's important to mention that [Lexical Node Transforms](/docs/concepts/transforms) are smart enough to allow you not to think about any side effects of the modifications done within transform or interdependencies with other transform listeners. Rule of thumb here is that changes done to the node within a particular transform will trigger rerun of the other transforms till no changes are made to the `EditorState`. Read more about it in [Transform heuristic](/docs/concepts/transforms#transform-heuristic).

In our example we have simple transform that executes the following business logic:
1. Attempt to transform `TextNode`. It will be run on any change to `TextNode`'s.
2. Check if emoji shortcodes (smiles) are present in the text within `TextNode`. Skip if none.
3. Split `TextNode` into 2 or 3 pieces (depending on the position of the shortcode in text) so target emoji shortcode has own dedicated `TextNode`
4. Replace emoji shortcode `TextNode` with `EmojiNode`


```typescript
import {LexicalEditor, TextNode} from 'lexical';


import {$createEmojiNode} from './EmojiNode';
import findEmoji from './findEmoji';


function textNodeTransform(node: TextNode): void {
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


  const emojiNode = $createEmojiNode(emojiMatch.unifiedID);
  targetNode.replace(emojiNode);
}


export function registerEmoji(editor: LexicalEditor): () => void {
  // We don't use editor.registerUpdateListener here as alternative approach where we rely
  // on update listener is highly discouraged as it triggers an additional render (the most expensive lifecycle operation).
  return editor.registerNodeTransform(TextNode, textNodeTransform);
}
```

## Putting it all together

Finally we configure Lexical instance with our newly created plugin by registering `EmojiNode` within editor config and executing `registerEmoji(editor)` plugin bootstrap function. Here for that sake of simplicity we assume that the plugin picks its own approach for CSS & Static Assets distribution (if any), Lexical doesn't enforce any rules on that.

Refer to [Quick Start (Vanilla JS) Example](/docs/getting-started/quick-start#putting-it-together) to fill the gaps in this pseudocode.

```typescript
import {createEditor} from 'lexical';
import {mergeRegister} from '@lexical/utils';
/* ... */

import {EmojiNode} from './emoji-plugin/EmojiNode';
import {registerEmoji} from './emoji-plugin/EmojiPlugin';

const initialConfig = {
  /* ... */
  // Register our newly created node
  nodes: [EmojiNode, /* ... */],
};

const editor = createEditor(config);

const editorRef = document.getElementById('lexical-editor');
editor.setRootElement(editorRef);

// Registering Plugins
mergeRegister(
  /* ... */
  registerEmoji(editor), // Our plugin
);
```

<iframe width="100%" height="400" src="https://stackblitz.com/github/StyleT/lexical/tree/feature/vanilla-js-plugin-example/examples/vanilla-js-plugin?embed=1&file=src%2Femoji-plugin%2FEmojiPlugin.ts&terminalHeight=1&ctl=1"></iframe>
