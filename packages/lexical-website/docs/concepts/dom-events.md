

# Working with DOM Events

Sometimes, when working with Lexical, it might be necessary or useful for you to attach a DOM Event Listener to the underlying DOM nodes that Lexical controls. For instance, you might want to to show a popover when a user mouses over a specific node or open a modal when they click on a node. Either of these use cases (and many others) can be accomplished via native DOM Event Listeners. There are 3 main ways that you can listen for DOM Events on nodes controlled by Lexical:

## 1. Event Delegation

One way to handle events inside the editor is to set a listener on the editor root element (the contentEditable Lexical attaches to). You can do this using a [Root Listener](https://lexical.dev/docs/concepts/listeners).

```js
function myListener(event) {
    // You may want to filter on the event target here
    // to only include clicks on certain types of DOM Nodes.
    alert('Nice!');
}

const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
    // add the listener to the current root element
    rootElement.addEventListener('click', myListener);
    // remove the listener from the old root element - make sure the ref to myListener
    // is stable so the removal works and you avoid a memory leak.
    prevRootElement.removeEventListener('click', myListener);
});

// teardown the listener - return this from your useEffect callback if you're using React.
removeRootListener();
```
This can be a simple, efficient way to handle some use cases, since it's not necessary to attach a listener to each DOM node individually.

## 2. Directly Attach Handlers

In some cases, it may be better to attach an event handler directly to the underlying DOM node of each specific node. With this approach, you generally don't need to filter the event target in the handler, which can make it a bit simpler. It will also guarantee that you're handler isn't running for events that you don't care about. This approach is implemented via a [Mutation Listener](https://lexical.dev/docs/concepts/listeners).

```js
const removeMutationListener = editor.registerMutationListener(nodeType, (mutations) => {
    const registeredElements: WeakSet<HTMLElement> = new WeakSet();
    editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
            const element: null | HTMLElement = editor.getElementByKey(key);
            if (
            // Updated might be a move, so that might mean a new DOM element
            // is created. In this case, we need to add and event listener too.
            (mutation === 'created' || mutation === 'updated') &&
            element !== null &&
            !registeredElements.has(element)
            ) {
                registeredElements.add(element);
                element.addEventListener('click', (event: Event) => {
                    alert('Nice!');
                });
            }
        }
    });
});

// teardown the listener - return this from your useEffect callback if you're using React.
removeMutationListener();
```
Notice that here we don't worry about cleaning up, as Lexical will dereference the underlying DOM nodes and allow the JavaScript runtime garbage collector to clean up their listeners.

## 3. Use NodeEventPlugin

If you're using React, we've wrapped approach #2 up into a simple LexicalComposer plugin that you can use to achieve the same effect, without worrying about the details:

```jsx
<LexicalComposer>
    <NodeEventPlugin
        nodeType={LinkNode}
        eventType={'click'}
        eventListener={(e: Event) => {
            alert('Nice!');
        }}
    />
</LexicalComposer>
```
