# 節點覆寫 (Node Overrides)

一些最常使用的 Lexical 節點是由核心庫擁有和維護的。例如，`ParagraphNode`、`HeadingNode`、`QuoteNode`、`List(Item)Node` 等等——這些都是由 Lexical 套件提供的，這使得一些編輯器功能的開箱即用體驗更加簡單，但也使得覆寫它們的行為變得困難。例如，如果您想改變 `ListNode` 的行為，通常會擴展該類並覆寫其方法。然而，您該如何告訴 Lexical 在 `ListPlugin` 中使用您的 `ListNode` 子類而不是核心 `ListNode` 呢？這就是節點覆寫可以幫助的地方。

節點覆寫允許您用不同的節點類替換編輯器中給定節點的所有實例。這可以通過編輯器配置中的 `nodes` 陣列來完成：

```js
const editorConfig = {
  ...(nodes = [
    // 別忘了單獨註冊您的自定義節點！
    CustomParagraphNode,
    {
      replace: ParagraphNode,
      with: (node: ParagraphNode) => {
        return new CustomParagraphNode();
      },
    },
  ]),
};
```

一旦完成這個設定，Lexical 會將所有 `ParagraphNode` 實例替換為 `CustomParagraphNode` 實例。此功能的一個重要使用案例是覆寫核心節點的序列化行為。請參閱下面的完整範例。

<iframe src="https://codesandbox.io/embed/ecstatic-maxwell-kw5utu?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/CollapsiblePlugin.ts,/src/nodes/CollapsibleContainerNode.ts&theme=dark&view=split"
     style="width:100%; height:700px; border:0; border-radius:4px; overflow:hidden"
     title="lexical-collapsible-container-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
></iframe>
