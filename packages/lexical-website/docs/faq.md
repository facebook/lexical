---
sidebar_position: 7
---

# FAQ

## Why does Lexical use the `$` prefix in the name of many of the functions?

Originally, Lexical didn't have `$` functions, instead these functions were provided to you through callback params:

```js
// Mid 2020 API
editor.update((viewState) => {
  const getRoot = viewState.getRoot();
  ..
});
editor.addTextTransform((viewState) => {
  const getRoot = viewState.getRoot();
  ..
});
```

Internally, this approach raised some negative feedback:

- The `viewState` terminology was confusing. It wasn't really a `viewState`, more like a toolkit to manipulate the `EditorState`
- For complex updates and transforms devs had to carry params around on many layers

This is when we decided to leverage the "lexical" scope instead to perform `EditorState` manipulation, and the `$` represents just that.

```js
editor.update(() => ...);
editor.registerNodeTransform(FooNode, () => ...);
editor.getEditorState().read(...);
```

If you've used React Hooks before, you can think of `$` functions as being something that follows a similar pattern. These are functions that show their intent as to where they can or cannot be used. This makes it possible for a developer to create their own functions that give the same signal, by simply prefixing the function with the dollar.

Internally, we've found this scales really well and developers get to grips with it in almost no time at all.

## When does reconciliation happen?

Reconciliation is scheduled with
[queueMicrotask](https://developer.mozilla.org/en-US/docs/Web/API/queueMicrotask),
which means that it will happen very soon, but asynchronously. This is similar
to something like `setTimeout(reconcile, 0)` with a bit more immediacy or
`Promise.resolve().then(reconcile)` with less overhead. This is done so
that all of the updates that occur as a result of a single logical event will
be batched into one reconciliation.

You can force a reconciliation to take place synchronously with the discrete
option to `editor.update` (demonstrated below).

## Why do tests use `await editor.update(…)`

You may notice that many tests look like this:

```js
await editor.update(updateA);
await editor.update(updateB);
```

An astute observer would notice that this seems very strange, since
`editor.update()` returns `void` and not `Promise<void>`. However,
it does happen to work as you would want it to because
the implementation of Promise uses the same microtask queue.

It's not recommended to rely on this in browser code as it could depend on
implementation details of the compilers, bundlers, and VM. It's best to stick
to using the `discrete` or the `onUpdate` callback options to be sure that
the reconciliation has taken place.

Ignoring any other microtasks that were scheduled elsewhere,
it is roughly equivalent to this synchronous code:

```js
editor.update(updateA, {discrete: true});
editor.update(updateB, {discrete: true});
```

At a high level, very roughly, the order of operations looks like this:

1. `editor.update()` is called
2. `updateA()` is called and updates the editor state
3. `editor.update()` schedules a reconciliation microtask and returns
4. `await` schedules a resume microtask and yields control to the task executor
5. the reconciliation microtask runs, reconciling the editor state with the DOM
6. the resume microtask runs

## How do I listen for user text insertions?

Listening to text insertion events is problematic with content editables in general. It's a common source of bugs due to how
different browsers and third-party extensions interact with the DOM. Whilst it's possible to use DOM events like `input` and
`beforeinput` to gauge some of the possible cases where a user has inserted text, these are hardly reliable and also don't
take into account edge-cases. Instead, Lexical prefers to consider any change as a possible user input, and as such doesn't
make a distinction between the cases. This is important for tools like spellcheck, browser extensions, IME, speech-to-text,
screen readers and other external tools that often don't reliably trigger a reliable event sequence (some don't even trigger
any events at all!).

For those wanting to react to a text change and possibly block/alter the intent, the recommended approach is to use a node
transform. This also plays nicely with other sub-systems at play that might also be looking to do the same thing as you.

For those who just want to know of the changes, this can be achieved using a text content listener or an editor update listener.

## How do I clear the contents of the editor?

You can go this by calling ```clear()``` on the RootNode in an update callback:

```js
editor.update(() => {
  $getRoot().clear();
})
```

## How do I listen to specific key down events?

You can leverage Lexical's command listening system. Lexical provides specific commands for many common keyboard operations, such as:

- `KEY_ARROW_LEFT_COMMAND`
- `KEY_ARROW_RIGHT_COMMAND`
- `KEY_ARROW_UP_COMMAND`
- `KEY_ARROW_DOWN_COMMAND`
- `KEY_SPACE_COMMAND`
- `KEY_ENTER_COMMAND`
- `KEY_BACKSPACE_COMMAND`
- `KEY_DELETE_COMMAND`
- `KEY_TAB_COMMAND`
- `KEY_ESCAPE_COMMAND`

```js
import {KEY_ENTER_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';

editor.registerCommand(KEY_ENTER_COMMAND, (event: KeyboardEvent) => {
  // Handle enter key presses here
  return false;
}, COMMAND_PRIORITY_LOW)
```

You can use the generic `KEY_DOWN_COMMAND` command to listen
to all keydown events. Do note, that returning `true` in your listener will prevent any
other key based commands from firing, so in most cases you'll want to return `false` from
the command listener.

```js
import {KEY_DOWN_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';

editor.registerCommand(KEY_DOWN_COMMAND, (event: KeyboardEvent) => {
  // Handle event here
  return false;
}, COMMAND_PRIORITY_LOW)
```
