## 0.3.5 (June 16, 2022)

- Fix bad warnOnlyOnce minification (#2448)
- add missing flow type (#2447)

## 0.3.4 (June 16, 2022)
- Customizable DecoratorBlockNode via theme (#2387)
- initializeEditorState on LexicalComposer (#2425)
- Revert "Prevent dispatching redundant can undo/redo commands (#2394)" (#2440)
- Improve `Spread` type (#2434)
- Improve text mutations around selection format changes (#2433)
- Remove redundant newlines (#2431)
- fix: add styles on copy (#2427)
- Fix exposed private methods (#2429)
- Fix backspace bug with non-RangeSelection (#2416)
- Fix Android backspace bug (#2412)
- Fix orphan list item clipboard bug (#2407)
- Remove default json and node-type from DOM output. (#2404)
- Simplify clickable links checks (#2395)
- Prevent dispatching redundant can undo/redo commands (#2394)
- Editor instance toJSON should call toJSON method on editor state (#2390)

## 0.3.3 (June 9, 2022)

- Add stringified LexicalNodes to clipboard for lossless Lexical <-> Lexical copy and paste. (#2370)
- Fix bad target issue for backspace/delete (#2375)
- Improve nested editor propagation (#2367)
- Fix scrolling issues due to browser rounding bugs (#2350)
- Code cleanup, type definition and docs improvements

Playground
- Autocomplete v2 (#2343)
- Add collaboration support for commenting (#2376)

## 0.3.2 (June 6, 2022)

- added typing for ListItemNode.setChecked, export ListNodeTagType (#2335) 
- Fix copy + paste in plain text (#2342)
- Remove process.env (#2338)

## 0.3.1 (June 3, 2022)

- Fix link toggle bug (#2331)
- Enable copy+paste on NodeSelection (#2327)
- Add default exportDOM and importDOM methods (#2324)
- Disable checklist items in readOnly mode (#2321)

## 0.3.0 (June 2, 2022)

> Note: this release contains a number of breaking changes.

### Major Changes
- JSON parsing has changed from previous versions when serializing/parsing EditorState. See https://lexical.dev/docs/concepts/serialization.
- Custom nodes that do not implement `importDOM`/`exportDOM`/`importJSON`/`exportJSON` may trigger a warning in DEV.
- Imports from the Lexical npm packages that were previously default exports are now all named exports.

### All Changes
- Fix various JSON/HTML issues (#2317)
- Add includeHeaders argument to INSERT_TABLE_COMMAND (#2300)
- 02cb62f8 Fix invariant and update codes (#2315)
- 6665c41c Stengthen onClick conditional (#2314)
- 099376fa fix mispositioning of treeview caret (#2309)
- c7191cc7 Remove unstable JSON serialization functions + unify copy+paste to be HTML (#2241)
- 52c3d325 Normalize decorator warnings (#2291)
- 3970b95b Improve DEV warnings for node methods (#2290)
- 048fccab move toggleLink to lexical/link (#2239)
- 6a01a8f3 Revise $hasUpdateTag (#2281)
- 2f78eeb4 Improve scroll plugin (#2282)
- eadd6dba Expose $getUpdateTags and $addUpdateTag (#2279)
- eeccb4dd Improve copy + paste logic (#2276)
- 06cac8e8 Fix bug in $createNodesFromDOM (#2275)
- f6d4fa1a Simplify runtime logic (#2272)
- 62f4052a Fix placeholder race conditions on load (#2270)
- 2ff67df4 Provide legacy editor state JSON conversion (#2269)
- b69f8df5 fix(code-block): move to start/move to end (#2257)
- 65ebc8d9 Rename $rootTextContentCurry -> $rootTextContent (#2018)
- 4e81bd30 Alter sequence for commitPendingUpdates (#2262)
- a0f7c0d2 Fix bug in trimTextContentFromAnchor (#2265)
- 018083f8 Check for frozen selection only on dev env (#2264)
- 82f4365a Move HTML<->Lexical functions to new package, @lexical/html. (#2246)
- e0ad392f Expose $parseSerializedNode (#2253)
- 584b8460 feat: drop down keyboard navigation (#1985)
- 90aad493 Add MaxLengthPlugin (#2254)
- 94673423 Trim surrounding whitespace before applying text formatting during markdown export (#2251)
- 77f1d594 Expose RootNode to be used in node transform (#2243)
- eb411fd7 Rename insert text command (#2242)
- 3b7e6846 Skip underscores for links (non-intraword format) (#2191)
- d411cce8 Add missing types (#2225)
- 8d549259 Support Strikethrough and italic paste from Google Docs (#2220)
- 71824d1b Fix text replacement event handling (#2203)
- 97acadd3 Ensure selection is not prematurely nulled out on blur (#2158)
- 4229de03 Improve useDecorators sequencing (#2200)
- 21a9d456 Adjust selection to be after decorator node when moving selection to the end of decorator/linebreak (#2162)
- 92237d6f add runtime check for list node and list item node (#2196)
- 91ba4725 Remove default exports from synced packages (#2193)
- bf4ed74a Fix Safari IME issues (#2185)
- cfc1cf62 Ensure window.event is valid (#2184)
- ebbedbbc Delete unused variable dfsAncestor (#2173)
- 29bcd493 Add utility types as dep (#2177)
- d83515c4 Update LexicalMarkdownShortcutPlugin.d.ts (#2160)
- bccd5402 Replace element node with list item instead of appending. Fix #2142 (#2146)

## 0.2.9 (May 11, 2022)

- Fix a breaking change to the NPM release (#2144)

## 0.2.8 (May 11, 2022)

- Migrate more packages to TypeScript (#2135)
- Fix several TypeScript type bugs (#2116)
- Fix several Markdown export bugs (#2136m #2137, #2139)

## 0.2.7 (May 9, 2022)

- Fix Firefox composition bug with emojis (#2109)
- Add a cache for selection.getNodes() (#2088)
- remove root style from theme (#2084)
- Fix character styles position + caret color (#2080)
- Remove TextNode __marks (#2022)
- Move isComposing to TextNode (#2032)
- Markdown import/export/shortcuts (#1998)
- Improve Lexical -> HTML and Lexical -> Lexical Copy and Paste Data Model Conversion (#1996)
- Headless editor mode (#2046)
- Checklist support (#2050)
- Type definitions fixes (#2076, #2030, #2023, #2028)
- Adding support for parsed JSON in addition to stringified JSON (#2055)
- Remove root style from theme (#2084)
- Fix character styles position + caret color (#2080)
- Multiple fixes for node insertion and selection
- Documentation updates

## 0.2.5 (April 28, 2022)

- Add TextMarks to TextNode (#1912)
- Fix various collab bugs with lists (#1984)
- Fix cached getTextContent() to reflect new lines (#1993)
- Fix equation node handling on Android (#1968) 
- Fix formatting on embeds (#1963)
- Improve multi element indentation - added ElementNode.canIndent (#1982)
- Fix bugs around pressing the enter key in Safari (#1943)
- Fix delete empty lines on tables (#1905)
- Fix copy-paste format loss (#1913)
- Fix memory leak with EditorContext (#1767) 
- Fix various selection issues on node boundaries (#1917)
- Fix some .js.flow and d.ts types

## 0.2.4 (April 21, 2022)

- Add subscript/superscript elements to TextNode (#1903)
- Do not reconcile selection during readOnly (#1900)
- Add embed block to playground (#1895)
- Fix list outdent & indent bug (#1883)
- Excalidraw fixes (#1871)
- Updates to type definitions for Flow and TS
- Updates to documentation

## 0.2.3 (April 19, 2022)

- Fix bug in lists causing extra list items to be appended in some cases. (#1802)
- Fix double selection issue in collab (#1856)
- Add KEY_MODIFIER_COMMAND (#1859)
- Fix bug with alignment for root level decorator nodes v2 (#1867)
- Fix issue with inserting paragraphs between text nodes. (#1864)

## 0.2.2 (April 18, 2022)

- Command priorities are now constants exposed by lexical
- More fixes to Android GBoard
- Fixed some any d.ts types

## 0.2.1 (April 14, 2022)

- Fix selection issue with insertNodes
- Fix rich text align for multiple nodes
- Improve CodeBlock selection escaping
- Fix detection of iOS browser
- Fix Ctrl+H Delete backward
- Fix type of children in TypeScript declarations
- Fix android GBoard issues
- Various other fixes and improvements

## 0.2.0 (April 13, 2022)

- Remove DecoratorNode state
- Redefine TS React.Node type
- Add markdown indented list support
- Fix IME issue when applying text format

## 0.1.21 (April 12, 2022)

- Add line numbers in Code Highlight plugin.
- Remove top-level document reference to fix SSR.
- Show highlight language over code block
- Fix bug in RangeSelection.is that was causing incorrect formatting.
- Improve copy/paste for Tables and Lists
- Handle RangeSelection Containing Partial Table Selection

## 0.1.20 (April 7, 2022)

- Fix build issue with @lexical/code
- Add $getNearestBlockElementAncestorOrThrow helper
- Fix issues related to getting the wrong element ancestor in certain rich text features
- Improve table resizing

## 0.1.19 (April 7, 2022)

- Fix import issue in @lexical/list
- Fix incorrect types in @lexical/dragon

## 0.1.18 (April 6, 2022)

- Fix bad build

## 0.1.17 (April 6, 2022)

- Fix some outstanding issues with the textcontent listener and the removal of linebreaks.
- Add useLexicaTextEntity hook for using TextEntity in React.
- Add a warning when cloned nodes might unexpectedly refer to the pending editor state
- Add support for keyboard selection in Tables.
- Rename add* APIs to register* (e.g., addUpdateListener -> registerUpdateListener)
- Deprecate editor prop in Lexical Composer
- Reorganize code, creating several new packages: @lexical/code, rich-text, plain-text, dragon, history, link, overflow, markdown
- Move withSubscription to @lexical/utils
- Move command types out of listener callbacks and makes them an argument to registerCommand
- Add createCommand for better command payload typing
- Rename execCommand to dispatchCommand
- Add id prop to LexicalContentEditable
- Add basic support for copying and pasting tables.
- Various bug fixes and performance improvements

## 0.1.16 (March 17, 2022)

- Fix scrolling regression.
- Add missing dependency in lexical-react.

## 0.1.15 (March 16, 2022)

- Improve composition on Firefox
- Splits helper code into several smaller packages.
- Fixes clipboard behavior on Firefox.
- Fix hashtag with adjacent non-simple text node
- Rename addTransform to addNodeTransform
- Fix copy & paste issue

## 0.1.14 (March 04, 2022)

- Added TableCellHeaderStates to enable table header customization.
- Fixes to composition for WebKit.
- Fixes to HashtagPlugin destroy behavior.
- SSR fixes.

## 0.1.13 (March 02, 2022)

- Moved appropriate NPM peer dependencies to dependencies. I.e. @lexical/clipboard will now be fetched automatically when using @lexical/react.
- Simplified LexicalNestedComposer props to inherit parent when possible.
- SSR fixes.

## 0.1.12 (February 28, 2022)

- Added TypeScript definitions for lexical and @lexical/react
- LexicalComposer and createEditor now take a mandatory onError prop.
- createEditor can now take an optional readOnly prop.
- Moved LexicalEventHelpers to @lexical/clipboard.
- Minor selection fixes.

## 0.1.11 (February 24, 2022)

- Added GridSelection to support table selection. Selection is now `null | RangeSelection | GridSelection | NodeSelection`.
- The editor now natively supports read only mode. Use `editor.setReadOnly(boolean)` and `editor.isReadOnly()` to find the read only mode.
- An additional listener has been added to support listening to readonly changes. Use `editor.registerListener('readonly', value => {... })` to react to read only mode changes.
- The BootstrapPlugin has been removed. Instead now use the `initialEditorState` prop on either the PlainTextPlugin or RichTextPlugin to initialize editor state.

## 0.1.10 (February 22, 2022)

- Added NodeSelection to support multiple non-adjacent node selection. Selection is now `null | RangeSelection | NodeSelection`. Upgrade note: `selection !== null` -> `$isRangeSelection(selection)`.
- HTML to DOM conversion has been to moved to the nodes themselves. Nodes now take an optional `static convertDOM(): DOMConversionMap | null`.
- When onError is not passed to `createEditor({onError})` errors will now throw by default. Also, removed `registerListener('error')`.
- Fixed BootstrapPlugin race condition.

## 0.1.9 (February 18, 2022)

- Added `registerListener('mutation', Class<LexicalNode>, Map<NodeKey, NodeMutation>)` to track created/destroyed nodes. `NodeMutation = 'created' | 'destroyed'`
- Removed `$log()`.
- Moved TableNode/Row/Cell to its own `@lexical/table` package.
- Composition fixes.

## 0.1.8 (February 11, 2022)

- `Lexical{Plain/Rich}TextPlugin` and `DEPRECATED_use{Plain/Rich}TextPlugin` no longer create a ParagraphNode for you. This logic has been decoupled into a separate plugin <BootstrapPlugin />. The Bootstrap plugin also accepts an initialPayloadFn and clearEditorFn for custom initialization (i.e. edit behavior from server data). `<BootstrapPlugin /> <RichTextPlugin .. />`. If you're using the `DEPRECATED_{Plain/Rich}Text` version you may also want to copy-paste this hook and run it before the RichText initialization - https://github.com/facebook/lexical/blob/main/packages/lexical/src/__tests__/utils/DEPRECATED__useLexicalBootstrap.js
- Bugfixes.
