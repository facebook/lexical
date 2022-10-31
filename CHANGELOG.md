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
