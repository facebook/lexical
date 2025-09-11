# Lexical Extensions

Extensions are a new convention to add configuration and behavior to a Lexical
editor in a modular and framework-independent manner. It is easier to use and
more powerful than the React plug-in scheme that came before, and is framework
agnostic.

See [Included Extensions](./included-extensions) for the list of extensions
that come with Lexical and its associated packages.

## Stability

🧪 This API is experimental, and may evolve without a long deprecation
period. See also [Capabilities](#capabilities) for notes on what it
can and can not do out of the box today.

## Motivation

Customizing a Lexical editor without Lexical Extensions is done in two phases:

* Configuration before the editor is constructed
  (registered nodes, node replacement, theme, etc.)
* Registration after the editor is constructed
  (listeners, transforms, commands, react plug-ins, etc.)

In many cases, adding a feature to the editor requires *both* configuration
and registration. These typically happen at very different places in the code,
and there is no dependency management without extensions. If some dependent
configuration or registration is missing, at best you get a runtime error, but
often it will partially work which is tricky to debug.

For example, using checklists in Lexical requires `ListNode` and `ListItemNode`
to be configured, and both the `ListPlugin` and `CheckListPlugin` to be registered
(or if not using React: `registerList` and `registerCheckList`).

When using extensions, you simply add `CheckListExtension` to your dependencies.
It doesn't matter whether you are using React or not. Its `ListExtension`
dependency will automatically be included (exactly once, even if it appears separately).

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
