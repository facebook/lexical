## v0.14.2 (2024-03-18)

- Fix order of exports in lexical-react (#5732) Brian Birtles
- Clean up CHANGELOG (#5730) Ivaylo Pavlov
- v0.14.1 (#5729) Ivaylo Pavlov
- v0.14.1 Lexical GitHub Actions Bot

## v0.14.1 (2024-03-18)

- ESM build (#5618) Bob Ippolito
- Fix height and width parsing in ImportDOM for ExcalidrawNode (#5721) Ivaylo Pavlov
- ImportDOM and ExportDOM for LayoutContainerNode (#5722) Ivaylo Pavlov
- Fix dont call importDOM methods more than once (#5726) Georgii Dolzhykov
- Add test for multiple leading # characters in a hashtag (#5723) wnhlee
- Fix to count tabs as list indentation on importing markdown (#5706) wnhlee
- Update CharacterLimitPlugin to support custom renderer (#5715) wnhlee
- docs Added links to API docs for respective packages (#5719) Vlad Fedosov
- docs Creating a Plugin page  example (#5717) Vlad Fedosov
- Add code snippets for ClearEditorPlugin and MarkdownShortcutPlugin (#5711) Nick
- Send click event in read-only editor (#5714) Ivaylo Pavlov
- Fix deletion issues when using Chromium Android (#5644) Aman Harwara
- Export table row height in JSON (#5696) Ivaylo Pavlov
- Fix Bulleting a Node Selection (#5699) Ivaylo Pavlov
- fix  Typo in the collaboration nodes (#5702) Pranav Bakre
- Fix endless renders with editorRef callback (#5701) wnhlee
- style fix broken eslint check of #5625 (#5694) yf-yang
- Fix forward word deletion destructing element nodes (#5625) Ivaylo Pavlov
- fix(tables) Add missing paragraph node when copying empty cells from external resources (#5670) Simon Pasquereau
- chore(docs) Changed stackblitz.com links to point at this repo (#5685) Vlad Fedosov
- docs Added conceptual view of the Lexical Core Design (#5677) Vlad Fedosov
- Add support for grid selection in text alignment. (#5652) Serey Roth
- docs Added reasoning on why State is necessary (#5678) Vlad Fedosov
- docs Improved Getting Started with React guide (#5676) Vlad Fedosov
- docs add a tip about discrete state update (#5664) Micha Dzienisiewicz
- fix Fix E2E tests in Safari (Webkit) (#5672) Vlad Fedosov
- Configure ESLint enable curly rule, fix on save (#5666) Georgii Dolzhykov
- docs Interactive Vanilla JS example (#5668) Vlad Fedosov
- support multiple windows (#5070) Rob Figueiredo
- docs Added visualization of the Lexical modular architecture (#5667) Vlad Fedosov
- Refactor simplify getFirstDescendant and getLastDescendant (#5665) Georgii Dolzhykov
- Unbullet one list item not the whole list (#5621) Ivaylo Pavlov
- Preserve bullet item indent on newline (#5578) Ivaylo Pavlov
- fix unify class name splittingfiltering with normalizeClassNames (#5649) Bob Ippolito
- Move to native UUID (#5622) Ivaylo Pavlov
- Escape Layout Plugin (#5626) Ivaylo Pavlov
- 0.14 Remove unused canExtractContents (#5628) Ivaylo Pavlov
- Revert Fix hashtag regex blocking transform to heading (#5636) Acy Watson
- Fix hashtag regex blocking transform to heading (#5376) wnhlee
- Fix shiftarrow down selection for tables in sequence. (#5617) Serey Roth
- Revert Fixed position for lexical menu (#5602) (#5614) Gerard Rovira
- fix disable markdown shortcuts for collaboration (#5591) junhsss
- fix Improve performance of updateChildrenListItemValue (#5590) Bob Ippolito
- Fixed position for lexical menu (#5602) Ebad
- Bug Right Align in Toolbar for RTL direction shows Left Align Icon (#5561) Muhammad Fahad
- fix hide Firefoxs text size buttons (#5588) Martin
- IME Input via CDP with latest Playwright (#5584) Ivaylo Pavlov
- Fix list selection when first node followed by an element node (#5583) Ivaylo Pavlov
- fix update docs example (#5586) James Pulec
- Fix Double Deletion on Backspace (#5580) Ivaylo Pavlov
- Fix Poll Node (#5579) Ivaylo Pavlov
- Fix computeTableMap flow (#5574) Gerard Rovira
- Update react documentation (#5568) Pavel Shermayster
- Edit Link modal fix (#5551) Harry Sanders
- Add lexicalhtml to docs (#5557) wnhlee
- Prevent file img conversion (#5563) Gerard Rovira
- Fix add class to elements exported from CodeNode (#5558) wnhlee
- v0.13.1 (#5556) Gerard Rovira
- Fix Flow getCharacterOffsets (#5555) Gerard Rovira
- v0.13.1 Lexical GitHub Actions Bot

## v0.13.1 (2024-01-27)

- Update InlineImageNode.tsx (#5552) lvvl
- docs correct react plugin name (#5554) sj
- Check global.window on DOM availability check (#5547) wnhlee
- Update CODEOWNERS (#5550) Gerard Rovira
- feat Expose getActiveEditor and getActiveEditorState (#5409) yf-yang
- Floating link editor for AutoLinkNode and conversion to LinkNode once modified. (#5536) Harry Sanders
- Add rowcolumn with correct header styles (#5546) Shubhanker Srivastava
- v0.13.0 (#5540) Gerard Rovira
- Add missing flow types (#5542) Gerard Rovira
- v0.13.0 Lexical GitHub Actions Bot

## v0.13.0 (2024-01-24)

- Rename LexicalTableSelection to LexicalTableObserver (#5533) Gerard Rovira
- Move Grid to lexicaltable (#5532) Gerard Rovira
- Remove Grid Nodes (#5531) Gerard Rovira
- Move Grid to lexicaltable (#5528) Gerard Rovira
- Fix and extend README.md documentation links (#5526) Leo
- Combined selection format to ignore empty text nodes (#5521) Gerard Rovira
- Clean up the never implemented Table menu in Toolbar (#5523) Ivaylo Pavlov
- Fixed the toolbar style activation state is incorrect in certain cases (#5126) Warren19
- Fix inserting redundant paragraph on enter in MarkNode (#5418) Drago Strinu
- Bump Node in tests to 18.18.0 (#5513) Ivaylo Pavlov
- Fix AutoLinkPlugin triggers endless transforms (#5404) wnhlee
- Allow setting className for checklist in theme (#5445) Aman Harwara
- fix set button typebutton in TableActionMenuPlugin (#5510) Anthony Bouch
- PR-5 Remove references of PointSelection (#5334) Illia Olenchenko
- Fix CI (#5511) Gerard Rovira
- Fix inserting link open editor in edit mode (#5458) wnhlee
- docs(serialization) add node helpers to ExtendedTextNode example (#5442) Can Rau
- Fix exportTextFormat to keep dollar sign (#5379) wnhlee
- Use correct prop type for children in LexicalComposer (#5503) Paul
- Fix DecoratorNodes being treated as block elements (#5371) Steve Larson
- Replace font size dropdown with font size entry component (#5451) Shubhanker Srivastava
- Adding ability to mount LexicalMenus to arbitrary divs (#5481) Ebad
- Fix escape down for collapsible section when collapsed (#5485) Ivaylo Pavlov
- Fix columns layout update command (#5484) Ivaylo Pavlov
- Fix small issue with DecoratorNode type guards (#5478) John Flockton
- Fix multiline conversion to codeblock (#5472) Shubhanker Srivastava
- Remove depecated usage of checks from Flow types (#5477) John Flockton
- Update Flow version (#5471) John Flockton
- Minor refactoring in LexicalLineBreakNode (#5455) Georgii Dolzhykov
- Minor fix for release script (#5464) Acy Watson
- v0.12.6 (#5463) Acy Watson
- v0.12.6 Lexical GitHub Actions Bot

## v0.12.6 (2024-01-08)

- Fix floating link editor on inline image caption (#5460) wnhlee
- Revert Inserting hyperlink through toolbar doesnt open floating editor in edit mode (#5456) Acy Watson
- Fix TextNode#createDOM types allow editor parameter in subclasses (#5425) Georgii Dolzhykov
- docs fix outdated importDOM types in docs (#5431) Georgii Dolzhykov
- Bug Editing a link and changing selection shows wrong link value (#5352) Syed Umar Anis
- fix Reset compositionKey when backspacing a selection on Android where anchor and focus keys are different (#5389) Aman Harwara
- Bug Fix added a fix for discarding multiple color picker entries on drag (#5335) Bhavya Karia
- Remove duplicated test codes (#5429) wnhlee
- Inserting hyperlink through toolbar doesnt open floating editor in edit mode (#5372) Syed Umar Anis
- fix adding missing argument for sliceSelectedTextContent (#5380) Nadine Nguyen
- Fixed a small typo (#5427) frankdiw
- Fix insertNodes when inserting into inline elements (#5394) Brian Birtles
- Add link to state update blog (#5423) Acy Watson
- canInsertTextAfter exception for composition (#5378) Gerard Rovira
- Fix insert image to new inserted table row in playground report error (#5417) frankdiw
-  Refactored findNearestListItemNode using findMatchingParent (#5419) Ajay Prakash PP
- docs correct custom node examples (#5407) Naseem Ali
- Fixed the error when CollapsibleTitleNode type enter key (#5416) frankdiw
- dropdown text visibility problem fixed for medium and smaller screens (#5382) Recep ifti
- Fix convertFromMarkdownString breakdown due to no parent (#5393) wnhlee
- Fix bug on window.event conflict (#5391) Henry Boisgibault
- Fix typo on test title (#5399) wnhlee
- fix typo Contaner - Container (#5410) Philippe de Reynal
- fix logical error in description of insertBefore parameter (#5400) spirobel
- Featureexcalidraw resize (#5383) Recep ifti
- Flow fix RangeSelection extends (#5377) Gerard Rovira
- Fixed for #5162, The beginning of a TextNode with canInsertTextBefore false in  (#5363) matsuyama-k1
- PR 4 remove GridSelection from lexical core (#5293) Illia Olenchenko
- PR 3 Removed edge-cases of GridSelection (#5291) Illia Olenchenko
- Clear link using key shortcut bug (#5354) Syed Umar Anis
- refactor(playground) kill ts-ignore (#5342) Aron Griffis
- Automatic release on merge (#5347) Acy Watson
- Improve TypeScript types by removing k string any from LexicalNode (#5223) Bob Ippolito
- Support other formats in Collapsible Title (#5328) Ivaylo Pavlov
- docs added exportJSON function to the ExtendedTextNode plugin code (#5338) 
- v0.12.5 (#5343) Acy Watson
- Fix path alias typo (#5340) wnhlee
- v0.12.5 Lexical GitHub Actions Bot

## v0.12.5 (2023-12-06)

- Make subscript and superscript text formats mutually exclusive (#5317) Gry Ogam
- PR 2 5276 PointSelection instead of GridRangeSelections (#5281) Illia Olenchenko
- keep selection style when clicking empty editor (#5292) kyoyoung keum
- Fix insertNodes bugs (#5325) GermanJablo
- PR 1 Swap instance selection for BaseSelection in most cases (#5280) Illia Olenchenko
- selectEndstart as a method of LexicalNode instead of ElementNode (#5205) GermanJablo
- Make insertRangeAfter private (#5323) Gerard Rovira
- Improvements in insertNodes (#5201) GermanJablo
- Export CommandListener Flow (#5315) Gerard Rovira
- Add 2 missing flow exports (#5314) Gerard Rovira
- URL sanitization ClickableLinkPlugin (#5302) Yeison Daza
- fix backspace in Android not deleting first character (#5282) Kiran Dash
- docs improve DecoratorNode docs (#5284) Miroslav Petrov
- Fixing nested collapsible section chevron (#5300) Ebad
- Support HTML export overrides from config for nested editors. (#5267) Acy Watson
- Revert Fix Autolink plugin URL recognition failures (#5275) (#5295) Acy Watson
- Fix Autolink plugin URL recognition failures (#5275) Chinmay Disale
- Move to new Excalidraw APIs for 0.17 update (#5277) Ivaylo Pavlov
- Fix Resolve Cannot read properties of undefined (reading trim) issue in getSelectionStyleValueForProperty (#5271) Yeison Daza
- Fix The number in a numbered list gets duplicated (#5253) trinhvinhtruong96
- Fix Apply background color to multiple selected cells (#5258) Joo Hee Paige Kim
- packagelock (#5247) Gerard Rovira
- v0.12.4 (#5246) Gerard Rovira
- v0.12.4 Lexical GitHub Actions Bot

## v0.12.4 (2023-11-17)

- Fix @lexical/utils import (#5245) Gerard Rovira
- v0.12.3 (#5244) Acy Watson

## v0.12.3 (2023-11-17)

- Its a journey (#5242) Acy Watson
- Fixed column header on merged cells (#5230) Illia Olenchenko
- Remove codeowners to prevent unnecessary pings (#5236) John Flockton
- Fixed delete removing link node text when on linebreak (#5146) Steve Larson
- Fix row deletion if previous row is empty (#5231) Illia Olenchenko
- Remove unnecessary link from README.md (#5232) John Flockton
- chore(deps-dev) bump tough-cookie from 4.1.2 to 4.1.3 (#5134) dependabotbot
- chore(deps) bump sidewayformula from 3.0.0 to 3.0.1 (#5132) dependabotbot
- chore(deps-dev) bump semver from 5.7.1 to 5.7.2 (#5131) dependabotbot
- chore(deps) bump postcss from 8.4.27 to 8.4.31 (#5130) dependabotbot
- chore(deps) bump http-cache-semantics from 4.1.0 to 4.1.1 (#5129) dependabotbot
- chore(deps-dev) bump vite from 2.9.13 to 2.9.16 (#5133) dependabotbot
- Fixes grid selection to be aware of nested tables (#5166) Illia Olenchenko
- Bug Align list item do not change the export DOM (#5160) trinhvinhtruong96
- Fix iconRTL for center alignment (#5227) Ivaylo Pavlov
- refactor(playground) clean up settings (#5225) Aron Griffis
- fix Make autolinks working for formatted text (#5214) Konstantin Kovalev
- Fix touple typo to make it correctly tuple (#5229) Julian French
- Fix lexical-link typo srelrel (#5221) Bob Ippolito
- Fix alignment for links in Toolbar (#5209) Tahir Shakir
- Update Modal.tsx (#5203) Bradley Dirheimer
- fix Heading.insertNewAfter (#5198) GermanJablo
- Link title is correctly applied through the command (#5191) Petyo Ivanov
- Improved LexicalMenu positioning relative to text (#5187) Steve Larson
- fixed issue 5181 where link address is not shown if comment is set in (#5188) Tong Xi
- Fix at() transpilation (#5180) Gerard Rovira
- Fix insertNodes when anchor point is blank TextNode (#5179) Gerard Rovira
- Add playwright-report to gitignore (#5173) GermanJablo
- Fix insertNodes after selection swap (#5175) Gerard Rovira
- Range utils (#5153) Gerard Rovira
- Fix insertNodes and insertParagraph (#5002) GermanJablo
- Add Optional Chaining to isNodePre Method (#5157) Nick J Moss
- Table resize handle getting stuck fix (#5169) Alex Reznik
- Updated package-lock.json versions with npm audit fix. (#5125) Matthew Hutter
- Fix formatting selected table cells (#5168) Tahir Shakir
- Update index.tsx (#5165) Bradley Dirheimer
- Add commandPriority option to LexicalMenu and dependent components (#5123) huw
- chore(deps) bump babeltraverse from 7.18.6 to 7.23.2 (#5155) dependabotbot
- Updated insertTableColumn with batching (#5145) Illia Olenchenko
- Add Columns Layout to Typeahead menu (#5136) Ivaylo Pavlov
- TableResizer cell calculation based on cellspans (#5141) Illia Olenchenko
- Update anchor selection if split by patching style (#5087) Ruslan Piliuta
- chore(deps) bump excalidrawexcalidraw from 0.14.2 to 0.15.3 (#5135) dependabotbot
- Consolidate docs across the repo (#5121) Ivaylo Pavlov
- Fix right click select images (#5056) Ben Carleton
- fix fix android backspace bug (#5077) Cristopher Solis
- fix(lexical-rich-text) correct comment typo (#5116) Xuan
- docs fix typo in decorators.md (#5113) Can Rau
- Fix insertNodes insert position at start of inline ElementNode (#5110) Gerard Rovira
- Revert Fix transferStartingElementPointToTextPoint() #4756  (#5094) John Flockton
- chore add typedefs for collab nodes and remove unused members (#5071) VelociRaptor
- Fix tab replacement composition crash (#5066) Gerard Rovira
- Fix getting style via getSelectionStyleValueForProperty when selection is collapsed (#5082) Ruslan Piliuta
- Set up GA4 for website (#5078) Paul OShannessy
- chore fix typo (#5074) Alessio Gravili
- Fix integrity (#5068) Gerard Rovira
- fix(playground-text-format-toolbar) dont hide toolbar if current node is a paragraph (#4850) Mathieu Mtral
- Fix ToolbarPlugin paste error with start, end format (#5019) Hansu Kim
- Fixfloating formatter #5021 (#5041) Shubham Jadhav
- fix  Add column shortcut gets hidden when mouse leave the table #4857 (#5058) Sathish
- Allow LexicalTypeaheadMenuPlugin to work when inside an iframe (#5044) Lester Tay
- MaxLength handle empty ElementNode (#5029) Gerard Rovira
- Playground embed twitter support x.com (#5060) su
- Port List e2e test to unit tests (#5030) Acy Watson
- Playground refactor component picker plugin (#4836) Georgii Dolzhykov
- Transpile optional catch binding (#5048) Gerard Rovira
- Nit Floating toolbar (#5038) Gerard Rovira
- feat LexicalClickableLinkPlugin should support ctrl click mode #4565 (#4839) Sathish
- fix(Playground) CMD K improvements (#5013) Rajat
- chore fix typo in lexical-utils docs (#5022) Bruno Bonamin
- Update setFloatingElemPositionForLinkEditor.ts (#5028) Bradley Dirheimer
- Update setFloatingElemPosition.ts (#5027) Bradley Dirheimer
- Fix pasting text that ends with an empty paragraph is ignored when the MaxLengthPlugin is enabled (#5020) Hansu Kim
- Fix event handler removal in useDynamicPositioning, remove dupe code (#5024) Georgii Dolzhykov
- fix LinkNode.importDOM should support all node content (#5010) Rajat
- Allow overriding HTML serialization behavior from the editor config. (#4254) Acy Watson
- Fix TextNode override in Serialization  Deserialization doc (#5006) Giacomo Randazzo
- Fix getTableSelectionFromTableElement flow (#5005) Gerard Rovira
- Add highlight to format types (#5001) Gerard Rovira
- Add nodes replacement support for nested composer (#4992) Maksim Horbachevsky
- Remove capital letter mentions (#4991) Acy Watson
- Fix comment plugin selection rect top position (#4988) vonsa
- fix(lexicalhtml) missing lexicalutils dependency (#4984) liuwei

## v0.12.2 (2023-09-08)

- Move isHTMLElement into core (#4977) Gerard Rovira
- 0.12.1 (#4978) Acy Watson

## v0.12.1 (2023-09-07)

- Fix: font colors do not apply to text within table cells (#4934) Tahir Shakir
- fix #4526 (#4910) xyyjk
- fix: dispatching undo & redo states for collaboration; fixing up Point.getNode not a function (#4956) Nadine Nguyen
- Retain TextNode whitespace on export (#4969) Gerard Rovira
- Revert "Fix: fixes regex in YouTube AutoEmbedPlugin (#4916)" (#4966) Ivaylo Pavlov
- Fix: fixes regex in YouTube AutoEmbedPlugin (#4916) Rajat
- refactor: moved functions to `@lexical/utils` (#4923) Rajat
- refactor: remove redundant styles from floating text format plugin (#4938) VelociRaptor
- :bug: Fixed range selection splicing text (#4659) Steve Larson
- Added extra Yjs information to collaboration docs (#4951) Steven Fabre
- fix: disable spellcheck for code format (#4927) VelociRaptor
- Add column layout plugin example (#4937) Maksim Horbachevsky
- docs: fix example in getting-started/react (#4935) Mike
- Fix: MaxLengthPlugin crashes when the limit is reached and enter is pressed (#4871) Hansu Kim
- chore: prefer viewBox to width/height on SVG images (#4921) VelociRaptor
- Adds ElementFormatDropdown to the Toolbar plugin (#4904) itaquito
- Add iOS information to the website (#4899) amyworrall
- fix: Only append fragment when element is HTMLElement (#4490) lsbyerley
- Table unmerge (#4877) Peter Cook Bulukin
- Revert "Updated link markdown regex (#4461)" (#4896) Gerard Rovira
- Add missing flow def (#4889) Maksim Horbachevsky
- Handle undefined rows and columns in table utils after cell merge (#4874) Peter Cook Bulukin
- Updated link markdown regex (#4461) Ronald Langeveld
- Fix: Pressing enter now doesnot delete ImageNode from the ListItemNode (#4866) Takumi Uchida

## v0.12.0 (2023-08-09)

### Breaking Changes

#4818 moves "select all" behavior to the SELECT_ALL command, meaning anyone using setRootElement directly (i.e., not using PlainTextPlugin or RichTextPlugin or their underlying functions) would need to wire up command listeners for SELECT_ALL_COMMAND in order to preserve the default "select all" behavior after this version.

- Extract "select all" behavior to new `SELECT_ALL_COMMAND` (#4818) Chris Montrois
- Paste decorators before empty text nodes (#4672) Steve Larson
- Added "Page Break" to Lexical Playground (#4842) Dias Kappassov
- fix editor ref types and use EditorRefPlugin in the playground (#4852) Anton Kostiuchkov
- Expand react docs (#4845) Acy Watson
- Port lexical.dev to Tailwind (#4827) Awjin
- Stop collapsing non-collapsible whitespace on paste (#4770) Brian Birtles
- feat(playground): add support for collapsed margins in draggable block (#4823) Mathieu Métral
- feat(playground): add support for drop block on empty area (#4811) Mathieu Métral
- docs: remove placeholder property from exampleTheme (#4802) Karam Qaoud%

## v0.11.3 (2023-07-18)

- RFC Add prev editor state for mutation listener (#4796) Maksim Horbachevsky
- Fix  Cant convert paragraph into a header if the first child of the paragraph is a LineBreakNode (#4776) Naveen
- Add setStyle to Flow types (#4780) Acy Watson
- Fix width reflow in columns when resizing tables (#4775) Karam Qaoud
- package.lock (#4769) Gerard Rovira
- Remove duplicate declaration (#4772) Roman Gafiatullin
- fix Return LexicalEditorRefPlugin as valid JSX (#4771) Thomas Sauques
- Update TS to 5.1.x (#4695) Georgii Dolzhykov

## v0.11.2 (2023-07-11)

- Update listeners.md (#4768) mohammadreza490
- Reset editor state when setting null root (#4762) Maksim Horbachevsky
- Flow key down command (#4766) Gerard Rovira
- Fixes broken trunk (#4763) Maksim Horbachevsky
- Fix $transferStartingElementPointToTextPoint() (#4756) amyworrall
- Add video links to Getting Started docs (#4752) Acy Watson
- Fix missing token type (#4751) Maksim Horbachevsky
- Add selection adjustments for node removal (#4745) Maksim Horbachevsky
- Allow preventing text drag (#4749) Maksim Horbachevsky
- Add EditorRef plugin (#4747) Acy Watson
- Fix flowtypes for cut/copy commands (#4746) Maksim Horbachevsky
- Add RangeSelection docs (#4742) Acy Watson
- Fix multi-line token parsing (#4741) Maksim Horbachevsky
- Fix code block export (#4702) Maksim Horbachevsky
- Remove instanceof checks in onPasteForPlainText (#4737) Acy Watson
- Context Menu Options Added (#4713) Shubhankerism
- Show excalidraw edit button (#4731) Ibrahim El-bastawisi
- Fixed drop down buttons to prevent sumbit (#4727) Ou7law007
- Improve md error message (#4710) Acy Watson
- Fix: Use $createListItemNode within importJSON to override on deserialization (#4717) Kazu
- Image resizer fix (#4722) Maksim Horbachevsky
- Keeping local comments and sharedCommentsArray orders in sync (#4721) Ebad
- Table selection keyboard controls (#4689) Maksim Horbachevsky
- correction : line 47 - create -> update (#4704) Abhishek Kumar
- Allow table selection when cells are already selected (#4699) Peter Cook Bulukin
- Swap noopener for noreferrer (#4690) Adam Conrad
- Additional fix for editor._window in lexical-clipboard (#4686) Xinzi Zhou
- Preserving language and indentation of code block when serialized/deserialized (#4682) Ebad
- Remove outdated examples (#4684) John Flockton
- Remove delay from flakey E2E test (#4676) John Flockton
- Fix dropdown menu position in playground when scroll (#4496) Xinyuan Wang
- feat: playground inline image plugin (#4423) Anthony Bouch
- Override selectall on RangeSelection (#4671) Gerard Rovira
- Normalize select all on NodeSelection (#4664) Gerard Rovira
- Add columns next to selection (#4663) Peter Cook Bulukin
- Fix clipboard if content editable is in an iframe. (#4649) Xinzi Zhou
- Fix reconciler recovery listeners (#4654) Maksim Horbachevsky
- Check for specific excluded props (#4655) Maksim Horbachevsky
- Fix ContentEditable Flow types (#4652) Gerard Rovira
- Import alignment for Heading and Blockquote (#4625) Ivaylo Pavlov
- Add missing ExportDOM to CodeNode (#4637) Ivaylo Pavlov
- Add error formating params (#4629) Maksim Horbachevsky
- Add clipboard documentation (#4631) Acy Watson
- Add error formating params (#4627) Maksim Horbachevsky
- Fix issue with syncing yjs changes to Lexical (#4621) Ebad
- fix issue with dead keys (i.e. backticks) when converting markdown (#4620) Michel Bongard
- Don't throw error on format element (#4611) John Flockton
- fix: freeze get style object in DEV env to avoid mutations (#4616) Jatin Ranka
- TextNode docs (#4606) Acy Watson
- Fix iOS newline insertion (#4603) Maksim Horbachevsky
- Add vercel analytics script (#4604) Acy Watson
- mouseenter event typo fix (#4588) raghvendra
- Update nodes.md (#4598) navanshu
- Fix MenuTypeahead position (#4597) Aleksandr Kiliushin
- Fix uuid bug in `AutocompleteNode.clone()` (#4592) Scott Driggers
- use selection from state in insertNodeToNearestRoot and insertNodes (#4570) Calvin Leung
- Allow native shift+arrow selection work over decorator nodes (#4584) John Flockton
- Fix a11y for ContentEditable (#4580) Max Shypko
- Another approach to fixing the className cache (#4582) Acy Watson
- Better Error Message for exportJSON type (#4556) Hao Luo

## 0.11.1 (2023-05-26)

- Fire selection change on decorator delete (#4555) Acy Watson
- Fix flow (#4549) Gerard Rovira
- Add key to portal to avoid decorator component remounting (#4554) Maksim Horbachevsky
- Mutations to respect canInsertBeforeAfter (#4553) Gerard Rovira
- Arrow up selection fix #4536 (#4544) Maksim Horbachevsky
- Max length recalculation. Fix #4542 (#4543) Maksim Horbachevsky
- Fix update-changelog not finishing (#4537) Gerard Rovira

## 0.11.0 (2023-05-23)

- Tame wild white spaces (#4467) Gerard Rovira
- Auto embed fix #4530 (#4535) Maksim Horbachevsky
- Basic Context Menu (behind Switch) (#4285) Tyler Bainbridge
- Allow importing width and height from table cell and DOM nodes (#4521) Kristian Ignatov
- Add HTML deserialization recipe to docs (#4432) Ivaylo Pavlov
- Fix clickable link plugin #4514 (#4519) Maksim Horbachevsky
- Allow arbitrary awareness fields in Collaboration plugin (#4507) Attila
- Make tabs flexible in code (#4520) Gerard Rovira
- Fix GC memory leak (2) (#4513) Gerard Rovira
- Adjust selection after triple click (#4512) Maksim Horbachevsky
- Fix GC memory leak (#4510) Gerard Rovira
- TypeAheadMenu and TableActionMenu rendered off screen fixed. (#4301) Shubhankerism
- Fix Flow types (#4485) Gerard Rovira
- Add texturi-list support in clipboard. (#4478) xinyuan0801
- Sanitize url (#4483) Acy Watson
- exportDOM methods for HeadingNode, QuoteNode (#4445) Ivaylo Pavlov
- Tests for inserting text either side of an inline element (#4346) Jamie Birch
- Improve rect deduplication (#4471) Acy Watson
- Sanitize floatingLinkEditor (#4462) Acy Watson
- Generalize Menu Logic (#4284) Tyler Bainbridge
- Event delegation for NoteEventPlugin (#4424) Maksim Horbachevsky
- Tab support (#4436) Gerard Rovira
- Handle empty element deletion (#4380) Maksim Horbachevsky
- Select all adjustments (#4425) Maksim Horbachevsky
- Add documentation for TabIndentationPlugin (#4453) Filip Palmqvist
- Disable flaky test (#4455) Gerard Rovira
- fix attach event listeners to initial nodes (#4454) Ante Sepic
- Revisit touch devices (#4441) Gerard Rovira
- Allow to pass all possible attributes to a content editable div (#4450) Leks Kazimirchuk
- Fix text click selection on touch devices #3098 (#4395) Ibrahim El-bastawisi
- Updated Toolbar Plugin to Add keyboard shortcut for adding hyperlinks (#4413) AnuragBalhra
- simplify logic for the fix Improve responsiveness of the floating text format toolbar buttons (#4431) Alessio Gravili
- Remove unused styles (#4426) Georgii Dolzhykov
- Fix HistoryPlugin selection out of sync (#4390) Gerard Rovira
- Split test files and skip flaky tests in linux  collab (#4394) Acy Watson
- Optional colrowSpan serialization (#4344) Gerard Rovira
- Fix list merging (#4386) Acy Watson
- Fix markdown list merging (#4387) Acy Watson
- Use provided selection when serializing to HTML (#4392) Acy Watson
- Flow table bg color types (#4400) Gerard Rovira
- Add docs for list package (#4393) Acy Watson
- Make DecoratorBlockNode.isInline return false (#4383) EgonBolton
- Setting initial state of isSmallWidthViewport (#4398) Ebad
- Improve responsiveness of the floating text format toolbar buttons (#4298) Brandon
- Collapsible enhancements (#4257) Maksim Horbachevsky
- Inherit format for text entity node (#4382) Maksim Horbachevsky
- Fall back to url if parser fails (#4364) Acy Watson
- Change MarkNodeclone node arg type to this (#4363) Giovanni Cappellotto
- 0.10.0 (#4349) Acy Watson

## 0.10.0 (2023-04-18)

### Breaking Changes

@lexical/link will now sanitize anchor tag hrefs before rendering them to the DOM. This provides a measure of protection against XSS attacks
that rely on inlining javascript in that attribute. However, it means that links using less common protocols will now be sanitized (converted to about:blank),
which will be a breaking change for any existing links.

Like most other node-based logic in Lexical, the sanitization logic can be overriden by overriding LinkNode using the Node Overrides API and replacing it with a node that implements the sanitizeUrl method differently.

**Fixes CVE-2023-30792**

- Table feature: background color (#4345) Gerard Rovira
- Add @react/LexicalClickableLinkPlugin (#4316) Gerard Rovira
- TablePlugin feature: cell merge (#4343) Gerard Rovira
- Ban javascript URLs in @lexical/link (#4342) Acy Watson
- Table Cell Background Color (#4306) Gerard Rovira
- ExportDOM in Debug Tree View (#4307) Ivaylo Pavlov

## 0.9.2 (2023-04-14)

- Update codes.json (#4320) Gerard Rovira
- Missing table types (#4302) Gerard Rovira
- Fix cursor changing to default when resizing image (#4317) (#4318) Mohit Singh Chauhan
- Persist files and scene state in Excalidraw plugin (#4299) Ivaylo Pavlov
- Fix crash on prettier formatting fail (#4310) Syed Umar Anis
- YouTube embed: use more privacy-friendly youtube-nocookie.com instead of youtube.com (#4282) Alessio Gravili
- Fix flowtypes for insertBefore/after (#4245) Maksim Horbachevsky
- Fix excluded property imports (#4287) Acy Watson
- Allow excluding specific properties from collab syncing via plugin (#4275) Acy Watson
- Update tables.md (#4278) Gerard Rovira
- Refactor Check for mention match function (#4277) Aleksandr Kiliushin
- Replace canExtractContents with ShadowRoot check (#4276) Gerard Rovira
- Ignore script nodes in HTML deserialization (#4249) Acy Watson
- Fix Clear Formatting (Fixes #4188) (#4204) Ivaylo Pavlov
- Add try catch around katex renderer (#4260) John Flockton
- last table row delete throwing error (#4270) Aman Bansal
- Upgrade Flow to 0.2 (#4264) Gerard Rovira
- Cell merge backwards compatiblity 2 (#4268) Gerard Rovira
- Cell merge backwards compatiblity (#4267) Gerard Rovira
- fix get text selectRect error (#4263) yjh
- Loosen node and version types (#4143) John Flockton
- Bugfix: Comment popup closes when cursor hovers over table (#4228) Ben Carleton
- isEditable is true on first render even if editor initiated with false (#4251) Aman Bansal
- Fix TableCellNode import/exportJSON (#4259) Gerard Rovira
- Flow: table missing methods (#4261) Gerard Rovira
- Fix insertTableColumn when rowSpan > 1 (#4258) Gerard Rovira
- Bugfix: Floating tool bar not responsive in tables (#4237) Ben Carleton
- pasting text on input was creating a new paragraph node instead of ad… (#4246) Aman Bansal
- Excalidraw Component fixes (#4252) Ivaylo Pavlov
- Preserve content with merging cells (#4242) Gerard Rovira
- Support select all for node selection (#4233) Maksim Horbachevsky
- Fix TypeaheadMenuPlugin scrollIntoView to not rely on external class (#4238) Dragoș Străinu
- Ignore __indent in list deserialization (#4241) Acy Watson
- Revise Excalidraw dependency (#4234) Gerard Rovira
- Table toolbar foundation (#4182) Gerard Rovira
- Restore MD selection (#4232) Gerard Rovira
- Fixed `aria-label` typo (#4229) Hao Luo
- Export $hasUpdateTag (#4216) Alma Madsen
- Fix incorrect placement of Auto Embed (#4192) wangqi
- Fix bad selection shift at boundary (#4219) Gerard Rovira
- Improve Documentation - multiple modules (#4166) Harry Sanders
- Unmerge cell (#4212) Gerard Rovira
- Only allow numbers in TablePlugin row / column number input (#4201) Alessio Gravili
- Create fragment attached to the doc (#4186) Maksim Horbachevsky
- Add a title to the link node to support titles in markdown (#4161) themagickoala
- Fix table insertion (#4180) Gerard Rovira
- added trash button to floatingLinkEditor plugin to toggle the link to… (#4209) Aman Bansal
- Delete unused LinkPreview.css (#4200) Alessio Gravili
- Use 'padding' shorthand CSS rule (#4198) Alessio Gravili
- Add missing flow file (#4193) Maksim Horbachevsky

## v0.9.1 (2023-03-24)

- Explicit E2E_BROWSER on E2E runs (#4179) Gerard Rovira
- Fix tables Webkit e2e (#4175) Gerard Rovira
- Remove unused convertToMarkdown file (#4169) themagickoala
- Improve markdown transformers (#3886) Godefroy
- Iterate through the live NodeList instead of copying to an array in $generateNodesFromDOM (#4164) Acy Watson
- Bump Excalidraw to v0.14.2 (#4153) Ivaylo Pavlov
- Fix table stealing selectionchange (#4162) Gerard Rovira
- Improve Documentation #2845 - lexical/selection (#4140) Harry Sanders
- UX: Floating link editor: better positioning (#4158) Alessio Gravili
- DecoratorNode not disabling placeholder at root (#4147) Harry Sanders
- Color picker - fixes #4127 (#4146) Harry Sanders
- Validate against infinite loop in ListItemNode.setIndent (#4120) Acy Watson
- Paste merged celled table (#4116) Gerard Rovira
- Add md import/export tests, fix numbered lists pasting (#4123) Maksim Horbachevsky
- Bump webpack from 5.75.0 to 5.76.0 (#4128) dependabot[bot]
- fix: drag-over event on windows (#4125) 子瞻 Luci
- Remove link preview (#4122) John Flockton
- Add a function to create a LinkMatcher based on a RegExp (#3972) Karibash
- Revise padding for smaller res (#4112) Gerard Rovira
- Catch failures in parseEditorState (#4109) Acy Watson
- Improve Documentation #2845 - lexical/list (#4107) Harry Sanders
- Fix tables Collab E2E (#4117) Gerard Rovira
- Fix ShadowRoot + X insertNode (#4115) Gerard Rovira
- Overflow of logos of action items in Lexical Playground (#4096) 7gaurab_khanal
- Remove columns w/ span support (#4093) Gerard Rovira
- Remove rows w/ span support (#4078) Gerard Rovira
- Table insert column w/ span support (#4074) Gerard Rovira
- Table insert row w/ span support (#4063) Gerard Rovira
- Use broader return types in `HorizontalRuleNode` (#4097) Chris Montrois
- Add focus tag to editor.focus (#4092) Dragoș Străinu
- Improve Documentation #2845 - lexical/utils (#4047) Harry Sanders
- Fix toolbars that shouldn't appear in certain cases (#4077) Warren19
- Fixed reference to old `addUpdateListener` method in transforms doc (#4094) Kevin Ansfield
- Pass tags to onChange for LexicalOnChangePlugin (#4091) Dragoș Străinu
- Fix tables E2E (#4090) John Flockton
- Change default indent to 40px (#4025) EgonBolton
- Update CODEOWNERS (#4089) John Flockton
- Updated InsertTableDialog UX (#4082) Brandon
- Export getNearestEditorFromDOMNode (#4079) Gerard Rovira
- Fix unresponsive resize handle in Safari (#4081) Brandon
- Sticky toolbar to assist in editing large content (#4076) Brandon
- Fix table RangeSelection test (#4061) Gerard Rovira
- Trim table e2e assert (#4060) Gerard Rovira

## v0.9.0 (2023-03-08)

- deprecate $wrapNodes (#4059) Acy Watson
- [0.9] Remove experimental flag for setBlockTypes (#4045) John Flockton
- [0.9] Remove experimental flag from content plugins (#4036) John Flockton
- Table - cell merging (#4046) Gerard Rovira
- After removing a ListItemNode, merge its siblings. (#4035) Awjin
- [0.9] Remove experimental flag for copyToClipboard (#4037) John Flockton
- Fix inf loop block cursor (#4049) Gerard Rovira
- Fix type import syntax for CodeHighlightNode (#4053) John Flockton
- Fix list deserialization (#4030) Acy Watson
- Fix EquationNode issues on Android  (#4040) John Flockton
- Styling tweaks to better accommodate long urls (#4041) Brandon
- Add docs for LexicalEditor (#4034) Acy Watson
- Add docs for LexicalNode APIs (#4033) Acy Watson
- Remove remaining deprecated hooks (#3782) John Flockton
- Improved link editor UX (#4026) Brandon
- Add command logging into tree view (#4022) John Flockton
- Deprecate experimental DevTools browser extension (#4023) John Flockton
- Fix Chrome beforeinput race condition on large docs (#4016) Gerard Rovira
- Fix insertNode insertion for inline Elements inside empty Elements (#4018) Gerard Rovira
- fix(lexical-playground): link editor flashs (#4013) 子瞻 Luci
- Reposition Node Menu when Node Changes (#4010) Tyler Bainbridge
- Fix small lint error (#4014) John Flockton
- Check if parent node is root in order to remove it in trimTextContentFromAnchor (#3952) Theodore Nastos
- Fix PollNode copy and paste missing options (#4002) John Flockton
- Fix converting nodes with nested lists (#3821) EgonBolton
- Fix selection on color change (#4004) Konrad Ryczko
- Cleanup excessive use of WebsocketProvider for types (#3979) Maksim Horbachevsky
- Nested composers should initialize with parent editor editable state (#4001) John Flockton
- Adjust playground CSS to fix vertical resize being disabled in select scenarios (#3997) Brandon
- Improve serialization types for element node children (#3990) John Flockton
- Listen to Collapsible Section toggle event (#3983) Ivaylo Pavlov
- Doc: initial execution of listener function (#3991) Gerard Delmàs
- Fix getNodes of RangeSelection (#3966) kosei28
- Account for children text content size in 's  (#3930) Giacomo Randazzo
- Update badge URL in README (#3987) Andrew Doan
- Fix: Floating toolbar flashes on hover over empty lines when the selection is backwards. (#3959) Alessio Gravili
- Bump jest and node versions to accommodate structuredClone (#3969) Acy Watson
- Make one previous node be selected when deleting a block (#3970) Karibash
- Beforeinput prevent default on mismatching targetRanges (#3954) Gerard Rovira
- Trigger  as false when  goes down to 0 (#3943) Diego Esclapez

## v0.8.1 (2023-02-22)

- Clone objects from the CSS cache before mutating them (#3945) Brian Birtles
- added docsfeature-button in lexical playground issue#3918 (#3935) Mohan Sai Potla
- fix: change from  to  (#3942) Asim Kattum Thazha
- Added Chinese character support for native webkit (#3846) Annabelle Almås
- Fix autocapitalization (#3881) Gerard Rovira
- Expand the actionable empty playground editor text area via flex (#3883) Brandon
- Fix toggling styles on collapsed selections with  (#3922) Brian Birtles
- Remove condition for history merge on null prev selection (#3914) Acy Watson
- fix: change tablecell return type for TableCellNode (#3925) Sebastien Ahkrin
- Align types for createEditor APIs (#3928) Acy Watson
- Remove instanceof type checks against HTMLElement and subtypes (#3913) Acy Watson
- Fix small lint error breaking main (#3924) John Flockton
- Update plugins.md (#3926) dimitarbikov
- Added support for Java & C++ (#3884) Vignesh gupta
- Add fixme annotation to flaky collab tests (#3916) Acy Watson
- Playground: fix issue with floating link editor plugin not closing (#3904) Rich
- Further tweaks to format/style selection (#3895) Dominic Gannaway
- Add KEY_DOWN_COMMAND (#3878) Dominic Gannaway
- Remove draggable block plugin on mobile devices (#3875) John Flockton
- Close color pickers on select (#3874) John Flockton
- Fix ContentEditable types for internal use (#3868) John Flockton
- Fix v0.8.9 typo in changelog, should be v0.8.0 (#3869) Joel Besada

## v0.8.0 (2023-02-09)

This release includes some breaking changes, including:
    - Remove of `indentList` and `outdentList` from `@lexical/list`.
    - Refactor of the `LexicalContentEditable` types from `@lexical/react` to make them more accurate with `HTMLDivElement` attributes.

This release adds functionality to apply node transforms to node replacements, it allows users to specify tab indentation sizes, and improved support for tracking the origin of YJS updates for collaborative editing.

- Ensure deletions capture existing formatting (#3867) Dominic Gannaway
- Add style properties to RangeSelection (#3863) Dominic Gannaway
- List indentation simplified (#3809) EgonBolton
- Update ContentEditable types (#3580) John Flockton
- Allow the format property to be omitted (#3812) Karibash
- Allow users to customise the indentation of tabs (#3802) John Flockton
- Apply node transform not only to the original node but also to the overriding node (#3639) mizuno
- feat: set the update tag from yjs based on the origin (#3608) El-Hussein Abdelraouf

## v0.7.9 (2023-02-09)

- Fix bad import into core (#3861) Dominic Gannaway
- Add import/export DOM methods to YouTubeNode and improve EquationNode (#3835) Pervez Ali
- Fix backspace regression (#3862) Dominic Gannaway
- Fix restoreEditorState (#3856) Dominic Gannaway
- Add more configuration for heading in INSERT_TABLE_COMMAND (#3843) Sebastien Ahkrin
- perf(playground): load prettier and its parsers on demand in code block (#3637) Shanmughapriyan

## v0.7.8 (2023-02-08)

- Update transforms.md (#3845) Ben
- Fix over selection (#3838) Dominic Gannaway
- Fix $restoreEditorState (#3842) Dominic Gannaway
- Fix select all + delete behaviour (#3840) Dominic Gannaway
- Fix(#3716,#3815): Prevent layout shift while using typeahead menu (#3826) rettoSea
- Add anchor dirty node check for text length less than 2 chars (#3832) John Flockton
- Fix reconciler bug with handling of text content (#3837) Dominic Gannaway
- Add exportDOM and importDOM for Collapsible Container Plugin (#3827) Ivaylo Pavlov
- Fix pasting top level nodes inline (#3238) Petar Smolic
- Add IS_HIGHLIGHT format to combined formats to properly calculate format (#3822) moy2010
- Add highlight markdown text format shortcut (#3823) moy2010
- Add highlight text node theme class (#3824) moy2010
- add importDom and exportDom method to EquationNode (#3813) Najmus Sakib
- fix: Typo (#3816) Cornelius

## v0.7.7 (2023-02-03)

- Add list-style-position:inside (#3814) John Flockton
- Fix is selected noop (#3805) James Abels
- Add `createParentElementNode` method on LexicalNode to fix copy/paste issues with clipboard (#3800) John Flockton
- Remove innerHTML injection from table selection (#3804) John Flockton
- Better tab handling (#3770) James Abels
- Fix line delete bug in history (#3769) James Abels
- List node export dom with css classes (#3801) Maksim Horbachevsky
- Add highlight TextFormatType (#3583) moy2010
- Add check that target is not the root node (#3797) John Flockton
- Fix $generateJSONFromSelectedNodes with a custom selection passed in (#3749) William Wang
- Improve selection docs (#3798) Dominic Gannaway
- Fix copy paste wrong order in TableOfContents (#3786) Daniel Voigt
- fix(lexical-playground): fix bugs related to ComponentPickerPlugin (#3787) Shota Shimizu
- fix: styling information of paragraph are missing while importing dom (#3771) Rajatava Mukherjee
- Stabilize WeakMap in NodeEventPlugin (#3780) James Abels
- Clean up wonky logic (#3768) Dominic Gannaway
- Remove deprecated modules from core code base (#3729) John Flockton
- Edit CSS to fix marker alignment issue in Safari (#3753) John Flockton
- Move horizontal rule plugin to lexical/react (#3751) John Flockton
- Fix equation transformer in Playground (#3758) Leonardo E. Dominguez
- Fix list normalization on HTML paste. (#3757) Acy Watson
- Remove preventDefault from $copyToClipboardEvent (#3742) John Flockton
- fix(lexical-playground): NewTablePlugin is not draggable (#3747) Shota Shimizu
- Attach checkbox click listeners to editor root element instead of document (#3738) John Flockton
- Update listener in toc (#3726) Stepan Bolotnikov
- Close Excalidraw only on Escape key down (#3737) John Flockton
- fix: type-ahead menu scroll problem (#3672) huang yao
- Tweak CodeNode to allow for overrides (#3731) James Abels
- Discard empty TextNode that can creep into appendJSON (#3695) James Abels
- Add config to updateDOM in ParagraphNode  (#3693) James Abels

## v0.7.6 (2023-01-10)

- Fix typo in LexicalAutoLinkPlugin code example (#3685) Lorenzo
- updated typo (#3697) Christopher Tran
- Add width and height to serialized image nodes (#3684) Ebad
- fix: force to set TextNode's content when compositionKey is invalid (#3679) Conatus
- Fix: convert html 's' tag to node for strickethrough format is missing (#3673) hun
- Fix bug with ArrowDown/ArrowUp in RichTextPlugin (#3676) Dominic Gannaway
- Remove ts-ignore for createContext (#3671) yf-yang
- Fix bug in reconciler sub-tree text content cache (#3669) Dominic Gannaway
- Hide commenting controls on mobile screen sizes (#3667) Dominic Gannaway
- Fix theming docs (#3668) Dominic Gannaway
- update: change character_limit to be passed as a props( maxlength) (#3649) 0x harry
- Add TabIndentationPlugin to playground. (#3632) Acy Watson

## v0.7.5 (2022-12-23)

- selectionChange fix (#3623) Dominic Gannaway
- Add docs for root listener (#3625) Acy Watson
- Add docs re: working with DOM Events (#3624) Acy Watson
- background-repeat: no-repeat; (#3621) Aloento
- Add logic in isSelectionCapturedInDecoratorInput for contentEditables (#3622) Dominic Gannaway
- Fix bug in convertTextFormatElement (#3618) Dominic Gannaway
- Add size limit report (#3600) Maksim Horbachevsky
- Allow focus/blur propagation in useYjsFocusTracking (#3617) Dominic Gannaway
- Add missing changelog for 0.7.4 (#3598) John Flockton
- Fix getSelectedNode logic for forward selection (#3609) moy2010
- Fix typo in documentation (#3614) Jeremy Bernier
- Fix bad rebase (#3607) Dominic Gannaway
- Escape plus signs of the tag in MarkdownImport, fixes #3596 (#3599) Teemu Pöntelin
- Add HTML paste support for checklists (#3579) Acy Watson
- Preserve empty parent during replacement (#3595) Maksim Horbachevsky

## v0.7.4 (2022-12-20)

- Add missing usages of `$applyNodeReplacement` (#3592) John Flockton
- Fix import issue with line break nodes (#3593) John Flockton
- Allow LinkNode to be replaced by custom node, fix bug in #3367 (#3588) Nhan Ho

## v0.7.3 (2022-12-18)

- Fix bold italic exportDOM (#3584) Dominic Gannaway
- Fix copy/paste issue with line breaks within paragraphs  (#3581) John Flockton
- Fix various collaboration cursor bugs (#3582) Dominic Gannaway
- Update PlaygroundEditorTheme.css (#3553) pavan-reddy-28
- More extensive fixes for Lexical in iframes (#3578) Dominic Gannaway

## v0.7.2 (2022-12-17)

- Use the actual node count rather than the dirty node count (#3569) Dominic Gannaway
- Utilize getParentElement internally when traversing up the DOM tree (#3576) Dominic Gannaway
- check read only flag during $setSelection (#3572) yf-yang
- Fix iframe selection issues (#3573) Dominic Gannaway
- Fix left arrow selection on list nodes (#3575) Dominic Gannaway
- fix: deleting forward on the last decorate node (#3568) Oleksii Piatetskyi
- Image gets stuck in resizing state fix (#3562) (#3565) Sharat Chandar M
- Fix flow again (#3566) Acy Watson
- Fix placeholder text for custom Paragraph Nodes (#3557) moy2010
- Disable lint rule in composition test (#3552) Acy Watson
- Add $wrapNodes back to flow (#3551) Acy Watson
- [Playground] Support clicking on links with middle mouse button (#3547) zeitstein
- Fix bug 3535 (#3537) lizhu68
- docs: typo fix (#3544) Bryan Ricker
- Don't throw if getPreviousSiblings can't find a parent (#3543) Acy Watson
- Change mousedown event type to fix selection Chromium bug on Android (#3541) John Flockton
- Various fixes in $wrapNodes (#3234) EgonBolton
- Add missing changelog entry to 0.7 (#3533) Dominic Gannaway
- Remove VERSION (#3531) John Flockton

## v0.7.1 (2022-12-11)

Contains several small bug fixes from the Lexical 0.7.0 release.
- Fix paste for LexicalLinkPlugin (#3528) Dominic Gannaway
- RTL fix for checkbox (#3529) shiva-Aluri
- Add demos section to the navbar (#3507) akmarzhan1
- Fix lexical-offset (#3526) Dominic Gannaway
- Add missing Flow type for indentation plugin (#3527) John Flockton
- Docs: fix "node" type in "Node Overrides" example code (#3525) Chris Montrois
- Fix small Flow error (#3523) John Flockton

## v0.7.0 (2022-12-09)

Lexical 0.7 includes some breaking changes, including:
- Removal of `$cloneContents` from `@lexical/selection`
- Changes to `PlainTextPlugin` and `RichTextPlugin` with regards to how placeholders are handled
- Pressing tab with the `RichTextPlugin` no longer indents by default, use the `LexicalTabIndentationPlugin` for this behavior.
- The unstable helper function `unstable_convertLegacyJSONEditorState` has been removed. This was always meant to be a temporary work-around to allow developers to convert their formats to the new JSON format rather than using the actual editor state internals directly.

Lexical 0.7 includes performance and usability improvements. Notably, Lexical has a new internal architecture that allows for
much better performance with large documents of content. Lexical also now provides a way to handle selection between blocks
of content by providing an emulated cursor (make sure you add a `blockCursor` theme to your editor config to use it).

- Revert "Fix exportJSON return types for ParagraphNode and LineBreakNode" (#3521) John Flockton
- Move default language setting to Tokenizer (#3368) mizuno
- Improve LexicalTreeView around large EditorStates (#3515) Dominic Gannaway
- Improve insertBefore, insertAfter, replace selection restoration logic (#3516) Dominic Gannaway
- ⏸ [0.7] Switch the internal architecture to utilize doubly linked lists (#3480) Dominic Gannaway
- Add missing annotation to internal field of Textnode (#3514) John Flockton
- ⏸ [0.7] Remove indentation keyboard shortcuts in RTE set up (#2855) John Flockton
- Fix dom-less reconciliation (#3506) Maksim Horbachevsky
- ⏸ [0.7] Add block emulated cursors (#3434) Dominic Gannaway
- ⏸ [0.7] Customize Placeholder visibility (#3379) Gerard Rovira
- ⏸ [0.7] Remove IntentionallyMarkedAsDirtyElement from public API (#3422) John Flockton
- ⏸ [0.7] Remove $cloneContents (#3483) Dominic Gannaway
- Update Playwright (#3511) Dominic Gannaway
- Improve Auto Embed (#3505) Tyler Bainbridge
- Skip tab e2e test in webkit (#3512) Dominic Gannaway
- Add poll and speech-to-text plugin examples (#3484) akmarzhan1
- Fix typedef for wrapNodes (#3492) Maksim Horbachevsky

## v0.6.5 (2022-12-05)

- Fix mutation listener for when DOM moves occur (#3493) Dominic Gannaway
- Fix decorator input selection (#3491) Dominic Gannaway
- Inform users that they need to install headless (#3487) Phillip Burch
- Revert changes (#3481) Dominic Gannaway
- Improve selection performance on large updates (#3478) Dominic Gannaway
- Support TypeScript language in code nodes (#3469) Jonas Bengtsson
- Improve element splicing and node removal (#3454) Dominic Gannaway
- Add start and end as format types (#3472) John Flockton
- Fix test for collab (#3471) Dominic Gannaway
- Add e2e test for text replacement (#3470) Dominic Gannaway
- Markdown decorators export fallback to text content (#3464) Maksim Horbachevsky
- Update conditional statement in LexicalAutoFocusPlugin to the same logic as in LexicalSelection (#3466) John Flockton
- Add Node Replacement Docs (#3462) Acy Watson
- Inherit headless flag from parent editor (#3459) Maksim Horbachevsky
- Change heading to paragraph when heading is empty (#3455) John Flockton
- Show caret while drag&drop (#3300) Gerard Rovira
- Fix superscript & subscript not being converted from html string (#3453) Rajatava Mukherjee%

## v0.6.4 (2022-11-29)

- Fix issue with readonly image resizing (#3448) John Flockton
- check CAN_USE_DOM before accessing document (#3444) ProvidenceXz
- Add `type="button"` to <button /> components (#3447) Scott Agirs
- Add horizontal rule plugin (#3446) akmarzhan1
- Add isEditable listener to nested composer (#3445) John Flockton
- Exports serialized node types (#3436) tolkienfan2
- Fix bug in selectPointOnNode (#3443) Dominic Gannaway
- $splitNode & $insertNodeToNearestRoot for root selection (#3442) Maksim Horbachevsky
- Updated exportJSON types (#3231) Matt Reid
- Fix deleting empty paragraphs (#3261) Petar Smolic
- Change command priority in typeahead (#3441) John Flockton
- Fix grammary 2 (#3438) Dominic Gannaway
- Don't unnecessarily mark text nodes as dirty (#3437) John Flockton
- fix: playground bug(floating link editor not closing with 'Escape' key (#2941) Joseph Jang
- Fix a couple of bugs with Headings creation (#3425) John Flockton
- Fix text replacement via insertText (#3429) Dominic Gannaway
- Add link list properties to nodes (#3424) Dominic Gannaway
- Fix browser selection with horizontal rule (#3418) Dominic Gannaway
- add excalidraw plugin example (#3412) akmarzhan1
- Fix $splitNode Flow type (#3411) Gerard Rovira
- Fix insertNodes merging logic (#3413) Dominic Gannaway
- refactor: React composer initialConfig to exported type (#3396) Simon Proper

## v0.6.3 (2022-11-23)

- Apply event propagation between all event types (#3401) Dominic Gannaway
- Fix selection bug in code highlighting transform (#3405) Dominic Gannaway
- Exports SerializedNodes from @lexical/table (#3393) tolkienfan2
- Ensure we do not render br after non inline decorators (#3406) Dominic Gannaway
- Fix collapsible bugs (#3404) Maksim Horbachevsky
- Add more invariants around insertion of text nodes into root (#3399) Dominic Gannaway
- Fix bad selection on $wrapNodes (#3400) Dominic Gannaway
- Fix insertNodes bug around isolated decorators (#3403) Dominic Gannaway
- Fix element indent duplication (#3398) Dominic Gannaway
- Fix bug in scrollIntoViewIfNeeded (#3397) Dominic Gannaway
- Fix md links regexp (#3395) Maksim Horbachevsky
- Add LexicalNodeEventPlugin to @lexical/react (#3392) Dominic Gannaway
- Add rel noopener by default (#3386) Acy Watson
- Fix selection bugs with decorators (#3391) Dominic Gannaway
- Fix experimental tables (#3390) Dominic Gannaway

## v0.6.2 (2022-11-21)

- Validate dragon origin (#3385) Dominic Gannaway
- Remove AutoScrollPlugin and properly fix scrollIntoViewIfNeeded (#3378) Dominic Gannaway
- LinkPlugin to support link paste (#3371) Gerard Rovira
- Add node replacement system to core (#3367) Dominic Gannaway
- Fix prettier & lint (#3377) Gerard Rovira
- add collapsible container plugin example (#3369) akmarzhan1
- add embed plugins (#3363) akmarzhan1
- Add markdown plugin example (#3354) akmarzhan1
- add sticky notes plugin example (#3345) akmarzhan1
- Improve $insertNodeToNearestRoot (#3344) Maksim Horbachevsky
- Add $splitNode & $copyNode (#3342) Maksim Horbachevsky
- feat: make icons and popups dynamic & change file structure (#3336) Adithya Vardhan
- Add table plugin example (#3341) akmarzhan1
- Fix content loss when EditorState + update race condition (#3337) Gerard Rovira
- Filter out mixed files + content copy pasting (#3329) Maksim Horbachevsky
- Bump loader-utils from 2.0.2 to 2.0.3 (#3333) dependabot[bot]
- Bump loader-utils from 2.0.2 to 2.0.3 in /packages/lexical-website (#3334) dependabot[bot]
- Update YJS (#3313) Maksim Horbachevsky
- Update nodes.md (#3332) UncleKhab
- Add list plugin example (#3324) akmarzhan1
- Disable table addons on non-editable (#3317) Gerard Rovira
- Nit FlowFixMe hint (#3310) Gerard Rovira
- feat: Extend support for link target and rel to lexical-react’s AutoLinkPlugin (#3209) Andrew Patton
- docs: set ErrorBoundary props to PlainTextPlugin (#3326) unvalley
- Update collab cursor colors to pass a11y contrast ratio (#3315) Maksim Horbachevsky

## v0.6.0 (2022-10-31)

- [0.6] Make RichTextPlugin ErrorBoundary mandatory (#3295) Gerard Rovira
- Optional decorator nodes selection with keyboard navigation (#3292) Ruslan Piliuta
- Keep selection if state was not cloned (#3294) Maksim Horbachevsky
- Preserve selection for pending state (#3293) Maksim Horbachevsky
- Handle quotes in increment-version changelog (#3291) Gerard Rovira
- v0.5.1-next.2 (#3286) Acy Watson
- filter by branch (#3285) Acy Watson
- Release on matching tag push to main (#3284) Acy Watson
- Drag & drop & paste with precision (#3274) Gerard Rovira
- Fix initial content tables initialization (#3281) Maksim Horbachevsky
- selection.modify to respect ShadowRoot (#3279) Gerard Rovira
- Add root theme class (#3277) Maksim Horbachevsky
- Improve Collab cursor, add custom cursorColor (#3248) Dragoș Străinu
- fix nodesOfType return type (#3262) Acy Watson
- Copy styles to new object when patching (#3273) Acy Watson
- Revert "Select end if root has no children (#3254)" (#3276) Acy Watson
- Fix paste CodeNode leak  and and empty links (#3194) Gerard Rovira
- Use set (#3258) John Flockton
- Do not reconcile terminating linebreak for inline elements (#3268) Maksim Horbachevsky
- Revert "v0.5.1-next.2 (#3269)" (#3272) Acy Watson
- v0.5.1-next.2 (#3269) Acy Watson
- Add inline plugin example for images (#3216) akmarzhan1
- Select end if root has no children (#3254) John Flockton
- Remove isHighlighting flag (#3256) John Flockton
- Allow clearing styles with $patchStyleText (#3247) Brian Birtles
- Improve logistics around table/grid selection (#3251) Tyler Bainbridge
- Fix error boundary fallback (#3249) Maksim Horbachevsky
- Allow skipping auto-scroll action on selection change (#3220) Ruslan Piliuta
- pref(lexical-playground): reduce rendering consumption by creating compositing layers (#3069) 子瞻 Luci
- chore: add new `eslint-plugin` with rule `no-optional-chaining` locally (#3233) Shanmughapriyan S
- Handle left part of match (#3245) Clément Bacouelle
- Expose Tokenizer interface to accept custom tokenizer other than Prism at @lexical/code (#3243) mizuno
- fix list paste issue (#3239) Acy Watson
- Fix typos in Markdown documentation (#3236) Mikko Tirronen
- allow overriding mark node create fn (#3229) Acy Watson
- Add SerializedMarkNode flow type (#3228) Acy Watson
- Handle bad list item children gracefully (#3226) Gerard Rovira
- Memoize ErrorBoundary (#3225) Gerard Rovira
- Fix TableSelection Mouse Up Propagation Bug (#3223) Tyler Bainbridge
- Don't apply element based offsets to text nodes in $patchStyleText (#3126) Brian Birtles
- fix: fixed dual text appearance problem and removed outline scrollbar (#3207) Karam Qaoud
- Safely remove parent elements when deleting at anchor offset 0 (#3213) Tyler Bainbridge
- Allow Block change with GridSelection (#3212) Tyler Bainbridge
- v0.5.1-next.1 (#3205) Acy Watson
- Fix frozen selection (#3204) Acy Watson
- fix: draggable block icon is invisible in read-only mode (#3198) Karam Qaoud
- Fix sample code (lexical-react) (#3206) Yuki Shindo
- chore: optimize svg (#3199) Strek
- Fix $patchStyleText when the selection is anchored to the end of a text node (#3116) Brian Birtles
- releases (#3203) Acy Watson
- v0.5.1-next.0 (#3201) Acy Watson
- fix: play `time travel` after reaching maximum range (#3197) Shanmughapriyan S
- Add type to commands for logging  (#2942) John Flockton
- Built-in Error/SuspenseBoundaries for React DecoratorNodes (#3178) Gerard Rovira
- Add flushSync option to update() (#3119) Maksim Horbachevsky
- nightly and dev releases (#3192) Acy Watson
- Make the ComponentPicker independent of the Toolbar (#3142) EgonBolton
- docs: Fixed broken link (#3190) Simon Proper
- Fix insertNodes when replacing content adjacent to an inline element (#3137) Brian Birtles
- Fix nested editor cut (#3177) Maksim Horbachevsky
- Fix copy-paste CodeBlock with BR (#3174) Gerard Rovira
- TreeView editor basics (#3153) Gerard Rovira
- Remove development notice (#3171) Dominic Gannaway
- Fix flow types for root.select() (#3168) Maksim Horbachevsky
- Fix linting error (#3165) John Flockton
- Check if DOM is accessible when calling `getSelection` (#3162) Lee Sanghyeon
- ref(selection): separate @lexical/selection/index into multiple files (#3145) quochuy
- Ignore empty class names in addClassNamesToElement (#3159) Acy Watson
- remove repeated comments (#3154) Zuckjet
- FF Node/Grid copy-paste support (#3147) Gerard Rovira
- feat: add icons to extension and change build (#3140) Adithya Vardhan
- Add Emoji Picker to Playground (#3122) Tyler Bainbridge
- Ignore mutations which do not have target node (#3120) Ruslan Piliuta
- flow types (#3133) Acy Watson
- support multiple classes (#3134) Acy Watson
- Fix regex (#3132) Tyler Bainbridge
- Fix typeahead ref typedef (#3131) Maksim Horbachevsky
- Add className prop to typeahead plugin (#3124) Acy Watson
- Fix table paste (#3129) Gerard Rovira
- Fix GridSelection comparison (#3118) Gerard Rovira
- [0.6] More Typeahead Changes (#3112) Tyler Bainbridge
- Fix typeahead import (#3117) Maksim Horbachevsky
- Fix npm install on M1 macs (#3114) Nils Tijtgat
- Update createHeadlessEditor to match createEditor typedef (#3111) Maksim Horbachevsky
- fix(lexical-playground): draggable blockplugin uses unexposed apis (#3109) 子瞻 Luci
- Typeaheads: Remove hard-coded "bottom" alignment (Breaking change) (#3104) Tyler Bainbridge
- Typeaheads: Add scroll command and increase priority (#3106) Tyler Bainbridge
- Lower key navigation command priority for Tables (#3107) Tyler Bainbridge
- Fix DOM availability check (#3102) Maksim Horbachevsky
- copyToClipboard to return success (#3105) Gerard Rovira
- chore: add e2e test for draggable-block-plugin (#3090) 子瞻 Luci
- Fix flow for $insertGeneratedNodes (#3101) Gerard Rovira
- Make onClose optional on Flow Types. (#3091) Tyler Bainbridge
- Add collapsible container plugin (#3082) Maksim Horbachevsky
- Double-trigger hack for high-fidelity Node/Grid selection (#3080) Gerard Rovira
- Tweet fallback to text on copy (#3088) Gerard Rovira
- Add logic to catch separators (#3084) John Flockton
- Add open/close callbacks to menu plugins (#3087) Tyler Bainbridge
- Merge markdown E2E tests into one file (#3086) John Flockton
- Add some inline documentation (#3076) Acy Watson
- Removed extra 'is' in line 9 (#3083) Samuel Adeboye Folaranmi
- fix(lexical-playground): read-only mode (#3081) 子瞻 Luci
- Fix Resize and Scroll Issues (#3079) Tyler Bainbridge
- Fix oncall annotation issue missing from some files (#3075) John Flockton
- Add oncall annotation (#3071) John Flockton
- chore(lexical-playground): add resizability back to regular tables (#3068) Yaroslav Kiliba
- Update faq.md (#3070) Yun Feng
- fix(lexical-clipboard): pasting from google docs (#3063) 子瞻 Luci
- Update theming.md (#3067) Christian Owusu
- Update intro.md (#3064) Christian Owusu
- package-lock Gerard Rovira
- v0.5.0 (#3059) Gerard Rovira
- feat: add export/import DOM for horizontal rule node (#3057) Samuel Martineau

## v0.5.0 (2022-09-23)

- feat(lexical-playground): draggable block (#2860) 子瞻 Luci
- Dispatch CAN_{REDO,UNDO}_COMMAND after clearing history (#3056) Wilberto Morales
- Fix Table Deletion (#3053) Tyler Bainbridge
- Remove previousText check (#3052) Tyler Bainbridge
- Improve table selection handling when there are no siblings (#3051) Tyler Bainbridge
- Fix initialEditorState flow (#3048) Gerard Rovira
- Add Selection View in DevTools (#2955) Will
- Fix (Known) Table Bugs (#3000) Tyler Bainbridge
- Revise Vite compression (#3036) Gerard Rovira
- Fix composition text boundary for canInsertTextAfter (#3045) Gerard Rovira
- Fix nested mark creation when wrapping forward selection (#3027) Ken Powers
- Add position property to menus & disable floating link toolbar for autolink nodes (#3035) Tyler Bainbridge
- Update collab docs (#3033) Maksim Horbachevsky
- feat(lexical-react): add initialEditorState for LexicalCollaborationPlugin (#3011) Dragoș Străinu
- [0.5] Remove deprecated initialEditorState from OnChangePlugin (#3031) Gerard Rovira
- [0.5] Remove initialEditorState from  Plain/RichTextPlugin (#3032) Gerard Rovira
- Make  -> isEditable mandatory (#3030) Gerard Rovira
- Add optional cursors container prop for a better positioning in scrollable layouts (#3025) Maksim Horbachevsky
- [0.5] Treat undefined selection the same as null in  (#2948) Acy Watson
- [0.5]  ->  (#3020) Gerard Rovira
- getStyleObjectFromCSS to compute when cache miss (#3024) Gerard Rovira
- [0.5] Revise usage of root node vs shadow (#3022) Gerard Rovira
- Fix code highlighter race condition on transform (#3014) Gerard Rovira
- : Selection-agnostic node insertion with Grid/Node selection support (#2638) Gerard Rovira
- add docs (#3019) Acy Watson
- [0.5] Remove INERT mode (#2421) Gerard Rovira
- [0.5] Correct definition of isTopLevel; introduce DecoratorNode->isInline, ElementNode->isShadowRoot (#3009) Gerard Rovira
- Revert md changes from #3001 (#3015) Maksim Horbachevsky
- add install step (#3008) Acy Watson
- Revise RnageSelection dirty toggle (#3007) Dominic Gannaway
- Trim content for newlines only (#3006) Maksim Horbachevsky
- Fix  flow type (#3005) Gerard Rovira
- Fix bad TypeaheadMenuPlugin prod build (#3003) Gerard Rovira
- Capture pendingDecorators after garbage collecting detached decorators (#2999) Adrien Wald
- ElementNode -> isTopLevel() (#3001) Gerard Rovira
- Rm unused helpers from older markdown code (#2998) Maksim Horbachevsky
- Add DEPRECATED prefix to Grid APIs (#2966) Dominic Gannaway
- [Automated Releases] Add logging and dry run to release script (#2986) Acy Watson
- Fix www exports (#2994) Maksim Horbachevsky
- Fix WWW import rewrite for React (#2996) Gerard Rovira
- Fix insert column header bug (#2995) Tyler Bainbridge
- docs: loadContent clarification (#2989) ly3xqhl8g9
- docs: Fix URL of rich-text and plain-text (#2985) kimulaco
- Fixed exportDOM for paragraph node (#2981) Hafiz
- remove ff merge from release (#2984) Acy Watson
- fix versioning for ff merge (#2983) Acy Watson
- merge from main Acy Watson
- merge from main Acy Watson
- add back config Acy Watson
- add ssh key Acy Watson
- push config (#2979) Acy Watson
- Clean up redundant newlines during pasting (#2969) Maksim Horbachevsky
- config (#2977) Acy Watson
- Improve docs around the React plugins page (#2976) Dominic Gannaway
- install (#2972) Acy Watson
- Update collab errors, related cleanup (#2971) Maksim Horbachevsky
- Automated releases (#2949) Acy Watson
- Add empty comment in front of 'export' in a bundled file (#2970) Maksim Horbachevsky
- Fix bugs with isEditable (#2967) Dominic Gannaway
- allow escaped markdown within TextFormatTransformer (#2964) Christian Ratz
- Fix link breaking when formatting on (#2954) Patrick McCullough
- fix typo on read-mode / edit-mode page (#2962) Christian Ratz
- fix (#2957) Acy Watson
- Add table cell menu back (#2958) Tyler Bainbridge
- fix (#2956) Acy Watson

## 0.4.1 (September 5, 2022)

- Fix breaking bug for `isEditable` mode in editor initialization (#2945) Tim Laubert
- Fix Safari selection highlighting bug (#2943) John Flockton
- Fix Android backspace bug (#2940) Dominic Gannaway

## 0.4.0 (September 3, 2022)

### Breaking Changes

#### Renamed isReadOnly API to isEditable

editor.isReadyOnly -> editor.isEditable()
editor.setReadyOnly -> editor.setEditable()
editor.registerReadOnlyListener -> editor.registerEditableListener()
editor config { readOnly: true } -> { editable: boolean }

https://github.com/facebook/lexical/pull/2912

#### Markdown Transformers Require Dependencies

The "dependencies" property is now required for custom markdown Element and TextMatch Transformers. It takes an array of LexicalNode subclasses and
asserts that they're available in the editor when transforms are registered.

https://github.com/facebook/lexical/pull/2910

#### Selection Updates when isEditable is false (previous ReadOnly mode)

Lexical will now track and update selection in response to DOM selectionchange events when editor.isEditable is false. This is necessary for enabling some behavior
such as commenting via marks, but may cause other indirect changes such as update listeners firing when they didn't previously.

- Ensure editor states are cloned if read only (#2936) Dominic Gannaway
- Prevent nested editor event duplication (#2935) Dominic Gannaway
- Avoid preventing default for copy events when there is no selection (#2930) Dominic Gannaway
- Non-Editable Mode Playground Improvements (#2927) Acy Watson
- fix: do not import LexicalTypeaheadMenuPlugin from src folder (#2928) Eric Charles
- Change read only mode API to editable mode (#2912) Dominic Gannaway
- Fix typo (#2925) Tjaart van der Walt
- Remove redundant readonly checks. (#2921) Acy Watson
- allow selection in readonly mode (#2920) Acy Watson
- Remove $getEditor (#2919) Dominic Gannaway
- Use window of current default view (#2918) Dominic Gannaway
- Fix bad CSS on content editable container (#2917) Dominic Gannaway
- Ensure we only mutate a non-readonly editor state (#2915) Dominic Gannaway
- Fix failing build (#2916) John Flockton
- Read only validation server (#2899) Dominic Gannaway
- Add serialized node type exports (#2914) Matthew Lin
- Provide markdown plugin node dependencies (#2910) Dominic Gannaway
- Fixed typo (#2908) Heesung Jang
- Add Flow Types for AutoEmbedPlugin and TypeaheadPlugin (#2904) Tyler Bainbridge
- Fix link pasting (#2903) Maksim Horbachevsky
- Attempt transform of NodeSelection to RangeSelection on mouseDown (#2901) Gerard Rovira
- chore: add e2e tests for maxlength plugin (#2478) Adithya Vardhan
- Added sanitizer to FloatingLinkEditor (#2900) Heesung Jang
- Rename website folder (#2902) John Flockton
- remove unnecessary text append (#2898) John Flockton
- Fix Lexical package main entry points (#2897) Dominic Gannaway
- Fix overriding keyboard controls on internal decorator (#2895) Dominic Gannaway
- Allow code highlighting to run without active selection (#2891) Maksim Horbachevsky
- Fix editor content clipping bug (#2890) Dominic Gannaway
- LexicalTypeaheadMenuPlugin - Increase priority for keyboard commands (#2885) Theo Tillberg
- Remove redundant css property (#2888) Adam Kona
- Playground: Fix collab connect/disconnect toggling (#2887) Maksim Horbachevsky
- Improve heuristics around node selection and keyboard navigation (#2884) Dominic Gannaway
- Don't merge history entries from different editors (#2873) Acy Watson
- Exported DEFAULT_TRANSFORMERS array in react LexicalMarkdownShortcutPlugin (#2878) Kevin Ansfield
- Replaced `addTransform` with `registerNodeTransform` in transforms doc (#2882) Kevin Ansfield
- add example for additional nodes in plugin (#2879) Stefan Huber
- add the corresponding import to react doc (#2881) Stefan Huber
- Fix playground visual styling (#2876) Dominic Gannaway
- chore(deps): bump minimist in /packages/lexical-website-new (#2744) dependabot[bot]
- chore(deps): bump terser from 5.14.1 to 5.14.2 (#2869) dependabot[bot]
- Change linebreak node handling in insertNodes (#2857) Acy Watson
- Add some React Docs (#2858) Acy Watson
- fix delete backward bug (#2870) Dominic Gannaway
- add watch mode for auto-gen doc comments in dev (#2859) Acy Watson
- Update package-lock.json (#2866) ＡＮＤＲＩ Ｈ.Ｕ
- Update package-lock.json (#2865) ＡＮＤＲＩ Ｈ.Ｕ
- Fix issue with emoji (#2853) John Flockton
- Adjust Typeahead Styles (#2846) Tyler Bainbridge
- revert inadvertent change (#2849) Acy Watson
- Fix small type issue (#2847) John Flockton
- Wider (#2848) John Flockton
- Add autogenerated TypeDoc docs (#2837) Acy Watson
- fix: set cursor grab when image can be dragged (#2831) 子瞻 Luci
- fix(lexical-playground): two issues with scrolling-related scenarios (#2724) 子瞻 Luci
- fix: add fallback for code formatting (#2833) Adithya Vardhan
- rename local variables (#2840) Acy Watson
- fix broken links in docs (#2839) Reid Barber
- Fixing grammar on RootNode documentation (#2838) Aaron Freeland
- fix: transfer format and indent info on wrap (#2832) Adithya Vardhan
- fixed getStyleObjectFromRawCSS to handle css values with a colon (#2814) Hayden Warmington
- Add Panel to Display Props for DevTools Nodes (#2803) Will

## 0.3.11 (August 12, 2022)

- fix more code imports (#2828) Acy Watson

## 0.3.10 (August 12, 2022)

- Fix Code imports (#2826) Gerard Rovira
- Fix selection#deleteLine (#2813) Maksim Horbachevsky

## 0.3.9 (August 11, 2022)

Most notably:
- Added playground Figma embed and AutoEmbed plugin
- LinkNode target and rel support
- Many bugfixes

Commits:
- No nullish LinkNode props (#2818) Gerard Rovira
- Fix collapsed selection on links (#2817) Gerard Rovira
- prevent button from submitting forms (#2811) Gerard Delmàs
- Fixed flow return type for TableOfContents plugin (#2802) Karam Qaoud
- Update editor-state.md (#2808) William Cary
- Fix nested editors in collab (#2781) Dominic Gannaway
- chore: add some declare global (#2804) 子瞻 Luci
- Fix selection adjustment after text match transformer (#2795) Maksim Horbachevsky
- Inject DevTools Script in Browser Extension (#2778) Will
- Fix inserting nodes next to top level decorators (#2796) Maksim Horbachevsky
- chore(auto-link-plugin): fix invariant message for node registration check (#2790) Eric Charles
- Fixing comments list scrolling issue (#2789) Ebad
- Fix internal build error (#2787) John Flockton
- fix: dropdown icon css (#2786) Adithya Vardhan
- chore: Move useCollaborationContext to dedicated file (#2777) Thomas Sauques
- chore(lexical-playground): typos, improved build (#2780) Yaroslav Kiliba
- make importJSON static in test node (#2784) Acy Watson
- fix(lexical): ts expect error (#2776) 子瞻 Luci
- Fix documentation typos (#2774) Lyle Denman
- fix: Single anchor element per LexicalTypeaheadMenuPlugin instance (#2768) Thomas Sauques
- Node/GridSelection docs (#2773) Gerard Rovira
- Add Figma Embed to Playground (#2705) Tyler Bainbridge
- Selection#formatText to retain selection and handle all text nodes (#2770) Maksim Horbachevsky
- Fixed scrolling bar view (#2772) Karam Qaoud
- Add LexicalAutoEmbedPlugin and (Playground)AutoEmbedPlugin. (#2704) Tyler Bainbridge
- Bug: Undo command after creating a Quote removes text after Quote element (https://github.com/facebook/lexical/issues/2750) (#2767) Alexandru Pavaloi
- Handle insertTranspose for beforeinput event (#2764) Maksim Horbachevsky
- Fix selection format for empty paragraphs (#2759) Maksim Horbachevsky
- Remove unused keys from evens and utils (#2763) John Flockton
- chore: fix aria-label typo (#2762) 子瞻 Luci
- feat: Replace select with dropdown for code (#2761) 子瞻 Luci
- Fix typo in community page (#2760) Joshua Chen
- Add initial editor state for collab example (#2749) Maksim Horbachevsky
- Table of contents style improvements (#2743) Karam Qaoud
- Highlight DOM Nodes onHover of Lexical DevTools Node (#2728) Will
- Tighten check on top level decorator nodes (#2746) John Flockton
- Remove unused markdown functions (#2747) John Flockton
- feat: Replace select with dropdown for font size and font family (#2441) Adithya Vardhan
- fix: Verify if there are text nodes before continue (#2616) Nahuel Veron
- Convert pasted Google Docs Title text into a Heading (#2729) Acy Watson
- Remove isCollapsed from selection onClick (#2727) John Flockton
- fix: cross button css in poll node (#2742) Adithya Vardhan
- fix: getTopLevelElement for decoratorNode (#2741) Adithya Vardhan
- fix: `timeoutId` type (#2735) Shanmughapriyan S
- fix: some typo (#2737) 子瞻 Luci
- docs: readme improvements (#2734) GJunior
- Bug: typo in Documentation. It should be ReactNode instead of React (https://github.com/facebook/lexical/issues/2731) (#2732) Alexandru Pavaloi
- Added table of contents documentation (#2720) Karam Qaoud
- Fix: Minor Typo on Lexical Playground ActionsPlugin (#2717) Yamil García Hernández
- Excalidraw fixes (#2711) John Flockton
- Resolve selection for orphan selected children (#2677) Gerard Rovira
- feat(lexical-playground): prettier code (#2688) 子瞻 Luci
- Revert "Add E2E test for TableOfContentsPlugin (#2675)" (#2708) Gerard Rovira
- Add E2E test for TableOfContentsPlugin (#2675) Karam Qaoud
- OnChangePlugin ignoreInitialChange -> ignoreHistoryMergeTagChange (#2706) Gerard Rovira
- feat: Link node with target and rel (#2687) Andriy Chemerynskiy
- fix: check if options are empty (#2701) Adithya Vardhan
- Remove coverage reports (#2699) John Flockton
- Make includeHeaders a boolean (#2697) alinamusuroi
- fix(playground): fix rendering Exclidraw (#2694) Bryan
- Collapse and Expand DevTools Tree Nodes (#2679) Will
- fix(lexical-playground): LexicalTypeaheadMenuPlugin import (#2689) Elvin Dzhavadov
- Fix VALID_TWITTER_URL to allow underscores. (#2690) hiraoka
- fix: path to icons (#2683) Adithya Vardhan
- Fixed typo (#2678) SalvadorLekan
- Separate `@lexical/code` into more atomic modules (#2673) John Flockton
- fix(lexical-list): remove list breaks if selection in empty (#2672) 子瞻 Luci
- Conditionally utilize `startTransition` if it's present (#2676) Jack Hanford
- chore(lexical-playground): make directory clear (#2674) 子瞻 Luci

## 0.3.8 (July 20, 2022)

Lots of bug fixes.

Introduces TypeaheadPlugin and associated primitives, which consolidate the implementation of all such functionality (mentions and component picker) and create a base to build similar typeahead functionality from.

Introduces TableOfContents plugin for easier navigation of long-form documents. Available in the playground in the settings menu (bottom-left corner).

Introduces a "clipboard viewer" functionality in the local dev environment. When active, it shows the clipboard content the last time the paste event was fired with the editor focused.

- Remove default styling imports on HTML paste (#2663) Acy Watson
- fix(lexical-playground): code lang display (#2658) 子瞻 Luci
- chore(lexical-playground): remove files that should not be submitted (#2662) 子瞻 Luci
- Selection.extract fix (#2620) Acy Watson
- Specify the return type of getNearestNodeOfType. (#2651) hiraoka
- Autolink default protocol (#2654) Gerard Rovira
- fix(doc): RichTextPlugin placeholder (#2655) unvalley
- fix(lexical): calculate range selection formatting (#2643) 子瞻 Luci
- Add TableOfContentsPlugin (#2634) Karam Qaoud
- Port ASCII State Tree to Browser Extension (#2625) Will
- Fix markdown text matchers during md import (#2644) Maksim Horbachevsky
- fix(lexical): Japanese IME issue (#2623) 子瞻 Luci
- Remove comment box from footer (#2639) John Flockton
- Delete doc from ydocMap on unmount. Fixes init on re-mount (#2637) Maksim Horbachevsky
- feat: new way to delete comments and threads (#2570) Adithya Vardhan
- Lexical Typeaheads (#2534) Tyler Bainbridge
- Add $insertBlockNode (#2633) Gerard Rovira
- Add seperate flag for if script had loaded (#2628) John Flockton
- Fix Chrome types in Lexical DevTools (#2627) John Flockton
- Capture the expected payload type in commands (#2537) Patrik Åkerstrand
- fix unit test warning (#2618) Acy Watson
- fix(lexical-playground): fix toolbar-item button style bug in safari (#2621) 子瞻 Luci
- add docs (#2611) Acy Watson
- Add default value for undefined case in markdown transformers (#2453) Noah Cook
- Add PasteLog Plugin (#2609) Acy Watson
- Fix pasting inline code blocks (#2607) Maksim Horbachevsky

## 0.3.7 (July 6, 2022)

Lots of bug fixes and polish. Notably, the full text of minifed Lexical error codes can now be accessed via the [Lexical website](https://lexical.dev/docs/error?code=2).

- Update Browser Extension's Vite Config (#2540) Will
- fix: import color and vertical align info from html string (#2571) Adithya Vardhan
- Update PollNode.css (#2602) VelociRaptor
- Update package names (#2599) Acy Watson
- Ensure to call existing listeners only (not newly added ones) (#2573) Maksim Horbachevsky
- Added dragend to list of rootElementEvents (#2598) stuartrobinson3007
- Reverse MarkdownExport loop order to take TextMatchTransformers into account first (#2582) Lukas
- Fetch Lexical State Tree in DevTools App (#2510) Will
- chore: use keyboard shortcuts (#2580) Adithya Vardhan
- fix prettier Gerard Rovira
- Replace background images with pseudo classes to display checkboxes in playground (#2567) VelociRaptor
- Customize default focus position (#2591) Gerard Rovira
- Add missing dependencies (#2585) John Flockton
- Website error codes - lexical.dev/error/<code> (#2574) Gerard Rovira
- Use Vite server for E2E tests in CI (Fix windows CI failures) (#2584) Acy Watson
- feat(lexical-playground): copy button for @lexical/code (#2396) 子瞻 Luci
- fix: commenting issue after ts migration (#2558) Adithya Vardhan
- npm run changelog (#2561) Gerard Rovira
- fix: typo edtior to editor (#2560) Florent DUVEAU

## 0.3.6 (June 29, 2022)

lexical & @lexical/ packages:
- fix(lexical): Text with underline format is stripped out on paste (#2555) 子瞻 Luci
- Trigger readonly listener only when value has changed (#2550) Maksim Horbachevsky
- fix(lexical): deselecting a decorator node by clicking (#2554) 子瞻 Luci
- Remove wordwrap for tree view (#2551) John Flockton
- add docs for headless package (#2539) Acy Watson
- Normalize list children (#2509) Acy Watson
- Add ability to set format and detail by string type (#2547) John Flockton
- Pasting multi-line plain text into rich-text mode produces separate paragraphs (#2507) Maksim Horbachevsky
- Revert "Revert "fix: insert text after delete next to inline node (#2530)" (#2544)" (#2549) Gerard Rovira
- Revert "fix: insert text after delete next to inline node (#2530)" (#2544) Gerard Rovira
- fix: insert text after delete next to inline node (#2530) Patrik Åkerstrand
- Fix IME bug in `lexical-history` (#2501) John Flockton
- Export Klass from Lexical root (#2533) John Flockton
- Hide placeholder when readonly (#2511) Gerard Rovira
- remove utility types from all packages (#2529) John Flockton
- Improve markdown newline export/import (#2519) Maksim Horbachevsky
- Revisit formatText node selection (#2524) Gerard Rovira
- Fix $generateHtmlFromNodes to output whole editor contents if selection is null (#2504) yicrotkd
- Remove unnecessary comments (#2505) John Flockton
- fix(lexical): "selection.format" is not set correctly (#2502) 子瞻 Luci
- Fixed getStyleObjectFromRawCSS function to work with unformatted css (#2515) Karam Qaoud
- Fix image copy+paste (#2517) Dominic Gannaway
- Migrate to TS strict mode 6/n  (#2496) John Flockton
- fix(lexical): caret at wrong place when paste (#2465) 子瞻 Luci
- Fix infinite recursion in insertText in RangeSelection (#2490) Patrik Åkerstrand
- Update error message and docs (#2492) John Flockton
- Migrate to TS strict mode 5/n (#2488) John Flockton
- Fix composition bugs affecting intern (#2487) John Flockton
- Fix FF issue with composition (#2486) Dominic Gannaway
- Migrate to TS strict mode 3/n  (#2482) John Flockton
- Fix Flow rewrite imports script (#2477) John Flockton
- Migrate to TS strict mode 2/n (#2469) John Flockton
- Inserting inline elements (#2474) Maksim Horbachevsky
- Fix component/plugin names in get started section (#2472) Aleš Menzel
- Revert "add e2e tests for MaxLength plugin (#2466)" (#2467) Gerard Rovira
- add e2e tests for MaxLength plugin (#2466) Adithya Vardhan
- Fix can format backwards when at first text node boundary (#2445) Gerard Rovira
- Fix button--outline hover color dark mode (#2462) M. Zakiyuddin Munziri
- Migrate to TS strict mode 1/n (#2458) John Flockton
- renamed character styles popup plugin (#2456) Strek

Playground:
- Flower size (#2527) Gerard Rovira
- fix(lexical-playground): Resizing is not consistent on mobile (#2518) 子瞻 Luci
- fix(lexical-playground): Floating toolbar displayed on composition (#2506) 子瞻 Luci
- chore(lexical-playground): remove redundant code (#2497) 子瞻 Luci

Docs:
- add docs for headless package (#2539) Acy Watson
- tiny typo fix (#2514) Hadi El-Yakhni

Infra:
- Update e2e test docs and run-all script (#2522) yicrotkd
- Fix Windows CI Runs (#2513) Acy Watson
- Deploy Lexical prod build to Vercel (#2476) Gerard Rovira
- CI check against prod bundle (#2460) Gerard Rovira
- shared PKG to cleanup (#2463) Gerard Rovira

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
