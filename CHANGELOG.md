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
