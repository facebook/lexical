# Node Customization

Originally the only way to customize nodes was using the node replacement API. Recently we have introduced a second way with the `state` property which has some advantages described below.

## Node State (Experimental)

The advantages of using state over the replacement API are:
1. Easier (less boilerplate)
2. Composable (multiple plugins extending the same node causes failures)
3. Allows metadata: useful for adding things to the RootNode.

```ts
// IMPLEMENTATION
const colorState = createState('color', {
  parse: (value: unknown) => (typeof value === 'string' ? value : undefined),
});

// USAGE
const textNode = $createTextNode();
$setState(textNode, colorState, 'blue');
const textColor = $getState(textNode, colorState) // -> "blue"
```

Inside state, you can use any serializable json value. For advanced use cases
with values that are not primitive values like string, number, boolean, null
you may want or need to implement more than just the parse method in the
value configuration.

While this is still experimental, the API is subject to change and the
documentation will primarily be API documentation.

### Important

We recommend that you use prefixes with low collision probability when defining
state that will be applied to node classes that you don't fully control. It is
a runtime error in dev mode when two distinct separate StateConfig with the
same key are used on the same node.

For example, if you are making a plugin called `awesome-lexical`, you could do:

```ts
const color = createState('awesome-lexical-color', /** your parse fn */)
const bgColor = createState('awesome-lexical-bg-color', /** your parse fn */)

// Or you can add all your state inside an object:
type AwesomeLexical = {
  color?: string;
  bgColor?: string;
  padding?: number
}
const awesomeLexical = createState('awesome-lexical', /** your parse fn which returns AwesomeLexical type */)
```

# Node Overrides / Node Replacements

Some of the most commonly used Lexical Nodes are owned and maintained by the core library. For example, ParagraphNode, HeadingNode, QuoteNode, List(Item)Node etc - these are all provided by Lexical packages, which provides an easier out-of-the-box experience for some editor features, but makes it difficult to override their behavior. For instance, if you wanted to change the behavior of ListNode, you would typically extend the class and override the methods. However, how would you tell Lexical to use *your* ListNode subclass in the ListPlugin instead of using the core ListNode? That's where Node Overrides can help.

Node Overrides allow you to replace all instances of a given node in your editor with instances of a different node class. This can be done through the nodes array in the Editor config:

```ts
const editorConfig = {
    ...
    nodes=[
        // Don't forget to register your custom node separately!
        CustomParagraphNode,
        {
            replace: ParagraphNode,
            with: (node: ParagraphNode) => {
                return new CustomParagraphNode();
            },
            withKlass: CustomParagraphNode,
        }
    ]
}
```
In the snippet above,
- `replace`: Specifies the core node type to be replaced. 
- `with`: Defines a transformation function to replace instances of the original node to the custom node.  
- `withKlass`: This option ensures that behaviors associated with the original node type work seamlessly with the replacement. For instance, node transforms or mutation listeners targeting ParagraphNode will also apply to CustomParagraphNode when withKlass is specified. Without this option, the custom node might not fully integrate with the editor's built-in features, leading to unexpected behavior.

Once this is done, Lexical will replace all ParagraphNode instances with CustomParagraphNode instances. One important use case for this feature is overriding the serialization behavior of core nodes. Check out the full example below.

<iframe src="https://codesandbox.io/embed/ecstatic-maxwell-kw5utu?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/CollapsiblePlugin.ts,/src/nodes/CollapsibleContainerNode.ts&theme=dark&view=split"
     style={{width:'100%', height:'700px', border:0, borderRadius:'4px', overflow:'hidden'}}
     title="lexical-collapsible-container-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
></iframe>
