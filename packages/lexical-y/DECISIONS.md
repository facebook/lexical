# `@lexical/y`: Decision Register

The decisions that shape `@lexical/y` and the core APIs it relies on, with the
reason for each. Read it before changing the package or reviewing a pull
request to it.

A `DECIDED` row is not re-opened without new evidence (a repro, a
measurement, a use case it did not consider). When a pull request makes a new
consequential decision, or changes one recorded here, it adds or updates the
row in the same pull request. Rows are never deleted: a replaced decision
says what replaced it.

## Status legend

| Status           | Meaning                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `DECIDED`        | Ratified. Do not re-open without new evidence.                                                 |
| `ACCEPTED LIMIT` | A known behaviour that was weighed and accepted, usually rare and losing no text. Documented in [Limits][limits]. |
| `OPEN`           | Undecided: a trade-off or design question waiting on research or a maintainer's call.          |

Dates are when the decision was made (2026). Links go to the pull requests,
issues and docs that carry it.

---

## Compatibility and API design

| ID  | Decision | Why | Status | Date | Links |
| --- | -------- | --- | ------ | ---- | ----- |
| D01 | **Zero breaking changes in released packages.** Changes to public APIs, behaviour and serialized formats are additive or opt-in. `@lexical/y` is a new, opt-in package; a behaviour change for existing users goes to a separate deprecation track. | Lexical is widely adopted, and the new binding had to reach production quickly without risk to anyone not using it. | `DECIDED` | 10-22 | [AGENTS.md][root-agents], [#9504], [#9531] |
| D02 | **A new package, `@lexical/y`, on Yjs 14 (`@y/y`), next to an unchanged `@lexical/yjs`.** The name mirrors `@y/y`. | A new storage layout needs a new package anyway, so existing documents keep working where they are and apps that never import it tree-shake it out. Yjs 14 has attribution built in; building something new on Yjs 13 was judged pointless. | `DECIDED` | 10-20 | [#9400], [y.md: When to use it][y-when] |
| D03 | **AI-first API design.** Each rule sits as high as it can go: type, then lint, then test, then a throw (for untrusted input only), then a warning, then docs. Choices are explicit: a required parameter may be `null`, as `editYState`'s `writer` is. | Most code that uses the library is written by agents, which read types and error data, not prose. | `DECIDED` | 10-28 | [#9437], [#9510] |
| D04 | **Typed warnings.** Core has one generic `LexicalWarning` (`code`, `data`); `@lexical/y` owns its codes (`YWarning`, `isYWarning`, `data.reason`). Messages are short and factual, with no product-facing strings; apps render their own banners from `code` and `data`. | An agent acts on a precise signal, and a product will not show a library's name or wording in its UI. | `DECIDED` | 10-28 | [#9400], [y.md: Warnings][y-warnings] |
| D05 | **Warnings go through the editor's `onWarn`, after the Yjs transaction.** The binding queues them and passes them on once Yjs is idle; a throwing handler rethrows in a microtask. There is no separate `onInfo`. | Lexical's default `onWarn` throws in development, and a throw inside a Yjs observer would abort a remote update halfway. | `DECIDED` | 10-23 | [#9400] |
| D06 | **Core stays free of collaboration.** No collaboration, Yjs or binding vocabulary, API or collab-only behaviour in `lexical` or any package other than `@lexical/yjs` and `@lexical/y`; the playground and the collaboration docs may mention it. | Core concepts must make sense without a binding, and a binding must not leak its model into every app. | `DECIDED` | 10-23 | [#9400], [#9452] |
| D07 | **`createYDoc` is required.** `YCollabExtension`'s `doc` is a branded `YDoc` that only `createYDoc` makes, with Yjs's format cleanup off from creation. The binding fails closed (read only, `UNSUPPORTED_CONFIG_WARNING`) on a document that runs the cleanup. | The cleanup deletes format items the binding keeps for concurrent edits (D24), and that write reaches every peer. The type catches a plain `Y.Doc` at compile time. | `DECIDED` | 10-29 | [#9510], [y.md: Set up an editor][y-setup] |
| D08 | **`schemaVersion` is required, Google Docs model.** The app declares an integer; the document records every version that wrote it (grow-only, so concurrent bumps converge on the highest). An older client opens read only with a typed warning; headless `editYState` refuses. | Being strict first is safer and can be loosened later; letting older clients edit with fields they do not know carries risk that a version gate removes. | `DECIDED` | 10-29 | [#9510], [y.md: Versioning your schema][y-schema] |
| D09 | **Layout version gate.** The root is `lexical-y`, not a `@lexical/yjs` root; it records `lexical-y:<n>` per layout it needs, and the record only grows. The editor is read only until the record is read, and stays so on a newer or malformed one. No server-side update filter or upgrade-notice helpers ship. | An older client that misreads a new layout can show the document empty and then overwrite it. A sticky read-only gate is the least that prevents it; more machinery offered little. Read only for an older client counts as non-breaking. The gate was chosen on 10-23; the grow-only record and the non-breaking call on 10-25. | `DECIDED` | 10-25 | [#9400], [#9439], [y.md: Changing the layout][y-layout] |
| D10 | **An older client keeps what it cannot read.** Between clients of one `schemaVersion`, a client keeps the fields, formats and NodeState it does not know when it edits a node; a line it splits keeps an unknown field on both halves. Without version skew, it stores exactly the bytes it stored before. | Nothing is lost, and it lets a newer version remove a field. The version gate (D08) is the main protection; this is defence in depth, and must leave stored bytes unchanged when there is no skew. | `DECIDED` | 10-29 | [#9504], [y.md: Limits][limits] |
| D11 | **The self-check is off by default.** When enabled it reports mismatches as warnings. | It costs time on every change; it is a debugging aid for tests and development. | `DECIDED` | 10-22 | [y.md: Set up an editor][y-setup] |
| D12 | **`@lexical/yjs` v1 and v2 get no more fixes.** Their deprecation goes into the docs when `@lexical/y` leaves `@experimental`, with no announcement before that. One v2 table fix, [#9584], merged on 10-30 before this row was checked; later v1 and v2 fix pull requests ([#9595], [#9596]) were closed under it. | Effort goes to the new binding; removing either would break users (D01). | `DECIDED` | 10-22 | [#9413], [#9584], [#9595], [#9596] |
| D13 | **The Yjs 14 release candidate is pinned exactly** (`@y/y` `14.0.0-rc.29`) until Yjs 14 is final. Every bump re-checks the Yjs internals the binding reads (D14). | Release candidates change behaviour between versions, and the binding writes through Yjs internals (D14). | `DECIDED` | 10-23 | [#9400], [package.json](./package.json) |
| D14 | **`@lexical/y` is coupled to one Yjs version on purpose, and may use Lexical and Yjs internals.** `@y/y` is an exact peer dependency (`14.0.0-rc.29`), bumped only deliberately and with the equivalence test, so a product cannot bump Yjs by accident and break the binding. The binding writes through its own cursor on Yjs items, checked against the public `applyDelta` by a randomized equivalence test, and uses Lexical internals where no public API exists. A runtime guard on the Yjs version is a follow-up. | Yjs 14's public insert walks a container from its start on every call, which gets slower as documents grow; a positioned insert upstream would remove the need. Lexical controls which Yjs it supports. | `DECIDED` | 10-30 | [#9400], [#9504], [#9510], [package.json](./package.json) |
| D15 | **53-bit client ids by default; `clientIDRange: 'uint32'` is opt-in** for servers on yrs before 0.28. | yrs before 0.28 reads client ids as 32-bit, and a reconnecting author's content then duplicates. The option is small, so it stays until such servers are gone. | `DECIDED` | 10-23 | [y.md: Servers][y-servers] |

## Storage model

| ID  | Decision | Why | Status | Date | Links |
| --- | -------- | --- | ------ | ---- | ----- |
| D16 | **Flat layout.** Each container (the root, a table cell, a collapsible) is one Yjs sequence of characters, `¶` line markers and nodes. Markers carry a block's type, fields and NodeState; links and text formats are format ranges; lists are rebuilt from their items' markers. Tables, cells and decorators stay nested. | Yjs has no move: text that changes parent is deleted and written again, so a collaborator's concurrent typing is lost. In one sequence, Enter, Backspace, retyping, indenting and linking keep the characters. | `DECIDED` | 10-20 | [#9400], [y.md: How content is stored][y-stored] |
| D17 | **Node structure is declared in core `$config`, explicitly:** `inline`, `children`, `mergeAdjacent: {by}` and `derived`, with no collaboration words. `placement` and `mergeAdjacent.method` were dropped; `inline` stays. | Explicit declarations over inference: too much magic lets a class change silently and corrupt stored content. These facts also drive normalization outside collaboration. | `DECIDED` | 10-23 | [#9452] |
| D18 | **Storage is derived from those declarations, with no binding-level overrides.** Changing a declaration is a stored-format change. | One source of truth for structure and storage. A per-binding storage override is easy to forget on one client. | `DECIDED` | 10-23 | [#9400], [#9452] |
| D19 | **`NodeStructureExtension` runs in every `@lexical/y` editor.** Outside collaboration it stays opt-in, rolled out as warnings, then an opt-in extension, then the default in Lexical 1.0. Lexical's piecemeal normalization (link, list and inline-element transforms) is to be deprecated in favour of it, on its own track. | Collaboration needs structure every client agrees on; enforcing it elsewhere changes documents, so it goes on the deprecation track (D01). | `DECIDED` | 10-23 | [#9452] |
| D20 | **Only a client's own edits are written.** No client repairs a shape concurrent edits leave (D55); opening a document writes nothing; an update the editor makes on its own may set attributes or delete, never insert. This replaced "every client writes the same repair". | It is what y-prosemirror and TipTap ship. Shared repairs duplicated content in races and cost about 1,350 lines. | `DECIDED` | 10-25 | [#9400], [y.md: Set up an editor][y-setup] |
| D21 | **A transform never rewrites what a client read.** Derived fields (`derived`: a list item's `value` and `indent`) are refreshed on open by every client and written by no one. A transform registered while a document is open writes nothing; the author's next edit of that content does. | If transforms rewrote remote content, every client would write the same rewrite. | `DECIDED` | 10-25 | [#9400], [y.md: Set up an editor][y-setup] |
| D22 | **Seeding.** `binding.initialize()` writes the initial content into a pristine root once, under a client id hashed from that content, so clients that seed the same content write it once. Seeding on the server with `seedYState` is preferred. | Writing nothing until the first edit was measured and rejected: two first edits in a new document split into two paragraphs, because each line needs a marker. | `DECIDED` | 10-25 | [#9400], [#9437], [y.md: Limits][limits] |
| D23 | **Garbage collection stays on**, as Yjs defaults; headless results are compacted as clients store them. Only temporary documents turn it off. Turning it off for history is an app's choice, on every client and server. | A server that skips compaction while clients compact is a trap, and undo and insert attribution work with GC on. | `DECIDED` | 10-23 | [#9437], [y-server.md][y-server] |
| D24 | **Yjs's format cleanup is off** in `@lexical/y` containers and on every relay that loads a state (`createYDoc`). A delete keeps the ends of each deleted formatted run, within a bound per format key. Not reported upstream. | The cleanup deletes format items a concurrent writer may still rely on. Upstream already knows that skipping it is the app's trade-off. | `DECIDED` | 10-28 | [#9400], [y.md: Servers][y-servers] |
| D25 | **Undo is Yjs's `UndoManager`**, scoped to the binding's root and this client's own edits (500 ms capture by default). It never deletes a container a collaborator has put content in (its `deleteFilter`). Do not combine it with `HistoryExtension`. | Collaborative undo must not revert other people's work; keeping a container whole once someone else wrote in it matches y-prosemirror's protected nodes and is cheap to maintain. The `UndoManager` was chosen on 10-23; keeping containers whole was confirmed on 10-30. | `DECIDED` | 10-30 | [#9400], [y.md: Limits][limits] |
| D26 | **Undo favours people taking turns over concurrent races.** Where a fix makes undo correct for sequential edits at the cost of rare races between an undo and a simultaneous edit of the same text, the sequential case wins. | Taking turns is the common case; a race with a simultaneous edit of the same text is rare. Picked on 10-28, confirmed on 10-30. | `DECIDED` | 10-30 | [#9400] |
| D27 | **Moves are a delete and a re-insert** at launch; the binding rewrites the cheaper side. Real moves within a container ([#9449], records after Yjs's unmerged `ContentMove` design) are paused and land last, backward compatible: a new layout version that older clients open read only. Move records leave tombstones, as every Yjs binding does. Moves across containers stay copies. | Every Yjs binding turns moves into delete plus insert; Yjs dropped its own move for complexity. Reliability of the rest came first. | `DECIDED` | 10-25 | [#9449], [#9455], [y.md: Limits][limits] |
| D28 | **Text identity is fixed at the source.** While a binding is attached, core records text edits (`spliceText`, insert and remove, split and merge), and text entity plugins record a grow as a move and a remake as a retype. Text only `setTextContent` or the DOM changed is diffed. The binding adds no per-case heuristics. | No binding can recover intent an API dropped; special-case rules were fragile and regressed neighbouring cases. | `DECIDED` | 10-27 | [#9483], [y.md: Edits made by code][y-code] |
| D29 | **Remade text keeps its common start and end by character**, whatever the node boundaries (y-prosemirror's `updateYText` rule), and never brings back a collaborator's delete. It replaces the word matching of [#9565]. | It is the industry-standard behaviour, and word matching glued words together and merged numbers oddly. | `DECIDED` | 10-30 | [#9565] |
| D30 | **Diffed rewrites snap to whole words**; keystrokes and IME composition keep the exact diff. Scripts without spaces treat each character as a boundary. | Concurrent rewrites otherwise split words. Real word segmentation is a follow-up ([#9467]). | `DECIDED` | 10-26 | [#9400], [#9467] |
| D31 | **A list item's nested list gets an item of its own.** `NodeStructureExtension`'s list rule prevents an item holding a nested list next to other content when it is written; the binding does not repair it afterwards. | That shape lost text in outdents, Backspaces and offline merges. Preventing it at write time follows D20. | `DECIDED` | 10-26 | [#9452], [y.md: Limits][limits] |
| D32 | **List merging ignores `start`.** | Existing Lexical behaviour, intended. | `DECIDED` | 10-23 | [#9452] |
| D70 | **No virtual structure.** The editor does not show repairs that are not stored (padded cells for a short table row, two stored lists drawn as one). The one existing case stays: text left without a line marker shows as a paragraph. | It adds another structure on top of Yjs and the Lexical tree, and the complexity that comes with it. | `DECIDED` | 10-25 | [#9400] |
| D72 | **The binding starts at one fixed point, with no further deferral or special-casing.** It starts in `YCollabExtension`'s `afterRegistration`, once every extension has registered and the initial state is applied. An initialization-order bug (a table that exists before its DOM) is fixed in the extension that has it, as [#9501] did. | Deferring the first read further changes when the binding's state exists and still misses code that registers later (legacy table observers, React plugins). | `DECIDED` | 10-28 | [#9501], [#9537] |
| D73 | **`@lexical/y` first publishes with its whole launch stack** (the binding, the server API, the playground and per-member sets), with real moves after (D27). The launch stack was chosen on 10-23; moves were moved after it on 10-25. | The first published format should already include what the launch needs, such as per-member sets. | `DECIDED` | 10-25 | [#9400], [#9437], [#9438], [#9439] |

## Block ids

| ID  | Decision | Why | Status | Date | Links |
| --- | -------- | --- | ------ | ---- | ----- |
| D33 | **Lexical owns block ids** (`BlockIdExtension`, `@lexical/extension`), stored as NodeState `blockId`, not as Yjs identity. | Yjs ids do not survive a split, a reseed, JSON or HTML, or paste. Other editors store their own block ids too. Two implementations would drift. | `DECIDED` | 10-23 | [#9421], [block ids][block-ids] |
| D34 | **New blocks get 21 random URL-safe characters (126 bits).** A collision is repaired deterministically: the block that held the id keeps it. Re-examined on 10-29 for shorter ids: kept, since handles (D36) fix the token cost. | Unique without coordination between peers that may be offline or headless; a mistyped id matches nothing. Shorter stored ids would weaken that and change stored formats. | `DECIDED` | 10-29 | [#9421] |
| D35 | **A document stored without ids gets positional ids**, the same on every reader. The derivation is part of the stored format. | Two reads of the same document must name blocks the same way, or an agent's edit points at nothing. | `DECIDED` | 10-22 | [#9421] |
| D36 | **Agents see handles, not ids.** A handle is the shortest prefix, at least 4 characters, of a 64-bit hash of the id that is unique in the document; it works for any id format. Resolving one returns a typed status. HTML export gets a separate `handles` option; `export` stays a boolean as shipped. | About 4 tokens instead of 14, and nothing stored. A typo almost always matches nothing (about 2.5 in 100,000 hit another block), where sequential aliases (`b1`, `b2`) would edit the neighbour. Resolve an agent's reply against the snapshot it read (`{read}`), so a deleted block's handle cannot name a new one. Hashing keeps handles short for derived and time-ordered ids. | `DECIDED` | 10-30 | [#9531] |

## Marks and comments

| ID  | Decision | Why | Status | Date | Links |
| --- | -------- | --- | ------ | ---- | ----- |
| D37 | **Comments are NodeState marks (`MarkStateExtension`), not `MarkNode`.** `MarkNode` stays for compatibility; it is not the path for collaboration. | Wrapping a range in an element moves its text, which loses concurrent typing. | `DECIDED` | 10-20 | [#9380], [comments][comments] |
| D38 | **Set-valued NodeState is `arraySetValue`:** a frozen, sorted, deduplicated `readonly string[]`, scoped to `createState`. | Fully serializable and cheap to compare; the runtime type is public API, so it was decided before release. Sets are tiny (a few ids per node). | `DECIDED` | 10-23 | [#9380] |
| D39 | **`@lexical/y` stores one format key per set member** on text, line breaks and nodes of their own, so two comments added at once on the same words both stay. This is layout 2. | One value per set would keep one writer's set. y-prosemirror and other bindings converged on one key per mark. | `DECIDED` | 10-22 | [#9439] |
| D40 | **Mark storage is owned by the product.** `defineMarkExtension` makes one extension per kind of annotation, each with its own key; `MarkBaseExtension` is the shared registry. The document stores ids only, never values; the annotation's data lives where the product chooses. | Values in the document are copied onto every run, conflict per run and go stale on undo. Where thread data lives (a `Y.Map`, a database, both) differs by product. | `DECIDED` | 10-28 | [#9496], [comments][comments] |
| D41 | **Resolve a comment in the product's store:** keep its id in the text, mark the thread resolved and hide it with `isMarkIDShown`. | Unresolving is free, and it avoids the item each removed id leaves (D47). | `DECIDED` | 10-28 | [#9489], [comments][comments] |
| D42 | **A comment whose text is gone is orphaned**, as in Google Docs; the binding does not keep it restorable. | The thread stays in the product's store with no text to point at. | `DECIDED` | 10-28 | [#9496] |
| D43 | **Mark ids are strict:** an id with whitespace is refused. | Strict first; it can be loosened later without breaking anyone. | `DECIDED` | 10-23 | [#9380] |

## Server-side editing

| ID  | Decision | Why | Status | Date | Links |
| --- | -------- | --- | ------ | ---- | ----- |
| D44 | **Three plain functions** (`seedYState`, `readYState`, `editYState`). Edits may write only allowed roots (default: the layout root). A read never stores what opening writes. A warning never refuses an edit. Follow-up commits stop after 8 with a warning. A `@lexical/yjs` document is converted by seeding next to its old root. One writer per document is documented, with no locking. | The smallest surface a server needs, with each rule explicit. | `DECIDED` | 10-23 | [#9437], [y-server.md][y-server] |
| D45 | **`editYState` requires a `writer`** (`createYWriter`, carrying an author) or `null`. A writer keeps one client id per document while each call continues from its last update; when that is not safe (an older state, a call inside a call) it takes a new id and warns. A caller never picks a client id. | Every server edit decides who writes it. A client id reused by two writers corrupts silently, and a new id per edit bloats the document. | `DECIDED` | 10-28 | [#9437], [y-server.md][y-server] |
| D71 | **Server-side edits stay callbacks** (`editYState`'s `$edit`), run on the state the edit was computed from, with guidance added on writing them. | The edit is ordinary Lexical code with every Lexical API available; guidance covers what the callback cannot enforce. | `DECIDED` | 10-25 | [#9437], [y.md: Edits made by code][y-code] |
| D46 | **Products own server policy; Lexical gives the pieces.** How an agent's edit applies (at once, as a suggestion, with an undo) and what a refused client does are the product's choice; the framework dictates no extra steps. Relay checks are defence in depth for authorized writers, not a permission boundary. | Products differ, and a server cannot judge a peer's intent from a Yjs update. | `DECIDED` | 10-29 | |

## Accepted limits

| ID  | Limit | Why accepted | Status | Date | Links |
| --- | ----- | ------------ | ------ | ---- | ----- |
| D47 | **A removed set member leaves a live format item** (about 30 bytes) after its text. | Deleting it is safe only once every writer has seen the removal, which Yjs cannot tell. D41 avoids it. | `ACCEPTED LIMIT` | 10-28 | [#9495], [limits] |
| D48 | **Moves duplicate or drop concurrent typing:** text typed into a block while it moves is lost or lands at its old place, and two people moving the same block can duplicate it. | D27. | `ACCEPTED LIMIT` | 10-25 | [#9449], [limits] |
| D49 | **Delete wins:** text typed into, or a block moved into, a container a collaborator deletes at the same time is deleted with it. | Yjs deletes a parent's children; anything else would resurrect deleted content. | `ACCEPTED LIMIT` | 10-25 | [limits] |
| D50 | **Two clients removing the same text and both undoing show it twice.** | Plain `UndoManager` behaviour; avoiding it needs a layout feature. | `ACCEPTED LIMIT` | 10-23 | [limits] |
| D51 | **Rare undo and marker-cleanup timings can spread a comment or format onto untouched words** (two writes of one client both undone while a collaborator collapses markers; three authors in [#9575]). | Rare, no text lost. A provenance marker would need a layout version bump and about a week. | `ACCEPTED LIMIT` | 10-30 | [#9562], [#9575] |
| D52 | **Unbolding inside your own bold while a collaborator bolds text starting at its end** can leave the new text plain (when the unbolding client's id is higher). | Rare and cosmetic, no text lost. The repair is tracked in [#9589]; nothing more happens now. | `ACCEPTED LIMIT` | 10-30 | [#9562], [#9589] |
| D53 | **Removing a format while a collaborator types inside it** brings the format back on the rest of the range, up to its end. | The collaborator's write restores the format it saw; formats are ranges in one sequence (D16). On Yjs 13 it runs to the end of the paragraph. | `ACCEPTED LIMIT` | 10-27 | [#9400], [limits] |
| D54 | **Text changed without a record of the edit** (`setTextContent`, DOM text changes) racing a collaborator puts their typing at the start of the new text. | The remaining cases of D28; recording intent at the source shrinks them. | `ACCEPTED LIMIT` | 10-27 | [#9483], [y.md: Edits made by code][y-code] |
| D55 | **Ragged tables stay ragged until the next table command**, which pads them; two clients padding at once add an extra column. | D20: no client repairs remote shapes. | `ACCEPTED LIMIT` | 10-25 | [#9453], [limits] |
| D56 | **Initial content that differs between clients shows twice** (random ids, different block id configurations, a root that held content). | Seeding merges only identical bytes (D22); seed in one place. | `ACCEPTED LIMIT` | 10-25 | [limits] |
| D57 | **Lone surrogates** reach other clients as U+FFFD. | Yjs encodes text as UTF-8; Yjs 13 does the same. Malformed text such as a broken emoji is the author's own input, not an editor problem, so there is no code follow-up. | `ACCEPTED LIMIT` | 10-30 | [limits] |
| D58 | **Inline elements with their own content** (`MarkNode`, `AutoLinkNode`) move text into them when they wrap it, so concurrent typing there stays outside. | Use NodeState marks (D37). | `ACCEPTED LIMIT` | 10-20 | [limits] |

## Open

| ID  | Question | Where it stands | Status | Date | Links |
| --- | -------- | --------------- | ------ | ---- | ----- |
| D59 | **Block containers in the node structure.** A container that is not a shadow root counts as one block, so `$insertList` replaces it; a box inside a box loses the outer box. | The rule should live in `NodeStructureExtension`. Draft in progress. | `OPEN` | 10-30 | [#9570] |
| D60 | **Code highlighting as display-only.** Today highlighting is stored token nodes, so code written without the highlighter opens plain until edited (D21). | Right long term, but intrusive; documented for now. | `OPEN` | 10-30 | [#9536], [#9558] |
| D61 | **Two concurrent joins into one line** both write its type; Yjs keeps one by client id. | Inherent to the marker layout; a real trade-off. | `OPEN` | 10-30 | [#9511] |
| D62 | **Two app versions that store a type differently insert its first node at once.** | Needs a storage-kind record protocol; `schemaVersion` (D08) covers apps that bump it. | `OPEN` | 10-30 | [#9512] |
| D63 | **A line without a marker joins a paragraph a collaborator appends.** | Every reader rule considered changes how stored documents read. | `OPEN` | 10-30 | [#9524] |
| D64 | **Undoing a format while a collaborator edits inside its range.** | Yjs format items cannot be conditional on another item; the remaining option is a core or storage change. | `OPEN` | 10-30 | [#9560], [#9521] |
| D65 | **A comment spreading after an offline client types plain text into it.** | Keeping the last nulls breaks growth bounds; the alternative needs recorded provenance. | `OPEN` | 10-30 | [#9564] |
| D66 | **Server identity:** claim a client id on first use, or server-issued leases. | Claim on first use is the recommendation; not decided. | `OPEN` | 10-29 | |
| D67 | **The rest of the server-defence proposals:** a relay gate judging version records against a published ceiling, budgets, recovery, an author map, agent write policies. | Researched and proposed; nothing decided beyond D46. | `OPEN` | 10-29 | |
| D68 | **Splice-based text edit helpers exported from Lexical** for agents that rewrite text, and named APIs for intent that `setTextContent` drops. | Agents should edit text in place; the API shape is undecided. | `OPEN` | 10-27 | [#9483] |
| D69 | **Comments on block decorators** (an image), as in Google Docs. | Not today, same as `MarkNode`; keep the door open. | `OPEN` | 10-23 | [#9380] |

[root-agents]: ../../AGENTS.md
[limits]: ../lexical-website/docs/collaboration/y.md#limits
[y-when]: ../lexical-website/docs/collaboration/y.md#when-to-use-it
[y-setup]: ../lexical-website/docs/collaboration/y.md#set-up-an-editor
[y-warnings]: ../lexical-website/docs/collaboration/y.md#warnings
[y-schema]: ../lexical-website/docs/collaboration/y.md#versioning-your-schema
[y-stored]: ../lexical-website/docs/collaboration/y.md#how-content-is-stored
[y-code]: ../lexical-website/docs/collaboration/y.md#edits-made-by-code-agents-tools
[y-servers]: ../lexical-website/docs/collaboration/y.md#servers
[y-layout]: ../lexical-website/docs/collaboration/y.md#changing-the-layout-and-migrating
[y-server]: ../lexical-website/docs/collaboration/y-server.md
[comments]: ../lexical-website/docs/collaboration/comments.md
[block-ids]: ../lexical-website/docs/collaboration/block-ids.md
[#9380]: https://github.com/meta/lexical/pull/9380
[#9400]: https://github.com/meta/lexical/pull/9400
[#9413]: https://github.com/meta/lexical/pull/9413
[#9421]: https://github.com/meta/lexical/pull/9421
[#9437]: https://github.com/meta/lexical/pull/9437
[#9439]: https://github.com/meta/lexical/pull/9439
[#9449]: https://github.com/meta/lexical/pull/9449
[#9452]: https://github.com/meta/lexical/pull/9452
[#9453]: https://github.com/meta/lexical/issues/9453
[#9455]: https://github.com/meta/lexical/issues/9455
[#9467]: https://github.com/meta/lexical/issues/9467
[#9483]: https://github.com/meta/lexical/pull/9483
[#9489]: https://github.com/meta/lexical/pull/9489
[#9495]: https://github.com/meta/lexical/issues/9495
[#9496]: https://github.com/meta/lexical/pull/9496
[#9438]: https://github.com/meta/lexical/pull/9438
[#9501]: https://github.com/meta/lexical/pull/9501
[#9504]: https://github.com/meta/lexical/pull/9504
[#9510]: https://github.com/meta/lexical/pull/9510
[#9511]: https://github.com/meta/lexical/issues/9511
[#9512]: https://github.com/meta/lexical/issues/9512
[#9521]: https://github.com/meta/lexical/issues/9521
[#9524]: https://github.com/meta/lexical/issues/9524
[#9531]: https://github.com/meta/lexical/pull/9531
[#9536]: https://github.com/meta/lexical/pull/9536
[#9558]: https://github.com/meta/lexical/pull/9558
[#9560]: https://github.com/meta/lexical/issues/9560
[#9562]: https://github.com/meta/lexical/pull/9562
[#9564]: https://github.com/meta/lexical/issues/9564
[#9537]: https://github.com/meta/lexical/pull/9537
[#9565]: https://github.com/meta/lexical/pull/9565
[#9570]: https://github.com/meta/lexical/issues/9570
[#9575]: https://github.com/meta/lexical/issues/9575
[#9584]: https://github.com/meta/lexical/pull/9584
[#9589]: https://github.com/meta/lexical/issues/9589
[#9595]: https://github.com/meta/lexical/pull/9595
[#9596]: https://github.com/meta/lexical/pull/9596
