# `@lexical/eslint-plugin`

This ESLint plugin enforces the [Lexical $function convention](https://lexical.dev/docs/intro#reading-and-updating-editor-state).

## Installation

Assuming you already have ESLint installed, run:

```sh
npm install @lexical/eslint-plugin --save-dev
```

Then extend the recommended eslint config:

```js
{
  "extends": [
    // ...
    "plugin:@lexical/recommended"
  ]
}
```

### Custom Configuration

If you want more fine-grained configuration, you can instead add a snippet like this to your ESLint configuration file:

```js
{
  "plugins": [
    // ...
    "@lexical"
  ],
  "rules": {
    // ...
    "@lexical/rules-of-lexical": "error"
  }
}
```

### Advanced configuration

Most of the heuristics in `@lexical/rules-of-lexical` can be extended with
additional terms or patterns.

The code example below is shown using the default implementations for each
option. When you configure these they are combined with the default
implementations using "OR", the default implementations can not be overridden.
These terms and patterns are only shown for reference and pasting this example
into your project is not useful.

If the string begins with a `"^"` or `"("` then it is treated as a RegExp,
otherwise it will be an exact match. A string may also be used instead
of an array of strings.

```js
{
  "plugins": [
    // ...
    "@lexical"
  ],
  "rules": {
    // ...
    "@lexical/rules-of-lexical": [
      "error",
      {
        "isDollarFunction": ["^\\$[a-z_]"],
        "isIgnoredFunction": [],
        "isLexicalProvider": [
          "parseEditorState",
          "read",
          "registerCommand",
          "registerNodeTransform",
          "update"
        ],
        "isSafeDollarFunction": ["^\\$is"]
      }
    ]
  }
}
```

#### `isDollarFunction`

*Base case*: `/^\$[a-z_]/`

This defines the \$function convention, which by default is any function that
starts with a dollar sign followed by a lowercase latin letter. You may have a
secondary convention in your codebase, such as non-latin letters, or an
internal prefix that you want to consider (e.g. `"^INTERNAL_\\$"`).

#### `isIgnoredFunction`

*Base case*: None

Functions that match these patterns are ignored from analysis, they may call
Lexical \$functions but are not considered to be a dollar function themselves.

#### `isLexicalProvider`

*Base case*: `/^(parseEditorState|read|registerCommand|registerNodeTransform|update)$/`

These are functions that allow their function argument to use Lexical
\$functions.

#### `isSafeDollarFunction`

*Base case*: `/^\$is/`

These \$functions are considered safe to call from anywhere, generally
these functions are runtime type checks that do not depend on any other
state.

## Valid and Invalid Examples

### Valid Examples

\$functions may be called by other \$functions

```js
function $namedCorrectly() {
  return $getRoot();
}
```

\$functions may be called in functions defined when calling the following
methods (the heuristic only considers the method name):

* `editor.update`
* `editorState.read`
* `editor.registerCommand`
* `editor.registerNodeTransform`

```js
function validUsesEditorOrState(editor) {
  editor.update(() => $getRoot());
  editor.getLatestState().read(() => $getRoot());
}
```

\$functions may be called from class methods

```js
class CustomNode extends ElementNode {
  appendText(string) {
    this.appendChild($createTextNode(string));
  }
}
```

### Invalid Examples

#### Rename autofix

```js
function invalidFunction() {
  return $getRoot();
}
function $callsInvalidFunction() {
  return invalidFunction();
}
```

*Autofix:* The function is renamed with a $ prefix. Any references to this
name in this module are also always renamed.

```js
function $invalidFunction() {
  return $getRoot();
}
function $callsInvalidFunction() {
  return $invalidFunction();
}
```

#### Rename & deprecate autofix

```js
export function exportedInvalidFunction() {
  return $getRoot();
}
```

*Autofix:* The exported function is renamed with a $ prefix. The previous name
is also exported and marked deprecated, because automatic renaming of
references to that name is limited to the module's scope.

```js
export function $exportedInvalidFunction() {
  return $getRoot();
}
/** @deprecated renamed to {@link $exportedInvalidFunction} by @lexical/eslint-plugin rules-of-lexical */
export const exportedInvalidFunction = $exportedInvalidFunction;
```

#### Rename scope conflict

```js
import {$getRoot} from 'lexical';
function InvalidComponent() {
  const [editor] = useLexicalComposerContext();
  const getRoot = useCallback(() => $getRoot(), []);
  return (<button onClick={() => editor.update(() => getRoot())} />);
}
```

*Autofix:* The function is renamed with a $ prefix and _ suffix since the suggested name was already in scope.

```js
import {$getRoot} from 'lexical';
function InvalidComponent() {
  const [editor] = useLexicalComposerContext();
  const $getRoot_ = useCallback(() => $getRoot(), []);
  return (<button onClick={() => editor.update(() => $getRoot_())} />);
}
```
