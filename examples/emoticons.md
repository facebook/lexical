# Building Emoticons With Lexical React

In this example, we'll implement a feature that detects conventional textual representations of Emoticons and converts them into unicode or tokenized images in the editor. To do this we'll:

- create a custom EmoticonNode
- listen for changes in the editor via Lexical transforms
- replace the TextNode with our new EmoticonNode when we detect an emoticon in the content.

Note: Emoticons and Emojis can become fairly complex - this tutorial contains a naive approach for demonstration purposes only and should not be used directly in production code.

## Concepts

- Custom Nodes
- Transforms

## Getting Started

We'll start with a basic plain text editor setup, which you can find [here](https://codesandbox.io/s/lexical-plain-text-example-g932e)

You can fork the sandbox and follow along, or copy the code to your own local environment.

## Building Emoticons

### Create a custom EmoticonNode

In order to control how our Emoticons appear and behave in the editor, we'll want to create a custom node. To do this, we can subclass one of the existing "base" node classes: LexicalNode, TextNode, or ElementNode. In this case, we want our node to behave more or less like text, so we'll extend TextNode:

```jsx
//EmoticonNode.js

import {TextNode} from 'lexical';

export class EmoticonNode extends TextNode {

  constructor(text, key) {
    super(text, key);
  }

  ...
}
```

Once we have this class, we can override the createDOM method to control how our new node is rendered in the browser. In this case, we want to give it a specific class name to apply our emoticon styles, so we'll add an argument to the constructor to accommodate that:

```jsx
import {TextNode} from 'lexical';

export class EmoticonNode extends TextNode {
  __className;

  constructor(className, text, key) {
    super(text, key);
    this.__className = className;
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }

  ...
}
```

Next, we need to add a couple of required methods that help Lexical understand how to deserialize the node (among other things):

```jsx
import {TextNode} from 'lexical';

export class EmoticonNode extends TextNode {
  __className: string;

  static getType(): string {
    return 'emoticon';
  }

  static clone(node) {
    return new EmoticonNode(node.__className, node.__text, node.__key);
  }

  constructor(className, text, key) {
    super(text, key);
    this.__className = className;
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }
}
```

Conventionally, custom nodes expose a function for checking against their type, as well as a create function that wraps the constructor. We'll add these at the bottom of the module below the class:

```jsx
import {TextNode} from 'lexical';

export class EmoticonNode extends TextNode {
  __className;

  static getType() {
    return 'emoticon';
  }

  static clone(node) {
    return new EmoticonNode(node.__className, node.__text, node.__key);
  }

  constructor(className, text, key) {
    super(text, key);
    this.__className = className;
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }
}

export function $isEmoticonNode(node) {
  return node instanceof EmoticonNode;
}

export function $createEmoticonNode(className, emoticonText) {
  return new EmoticonNode(className, emoticonText).setMode('token');
}
```

In $createEmoticonNode, you'll notice that we call setMode on the instance before returning it. Setting the mode to "token" changes the behavior of the node in response to events such as a backspace, where it ensures that the entire node is treated as a single entity and appropriately deleted.

Now that we have our custom EmoticonNode, we'll learn how to listen for and respond to change in the editor via a transform.

### Register a Transform

Since we're using Lexical react, we can take advantage of Lexical's plugin system to encapsulate all of the logic related to setting up and tearing down our Emoticon feature. Let's start by creating a new Lexical plugin, which is just a React component:

```jsx
// EmoticonPlugin.js

export default function EmoticonPlugin() {
  const [editor] = useLexicalComposerContext();
  return null;
}
```

Once we've done that, let's register our newly-created EmoticonNode so that Lexical knows how to handle it:

```jsx
<LexicalComposer initialConfig={{namespace: 'MyEditor', nodes: [EmoticonNode]}}>...</LexicalComposer>
```

Next, let's setup a transform to listen for changes. Transforms are special event listeners that only respond to changes in nodes of a certain type. In this case, we want to listen for changes in TextNodes, since that's what will be created as the user enters or changes text:

```jsx
// EmoticonPlugin.js

function useEmoticons(editor) {
  useEffect(() => {
    const removeTransform = editor.registerNodeTransform(TextNode, () => {
      console.log('hello');
    });
    return () => {
      removeTransform();
    };
  }, [editor]);
}

export default function EmoticonPlugin() {
  const [editor] = useLexicalComposerContext();
  useEmoticons(editor);
  return null;
}
```

Now, every time a TextNode changes, the console will output "hello"! This isn't what we ultimately want to do though, so let's look at how we can make this work for our purposes.

### Insert EmoticonNode

Since we already have our transform listener set up, all we need to do now is replace the callback function that currently logs "hello" with one that replaces the TextNode with our EmoticonNode when an emoticon pattern is detected.

```jsx
// EmoticonPlugin.js
function emoticonTransform(node) {
  const textContent = node.getTextContent();
  if (textContent === ':)') {
    node.replace($createEmoticonNode('', '🙂'));
  }
}

function useEmoticons(editor) {
  useEffect(() => {
    const removeTransform = editor.registerNodeTransform(
      TextNode,
      emoticonTransform,
    );
    return () => {
      removeTransform();
    };
  }, [editor]);
}

export default function EmoticonPlugin() {
  const [editor] = useLexicalComposerContext();
  useEmoticons(editor);
  return null;
}
```

Now when the user types ":)" into the editor, our transformation will swap out that TextNode for our new EmoticonNode!

We can take this a step further and add our own custom avocado Emoticon, using the class name that we added to our EmoticonPlugin earlier.

```jsx
// EmoticonPlugin.js
function emoticonTransform(node) {
    const textContent = node.getTextContent();
    if (textContent === ":avo:") {
        node.replace($createEmoticonNode('avo-emoticon', 'avo'));
    } else if (textContent === ":)") {
        node.replace($createEmoticonNode('', '🙂'));
    }
}

function useEmoticons(editor) {
  useEffect(() => {
    const removeTransform = editor.registerNodeTransform(TextNode, emoticonTransform);
    return () => {
      removeTransform();
    };
  }, [editor]);
}

export default function EmoticonPlugin() {
  const [editor] = useLexicalComposerContext();
  useEmoticons(editor);
  return null;
}

// styles.css
.emoticon {
  color: transparent;
  background-size: 16px 16px;
  height: 16px;
  width: 16px;
  background-position: center;
  background-repeat: no-repeat;
  margin: 0 1px;
  text-align: center;
  vertical-align: middle;
}

.avo-emoticon {
  background-image: url(images/emoticon/avocado_emo.jpeg);
}
```

Now, the text ":avo:" will be transformed into a custom avocado emoticon. Cool!

Finally, we need to wire this plugin up to an Editor so we can actually use it.

```jsx
// Editor.js
...

export default function Editor() {
  return (
    <LexicalComposer initialConfig={{namespace: 'MyEditor', theme: ExampleTheme, nodes: [EmoticonNode]}}>
      <div className="editor-container">
        <PlainTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<Placeholder />}
          onError={onError}
        />
        <EmoticonPlugin />
      </div>
    </LexicalComposer>
  );
}

```

You can check out the full working example of the code [here](https://codesandbox.io/s/lexical-plain-text-example-forked-qdxhy?file=/src/index.js). Happy coding!
