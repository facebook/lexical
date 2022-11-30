

# Node Overrides

Some of the most commonly used Lexical Nodes are owned and maintained by the core library. For example, ParagraphNode, HeadingNode, QuoteNode, List(Item)Node etc - these are all provided by Lexical packages, which provides an easier out-of-the-box experience for some editor features, but makes it difficult to override their behavior. For instance, if you wanted to change the behavior of ListNode, you would typically extend the class and override the methods. However, how would you tell Lexical to use *your* ListNode subclass in the ListPlugin instead of using the core ListNode? That's where Node Overrides can help.

Node Overrides allow you to replace all instances of a given node in your editor with instances of a different node class. This can be done through the nodes array in the Editor config:

```
const editorConfig = {
    ...
    nodes={
        // Don't forget to register your custom node separately!
        CustomParagraphNode,
        {
            replace: ParagraphNode,
            with: (node: ParagraphNode) => {
                return new CustomParagraphNode();
            }
        }
    }
}
```

Once this is done, Lexical will replace all ParagraphNode instances with CustomParagraphNode instances. One important use case for this feature is overriding the serialization behavior of core nodes. Check out the full example below.

<iframe src="https://codesandbox.io/embed/ecstatic-maxwell-kw5utu?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/CollapsiblePlugin.ts,/src/nodes/CollapsibleContainerNode.ts&theme=dark&view=split"
     style={{width:"100%", height:"700px", border:0, borderRadius: "4px", overflow:"hidden"}}
     title="lexical-collapsible-container-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
