# `@lexical/selection`

This package contains selection helpers for Lexical.

### Methods

#### `$cloneContents`

Clones the Lexical nodes in the selection, returning a map of Key -> LexicalNode and a list containing the keys
of all direct children of the RootNode. Useful for insertion/transfer operations, such as copy and paste.

```ts
export function $cloneContents(
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[NodeKey, LexicalNode]>;
  range: Array<NodeKey>;
};
```

#### `getStyleObjectFromCSS`

Given a CSS string, returns an object from the style cache.

```ts
export function getStyleObjectFromCSS(css: string): {
  [key: string]: string;
} | null;
```

#### `$patchStyleText`

Applies the provided styles to the TextNodes in the provided Selection. Key names in the patch argument should be
the valid CSS properties (i.e., kebab-case).

```ts
export function $patchStyleText(
  selection: RangeSelection | GridSelection,
  patch: {
    [key: string]: string;
  },
): void;
```

#### `$getSelectionStyleValueForProperty`

Given a selection and a valid CSS property name, returns the current value of that property for TextNodes in the Selection, if set. If not set, it returns the defaultValue. If all TextNodes do not have the same value, it returns an empty string.

```ts
export function $getSelectionStyleValueForProperty(
  selection: RangeSelection,
  styleProperty: string,
  defaultValue: string,
): string;
```

#### `$moveCaretSelection`

Moves the selection according to the arguments.

```ts
export function $moveCaretSelection(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void;
```

#### `$isParentElementRTL`

Returns true if the parent of the Selection anchor node is in Right-To-Left mode, false if not.

```ts
export function $isParentElementRTL(selection: RangeSelection): boolean;
```

#### `$moveCharacter`

Wraps $moveCaretSelection, using character granularity and accounting for RTL mode.

```ts
export function $moveCharacter(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void;
```

#### `$selectAll`

Expands the current Selection to cover all of the content in the editor.

```ts
export function $selectAll(selection: RangeSelection): void;
```

#### `$wrapNodes`

Attempts to wrap all nodes in the Selection in ElementNodes returned from createElement. If wrappingElement is provided, all of the wrapped leaves are appended to the wrappingElement. It attempts to append the resulting sub-tree to the nearest safe insertion target.

```ts
export function $wrapNodes(
  selection: RangeSelection,
  createElement: () => ElementNode,
  wrappingElement?: ElementNode,
): void;
```

#### `$isAtNodeEnd`

Returns true if the provided point offset is in the last possible position.

```ts
export function $isAtNodeEnd(point: Point): boolean;
```

#### `$shouldOverrideDefaultCharacterSelection`

Returns true if default character selection should be overridden, false if not. Used with DecoratorNodes

```ts
export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean;
```
