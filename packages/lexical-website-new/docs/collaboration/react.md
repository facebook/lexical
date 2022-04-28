---
sidebar_position: 1
---

# React

Below is an example of a basic plain text editor using `lexical`, `@lexical/react`, and `yjs`

```jsx
import LexicalComposer from '@lexical/react/LexicalComposer';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import LexicalPlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

function Editor() {
  const initialConfig = {...};

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalPlainTextPlugin
        contentEditable={<LexicalContentEditable />}
        placeholder={<div>Enter some text...</div>}
      />
      <CollaborationPlugin
        id="yjs-plugin"
        providerFactory={(id, yjsDocMap) => {

          const doc = new Y.Doc();
          yjsDocMap.set(id, doc);

          const provider = new WebsocketProvider(
            "ws://localhost:1234",
            id,
            doc
          );

          return provider;
        }}
        shouldBootstrap={true}
      />
    </LexicalComposer>
  );
}
```
