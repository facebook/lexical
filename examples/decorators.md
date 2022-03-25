# Creating decorator nodes

Decorator node is a way to embed non-text components into the editor. It can be media embeds like videos, tweets, instagram posts or more complex components with its own internal state.

Here's an example of how you can create a decorator node for embedding a video:

```js
export class VideoNode extends DecoratorNode {
  __url: string;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(node.__url, node.__state, node.__key);
  }

  constructor(url: string, state?: DecoratorMap, key?: NodeKey) {
    super(state, key);
    this.__url = url;
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  setURL(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  decorate(editor: LexicalEditor): React$Node {
    return <VideoPlayer url={this.__url} />;
  }
}

export function $createVideoNode(url: string): VideoNode {
  return new VideoNode(url);
}

export function $isVideoNode(node: ?LexicalNode): boolean %checks {
  return node instanceof VideoNode;
}
```

As any other custom Lexical node, decorator nodes need to be registered _before_ they are used by passing them in the editor config. A common pattern is to register custom nodes as a part of a plugin that uses those nodes. It's also a great place to define commands that will insert those custom nodes into the editor:

```jsx
<LexicalComposer initialConfig={{...restOfConfig, nodes: [VideoNode]}}>
  ...
</LexicalComposer>
```

```js
function VideoPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Similar with command listener, which returns unlisten callback
    const removeListener = editor.registerCommandListener(
      'insertVideo',
      (payload) => {
        // Adding custom command that will be handled by this plugin
        editor.update(() => {
          const selection = $getSelection();
          if (selection !== null) {
            const url: string = payload;
            selection.insertNodes([$createVideoNode(url)]);
          }
        });

        // Returning true indicates that command is handled and no further propagation is required
        return true;
      },
      0,
    );

    return () => {
      removeListener();
    };
  }, [editor]);

  return null;
}
```

Then assuming we have a some UE insert a video into the editor:

```js
function ToolbarVideoButton(): React$Node {
  const [editor] = useLexicalComposerContext();
  const insertVideo = useCallback(
    (url) => {
      // Executing command defined in a plugin
      editor.execCommand('insertVideo', url);
    },
    [editor],
  );
  const showDialog = useVideoDialog({onSubmit: insertVideo});
  return <button onClick={showDialog}>Add video</button>;
}
```
