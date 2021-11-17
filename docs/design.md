# Outline's Design

Outline was built from the ground up to be lean and extensible.

You can think of Outline as more of a text editing engine, rather than a monolithic text
editor that provides everything out-of-the-box. It might help to think of Outline as
a framework like React – where React provides some hooks and a reconciler, and then you
build the things you need on top, rather than have them included by default.

The main concept of Outline is the editor state. Outline uses a double-buffering technique
to ensure consistency and reliability. There are never more than two editor states in play.
The "current" editor state represents what you can visibly see on screen and the "pending"
editor state is what is currently being constructed to be shown in the future. Once the
"pending" editor state is ready, it swaps and becomes the new "current" editor state.

Outline's core concerns itself with four main concerns:

- Updates: the act of making changes to editor state
- Transforms: the process of acting on ongoing updates
- Reconcilation: the process of patching the DOM with the latest editor state
- Listening: the process of reacting to changes that occur internally

Additionally, Outline uses DOM mutation observers to ensure that any outside changes to
the editor DOM element are either reverted back to Outline's current editor state, or are
communicated as intents that cause further updates to the editor state (text changes).

Outline doesn't handle:

- Browser event handling
- Undo/redo

This separation was done to ensure developers have a way of applying custom logic with the
implementation and framework of their choice. This makes it possible to use Outline with
React, or any other JavaScript web framework/library. This also makes it easier to tackle
problems around collaboration and undo/redo, where you might have an alternative model involved.
Instead of hoping for the text editor to support what you want, you can work with the editor
to make what you want.

This design can make getting started a bit more complex in certain cases, but as we've been
able to demonstrate with our `outline-react` helpers and hooks – you can get started, in the
form of an out-of-the-box experience.

## Event handling

As mentioned above, Outline doesn't come with any event handlers. This means you'll need to use
an existing implementation (such as from `outline-react`) or create your own. Below is an example,
of how you might listen to text input and update Outline. You can see that we're leveraging some
helper selection functions provided by the Outline pacakge:

```js
import type {State, OutlineEditor, Selection} from 'outline';

import {insertText} from 'outline/SelectionHlpers'

function listenToTextInsertion(editor: OutlineEditor) {

  // The "input" event fires when a user types in some text
  const onInput = (event: InputEvent) => {
    editor.update((state: State) => {
      // Note: this is not a browser selection, but rather an Outline
      // selection. Outline always tries to ensure selection matches up
      // with an Outline TextNode, to simplify its usage and avoid common
      // edge-cases.
      const selection: Selection = state.getSelection();
      // Get the text from this input event.
      const text = event.data;

      if (selection !== null && text != null) {
        // We use the selection helper from 'outline/SelectionHelpers'.
        // We pass our current Outline selection, and the text we want
        // to insert.
        insertText(selection, text);
      }
    });
  }

  // We want to listen for when Outline gets a root element
  editor.addListener('root', (
    rootElement: null | HTMLElement
    prevRootElement, null | HTMLElement,
  ) => {
    // Clear our old listener if the root element changes
    if (prevRootElement !== null) {
      prevRootElement.removeEventListener('input', onInput)
    }
    // If we have an root element, listen to the "input" event
    if (rootElement !== null) {
      rootElement.addEventListener('input', onInput);
    }
  });
}
```