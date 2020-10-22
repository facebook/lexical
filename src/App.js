import React from "react";
import { useState, useMemo } from "react";
import { Editor } from "./outline";
import EmojiPlugin from "./outline/plugins/EmojiPlugin";
import PlainTextPlugin from "./outline/plugins/PlainTextPlugin";

function App() {
  const plugins = useMemo(() => [PlainTextPlugin, EmojiPlugin], []);
  const [viewModel, setViewModel] = useState(null);

  return (
    <>
      <h1>OutlineJS Demo</h1>
      <div className="editor-shell">
        <Editor
          plugins={plugins}
          onChange={setViewModel}
        />
      </div>
      <pre>{JSON.stringify(viewModel, null, 2)}</pre>
    </>
  );
}

export default App;
