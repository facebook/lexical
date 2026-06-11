# `@lexical/dragon`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_dragon)

This package adds compatibility with Dragon NaturallySpeaking, a speech
recognition tool whose web extension drives editable fields through window
messages. The handler applies those edits through Lexical APIs and stops the
messages from reaching the extension's own handler, which would otherwise
edit the DOM directly behind Lexical's back.

Editors register automatically through `DragonExtension` (a dependency of
`@lexical/rich-text` and `@lexical/plain-text` extensions) or by calling
`registerDragonSupport(editor)`.

## Registering early

Browsers invoke a window's message listeners in registration order, and the
Dragon extension's content script registers its listener at `document_end`
of the initial page load. Editors that mount later (after a navigation in a
single page app, in a dialog, in any lazily rendered view) register their
handler after the extension's, too late to block it, and edits end up
applied twice.

To win that race, call `installDragonSupport()` synchronously from every
entrypoint that may render an editor lazily, so the shared listener is
registered before the extension's:

```js
import {installDragonSupport} from '@lexical/dragon';

installDragonSupport();
```

It returns a teardown function; the listener is removed once every teardown
(including the ones from `registerDragonSupport`) has been called.

For editors mounted inside iframes, pass the iframe's window so the
listener is installed against the right one. State is kept per window,
so multiple frames can coexist:

```js
installDragonSupport(iframe.contentWindow);
```
