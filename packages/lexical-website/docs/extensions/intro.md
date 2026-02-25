# Lexical Extensions

Extensions are a new convention to add configuration and behavior to a Lexical
editor in a modular and framework-independent manner. It is easier to use and
more powerful than the React plug-in scheme that came before, and is framework
agnostic.

See [Included Extensions](./included-extensions) for the list of extensions
that come with Lexical and its associated packages.

## Stability

🧪 This API is experimental, and may evolve with no deprecation
period. Be prepared to track its development closely if you adopt it early.

Lexical Extension became available in v0.36.1 (September 2025).

## Use Case

Lexical Extensions allow complex features to be added to your editor
in a single place. If you want to have an editor that supports check
lists, you simply add the `CheckListExtension` to your dependencies.
All of its dependent configuration, registration, and dependencies on
other extensions is encapsulated. Extensions also work the same way
with or without React, so you don't generally need separate
documentation and exports to support both.

All of the complexity for how and when things need to happen is
moved to `buildEditorFromExtensions` and the definitions of the
extensions themselves.

In contrast, using checklists without Lexical Extensions requires
`ListNode` and `ListItemNode` to be configured, and both the `ListPlugin` and
`CheckListPlugin` to be registered exactly one time each (or if not using
React: `registerList` and `registerCheckList`).

Customizing a Lexical editor without Lexical Extensions is done in two phases:

* Configuration before the editor is constructed
  (registered nodes, node replacement, theme, etc.)
* Registration after the editor is constructed
  (listeners, transforms, commands, react plug-ins, etc.)

In many cases, adding a feature to the editor requires *both* configuration
and registration. These typically happen at very different places in the code,
possibly even different files, and there are no transitive dependencies. It's
up to you to make sure that every required snippet of configuration and
registration code is included exactly once in the right place. When some dependent
configuration or registration is missing (or runs twice!), at best you get a runtime
error, but often it will partially work which is tricky to debug.

Another compelling use case for extensions is to provide functionality
from one extension to another extension (e.g. collaboration with yjs),
or have one extension enhance the capabilities of another (e.g. markdown
import/export, adding options to menus or toolbars, etc.).
This is very awkward and error-prone with legacy plug-ins since there is no
established pattern for them to depend on each other, and providing this
sort of functionality with React requires a strict hierarchy of context
providers. Any extension can provide output, which is equivalent to having
extension-specific context scoped to an editor.

## Core API Overview

The primary use case for extensions is to build an editor from a collection of
extensions. Any configuration or behavior specific to your editor should be
provided as an extension with
[defineExtension](/docs/api/modules/lexical#defineextension) or as an override
of some dependency's configuration with
[configExtension](/docs/api/modules/lexical#configextension). This is done
with either:

* [buildEditorFromExtensions](/docs/api/modules/lexical_extension#buildeditorfromextensions) - when not using React
* [LexicalExtensionComposer](/docs/api/modules/lexical_react_LexicalExtensionComposer) - when using React

See [Defining Extensions](./defining-extensions.md) for a detailed guide for
`defineExtension`.

The following functions are included in the core
[lexical](/docs/api/modules/lexical) module to ensure that defining
extensions is lightweight and requires no dependency on the runtime
features of [@lexical/extension](/docs/api/modules/lexical_extension).
These functions are primarily for type inference with very minimal
implementations.

* [defineExtension](/docs/api/modules/lexical#defineextension) - define an extension
* [configExtension](/docs/api/modules/lexical#configextension) - provide configuration overrides for an extension
* [declarePeerDependency](/docs/api/modules/lexical#declarepeerdependency) - declare an indirect dependency on another extension by name
* [safeCast](/docs/api/modules/lexical#safecast) - a convenience for TypeScript casting, with more safety than `as`. Similar to using a variable with a declared type.
* [shallowMergeConfig](/docs/api/modules/lexical#shallowmergeconfig) - the default configuration merge strategy

## Advanced features

- [Signals](./signals) - Can be used for extensions to change their configuration or behavior at runtime, such as dynamically enabling or disabling an extension. This is also used to facilitate some performance optimizations around subscriptions and listeners.
- [Peer Dependencies](./peer-dependencies) - Used to declare indirect or optional dependencies between extensions, this can be used to enable some functionality or configuration only when some other extension is available. For example, an Emoji extension may declare a specific Markdown serialization for EmojiNode, but only if the Markdown extension is present.
