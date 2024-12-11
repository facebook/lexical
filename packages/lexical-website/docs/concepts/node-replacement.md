
# Node Customization

Originally the only way to customize nodes was using the node replacement API. Recently we have introduced a second way with the `classes` property which is easier to implement and is sufficient for most cases.

## Classes Property (New)

Most of the time when users want to customize a node they just want to add a property to it, which ends up being reflected as a class in the dom element.

To satisfy that need we have introduced two new methods to all nodes: `getClasses` and `setClass`. 

```ts
export function CoolRedPlugin() {
  const [editor] = useLexicalComposerContext();

  return (
    <button
      onClick={() => {
        editor.update(() => {
          $forEachSelectedTextNode((textNode) => {
            // setClass mutates the classes object where the key-value pairs follow the
            // format prefix-suffix for string values, or just prefix for boolean values.
            textNode.setClass('bg', 'red'); // adds the class bg-red
            // Perhaps you don't want to allow the same node to have
            // both text and background color defined at the same time...
            textNode.setClass('text', false); // ...so here you remove the class text-[color].
            textNode.setClass('cool', true); // adds the class cool (true values don't add a suffix)
          });
        });
      }}>
      Make text red and cool
    </button>
  );
}
```

## Node Overrides / Node Replacements

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
