---
sidebar_position: 1
---

# React

Lexical provides `LexicalCollaborationPlugin` and `useCollaborationContext` hook within `@lexical/react` to accelerate creation of the collaborative React backed editors.
This is on top of the Yjs bindings provided by `@lexical/yjs`.


:::tip

Clone [Lexical GitHub repo](https://github.com/facebook/lexical), run `npm i && npm run start` and open [`http://localhost:3000/split/?isCollab=true`](http://localhost:3000/split/?isCollab=true) to launch playground in collaborative mode.

:::

## Getting started

This guide is based on [examples/react-rich](https://github.com/facebook/lexical/tree/main/examples/react-rich) example.

**Install minimal set of the required dependencies:**
```bash
$ npm i -S @lexical/react @lexical/yjs lexical react react-dom y-websocket yjs
```

:::note

`y-websocket` is the only officially supported Yjs connection provider at this point. Although other providers may work just fine.

:::

**Get WebSocket server running:**

This allows different browser windows and different borwsers to find each other and sync Lexical state. On top of this `YPERSISTENCE` allows you to save Yjs documents in between server restarts so clients can simply reconnect and keep editing.

```bash
$ HOST=localhost PORT=1234 YPERSISTENCE=./yjs-wss-db npx y-websocket
```

**Get basic collaborative Lexical setup:**

```tsx
import {$getRoot, $createParagraphNode, $createTextNode} from 'lexical';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import * as Y from 'yjs';
import {$initialEditorState} from './initialEditorState';
import {WebsocketProvider} from 'y-websocket';

function Editor() {
  const initialConfig = {
    // NOTE: This is critical for collaboration plugin to set editor state to null. It
    // would indicate that the editor should not try to set any default state
    // (not even empty one), and let collaboration plugin do it instead
    editorState: null,
    namespace: 'Demo',
    nodes: [],
    onError: (error: Error) => {
      throw error;
    },
    theme: {},
  };

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>) => {
      const doc = getDocFromMap(id, yjsDocMap);

      return new WebsocketProvider('ws://localhost:1234', id, doc, {
        connect: false,
      });
    }, [],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="editor-input" />}
        placeholder={<div className="editor-placeholder">Enter some rich text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <CollaborationPlugin
        id="lexical/react-rich-collab"
        providerFactory={providerFactory}
        // Optional initial editor state in case collaborative Y.Doc won't
        // have any existing data on server. Then it'll user this value to populate editor.
        // It accepts same type of values as LexicalComposer editorState
        // prop (json string, state object, or a function)
        initialEditorState={$initialEditorState}
        shouldBootstrap={true}
      />
    </LexicalComposer>
  );
}
```

## See it in action

Source code: [examples/react-rich-collab](https://github.com/facebook/lexical/tree/main/examples/react-rich-collab)

<iframe width="100%" height="600" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich-collab?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>

## Building collaborative plugins

[Lexical Playground](https://playground.lexical.dev/) features set of the collaboration enabled plugins that integrate with primary document via `useCollaborationContext()` hook. Notable mentions:

- [`CommentPlugin`](https://github.com/facebook/lexical/tree/v0.14.5/packages/lexical-playground/src/plugins/CommentPlugin) - features use of the separate provider and Yjs room to sync comments.
- [`ImageComponent`](https://github.com/facebook/lexical/blob/v0.14.5/packages/lexical-playground/src/nodes/ImageComponent.tsx#L390) - features use of the `LexicalNestedComposer` paired with `CollaborationPlugin`.
- [`PollOptionComponent`](https://github.com/facebook/lexical/blob/v0.14.5/packages/lexical-playground/src/nodes/PollComponent.tsx#L78) - showcases poll implementation using `clientID` from Yjs context.
- [`StickyPlugin`](https://github.com/facebook/lexical/tree/v0.14.5/packages/lexical-playground/src/plugins/StickyPlugin) - features use of the `LexicalNestedComposer` paired with `CollaborationPlugin` as well as sticky note position real-time sync.

:::note

While these "playground" plugins aren't production ready - they serve as a great example of collaborative Lexical capabilities as well as provide a good starting point.

:::

## Yjs providers

Setting up the communication between clients, managing awareness information, and storing shared data for offline usage is quite a hassle. Providers manage all that for you and are the perfect starting point for your collaborative app.

See [Yjs Website](https://docs.yjs.dev/ecosystem/connection-provider) for the list of the officially endorsed providers. Although it's not an exhaustive one.
