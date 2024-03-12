---
sidebar_position: 1
---

# Introduction

Lexical is an extensible JavaScript web text-editor framework with an emphasis on reliability, accessibility, and performance. Lexical aims to provide a best-in-class developer experience, so you can easily prototype and build features with confidence. Combined with a highly extensible architecture, Lexical allows developers to create unique text editing experiences that scale in size and functionality.

Lexical works by attaching itself to a `contentEditable` element and from there you can work with Lexical's declarative APIs to make
things happen without needing to worry about specific edge-cases around the DOM. In fact, you rarely need to interact with the DOM at all in
most cases (unless you build your own custom nodes).

<figure class="text--center">
  <img src="/img/docs/modular-design.drawio.svg" alt="Modular Design"/>
  <figcaption>Modular architecture allows fine grained control over functionality</figcaption>
</figure>

The core package of Lexical is only 22kb in file size (min+gzip) and you only ever pay the cost for what you need. So Lexical can grow with
your surface and the requirements. Furthermore, in frameworks that support lazy-loading, you can defer Lexical plugins until the user actually interacts with the editor itself – which can greatly help improve performance.

## What can be built with Lexical?

Lexical makes it possible to easily create complex text editing experiences that otherwise would be very complex with the built-in browser tooling. We built Lexical to enable developers to move-fast and create different types of text experiences that scale to specific requirements. Here are some (but not all) examples of what you can do with Lexical:

- Simple plain-text editors that have more requirements than a `<textarea>`, such as requiring features like mentions, custom emojis, links and hashtags.
- More complex rich-text editors that can be used to post content on blogs, social media, messaging applications.
- A full-blown WYSIWYG editor that can be used in a CMS or rich content editor.
- Real-time collaborative text editing experiences that combine many of the above points.

You can think of Lexical as a text editor UI framework. Whilst Lexical is currently only usable on the web, the team is also experimenting
with building native versions of Lexical for other platforms. At Meta, Lexical powers web text editing experiences for hundreds of millions of users everyday across Facebook, Workplace, Messenger, WhatsApp and Instagram.

## Lexical's Design

<figure class="text--center">
  <img src="/img/docs/core-conceptual-view.drawio.svg" alt="Conceptual View"/>
</figure>

The core of Lexical is a dependency-free text editor framework that allows developers to build powerful, simple and complex,
editor surfaces. Lexical has a few concepts that are worth exploring:

### Editor instances

Editor instances are the core thing that wires everything together. You can attach a `contenteditable` DOM element to editor instances, and also
register listeners and commands. Most importantly, the editor allows for updates to its `EditorState`. You can create an editor instance
using the `createEditor()` API, however you normally don't have to worry when using framework bindings such as `@lexical/react` as this
is handled for you.

### Editor States

An Editor State is the underlying data model that represents what you want to show on the DOM. Editor States contain two parts:

- a Lexical Node Tree
- a Lexical Selection object

Editor States are immutable once created, and in order to update one, you must do so via `editor.update(() => {...})`. However, you
can also "hook" into an existing update using node transforms or command handlers – which are invoked as part of an existing update
workflow to prevent cascading/water-falling of updates. You can retrieve the current editor state using `editor.getEditorState()`.

Editor States are also fully serializable to JSON and can easily be serialized back into the editor using `editor.parseEditorState()`.

### Editor Updates

When you want to change something in an Editor State, you must do it via an update, `editor.update(() => {...})`. The closure passed
to the update call is important. It's a place where you have full "lexical" context of the active editor state, and it exposes
access to the underlying Editor State's node tree. We promote using `$` prefixed functions in this context, as it signifies a place
where they can be used exclusively. Attempting to use them outside of an update will trigger a runtime error with an appropriate error.
For those familiar with React Hooks, you can think of these as having a similar functionality (except `$` functions can be used in any order).

### DOM Reconciler

Lexical has its own DOM reconciler that takes a set of Editor States (always the "current" and the "pending") and applies a "diff"
on them. It then uses this diff to update only the parts of the DOM that need changing. You can think of this as a kind-of virtual DOM,
except Lexical is able to skip doing much of the diffing work, as it knows what was mutated in a given update. The DOM reconciler
adopts performance optimizations that benefit the typical heuristics of a content editable – and is able to ensure consistency for
LTR and RTL languages automatically.

### Listeners, Node Transforms and Commands

Outside of invoking updates, the bulk of work done with Lexical is via listeners, node transforms and commands. These all stem from
the editor and are prefixed with `register`. Another important feature is that all the register methods return a function to easily unsubscribe them. For example here is how you listen to an update to a Lexical editor:

```js
const unregisterListener = editor.registerUpdateListener(({editorState}) => {
  // An update has occurred!
  console.log(editorState);
});

// Ensure we remove the listener later!
unregisterListener();
```

Commands are the communication system used to wire everything together in Lexical. Custom commands can be created using `createCommand()` and
dispatched to an editor using `editor.dispatchCommand(command, payload)`. Lexical dispatches commands internally when key presses are triggered
and when other important signals occur. Commands can also be handled using `editor.registerCommand(handler, priority)`, and incoming commands are
propagated through all handlers by priority until a handler stops the propagation (in a similar way to event propagation in the browser).
