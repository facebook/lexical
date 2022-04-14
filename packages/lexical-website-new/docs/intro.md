---
sidebar_position: 1
---

# Introduction

> Note: Lexical is currently in early development and APIs and packages are likely to change quite often.

Lexical is an extensible JavaScript web text-editor framework with an emphasis on reliability, accessibility and performance. Lexical aims to provide a best-in-class developer experience, so you can easily prototype and build features with confidence. Combined with a highly extensible architecture, Lexical allows developers to create unique text editing experiences that scale in size and functionality.

## Lexical is a framework

The core of Lexical is a dependency-free text editor framework that allows developers to build powerful, simple and complex,
editor surfaces. Lexical's has a few concepts that are worth exploring:

### Editor instances

Editor instances are the core thing that wires everything together. You can attach a contenteditable DOM element to editor instances, and also
register listeners and commands. Most importantly, the editor allows for updates to its `EditorState`. You can create an editor instance
using the `createEditor()` API, however you normally don't have to worry when using framworking bindings such as `@lexical/react` as this
is handled for you.

### Editor States

An Editor State is the underlying data model that represents what you want to show on the DOM. Editor States contain two parts:

- a Lexical node tree
- a Lexical selection object

Editor States are immutable once created, and in order to create one, you must do so via `editor.update(() => {...})`. However, you
can also "hook" into an existing update using node transforms or command handlers – which are invoked as part of an existing update
workflow to preventing cascading/waterfalling of updates. You can retrieve the current editor state using `editor.getEditorState()`.

Editor States are also fully serializable to JSON and can easily be serialized back into to editor using `editor.parseEditorState()`.

### Editor Updates

When you want to change something in an Editor State, you must do it via an update, `editor.update(() => {...})`. The closure passed
to the update call is important. It's a place where you have full "lexical" context of the active editor state, and it exposes
access to the underling Editor State's node tree. We promote using `$` prefixed functions in this context, as it signifies a place
where they can be used exclusively. Attempting to use them outside of an update will trigger a runtime error with an appropriate error.
For those familiar with React Hooks, you can think of these has having a similar functionality (except `$` functions can be used in any order).

### DOM Reconciler

Lexical has its own DOM reconciler that takes a set of Editor States (always the "current" and the "pending") and applies a "diff"
on them. It then uses this diff to update only the parts of the DOM that need changing. You can think of this as a kind-of virtual DOM,
except Lexical is able to skip doing much of the diffing work, as it knows what was mutated in a given update. The DOM reconciler
adopts performance optimizations that benefit the typical heuristics of a content editable – and is able to ensure consistency for
LTR and RTL langauges automatically.

### Listeners, Node Transforms and Commands

Outside of invoking updates, the bulk of work done with Lexical is via listeners, node transforms and commands. These all stem from
the editor and are prefixed with `register`. Another important feature is that all the register methods return a function to easily unsubscribe them. For example here is how you listen to an update to a Lexical editor:

```js
const unregisterListener = editor.registerUpdateListener(({editorState}) => {
  // An update has occured!
  console.log(editorState);
});

// Ensure we remove the listener late!
unregisterListener();
```

Commands are the communication system used to wire everything together in Lexical. Custom commands can be created using `createCommand()` and
dispatched to an editor using `editor.dispatchCommand(command, payload)`. Lexical dispatches commands internally when key presses are triggered
and when other important signals occur. Commands can also be handled using `editor.registerCommand(handler, priority)`, and incoming commands are
propagated through all handlers by priority until a handler stops the propagation (in a similar way to event propagation in the browser).
