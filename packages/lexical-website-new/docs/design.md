# Lexical's Design

> Note: this document is still a work-in-progress and things are likely still in flux.

Lexical was built from the ground up to be a lean and extensible text-editing framework.

You can think of Lexical as more of a text editing engine, rather than a monolithic text
editor that provides everything out-of-the-box. It might help to think of Lexical as
a framework like React – where React provides some hooks and a reconciler, and then you
build the things you need on top, rather than have them included by default.

The main concept of Lexical is the editor state. Lexical uses a double-buffering technique
to ensure consistency and reliability. There are never more than two editor states in play.
The "current" editor state represents what you can visibly see on screen and the "pending"
editor state is what is currently being constructed to be shown in the future. Once the
"pending" editor state is ready, it swaps and becomes the new "current" editor state.

Lexical's core concerns itself with four main concerns:

- Updates: the act of making changes to editor state
- Node Transforms: the process of acting on ongoing updates
- Reconciliation: the process of patching the DOM with the latest editor state
- Listening/Commands: the process of reacting to changes that occur internally

Additionally, Lexical uses DOM mutation observers to ensure that any outside changes to
the editor DOM element are either reverted back to Lexical's current editor state, or are
communicated as intents that cause further updates to the editor state (text changes).

This separation was done to ensure developers have a way of applying custom logic with the
implementation and framework of their choice. This makes it possible to use Lexical with
React, or any other JavaScript web framework/library. This also makes it easier to tackle
problems around collaboration and undo/redo, where you might have an alternative model involved.
Instead of hoping for the text editor to support what you want, you can work with the editor
to make what you want.

This design can make getting started a bit more complex in certain cases, but as we've been
able to demonstrate with our `@lexical/react` plugins and hooks – you can get started, in the
form of an out-of-the-box experience.
