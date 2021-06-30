# Outline's Design

Outline was built from the ground up to be lean and extensible.

You can think of Outline as more of a text editing engine, rather than a monolithic text
editor that provides everything out-of-the-box. It might help to think of Outline as
a framework like React – where React provides some hooks and a reconciler, and then you
build the things you need on top, rather than have them included by default.

Outline's core concerns itself with four main concerns:

- State (the editor view model)
- Updates (handling updates from A -> B)
- Reconcilation (creating and updating the DOM)
- Subscribing (you can add various listeners that subscribe to internal changes)

Outline doesn't handle:

- Event listeners
- Reacting to DOM mutations
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
import type {View, OutlineEditor, Selection} from 'outline';

import {insertText} from 'outline/SelectionHlpers'

function listenToTextInsertion(editor: OutlineEditor) {
  let currentEditorElement = null;

  // The "input" event fires when a user types in some text
  const onInput = (event: InputEvent) => {
    editor.update((view: View) => {
      // Note: this is not a browser selection, but rather an Outline
      // selection. Outline always tries to ensure selection matches up
      // with an Outline TextNode, to simplify its usage and avoid common
      // edge-cases.
      const selection: Selection = view.getSelection();
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

  // We want to listen for when Outline gets an editor element
  editor.addEditorElementListener((editorElement: null | HTMLElement) => {
    // Clear our old listener if the editorElement changes
    if (currentEditorElement !== null) {
      currentEditorElement.removeEventListener('input', onInput)
    }
    // If we have an editor element, listen to the "input" event
    if (editorElement !== null) {
      editorElement.addEventListener('input', onInput);
    }
    currentEditorElement = editorElement;
  });
}
```