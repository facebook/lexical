/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Provider} from '.';
import type {CollabDecoratorNode} from './CollabDecoratorNode';
import type {CollabLineBreakNode} from './CollabLineBreakNode';
import type {CollabTextNode} from './CollabTextNode';
import type {Cursor} from './SyncCursors';
import type {Klass, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import invariant from '@lexical/internal/invariant';
import {type Doc, XmlElement, XmlText} from 'yjs';

import {
  $createCollabElementNode,
  type CollabElementNode,
} from './CollabElementNode';
import {CollabV2Mapping} from './CollabV2Mapping';
import {
  disposeInlineFormatLayout,
  getLayoutState,
  initializeInlineFormatLayout,
  type InlineFormatLayoutState,
} from './SyncV2';
import {initializeNodeProperties, ROOT_NODE_NAME} from './Utils';

export type ClientID = number;
export interface BaseBinding {
  clientID: number;
  cursors: Map<ClientID, Cursor>;
  cursorsContainer: null | HTMLElement;
  /**
   * For remote cursors, we lazily create stylesheet that hosts the `::highlight(...)` rules.
   * Editors mounted in different frames each adopt the sheet into their own document.
   */
  cursorHighlightSheet: CSSStyleSheet | null;
  doc: Doc;
  docMap: Map<string, Doc>;
  editor: LexicalEditor;
  id: string;
  nodeProperties: Map<string, {[property: string]: unknown}>; // node type to property to default value
  excludedProperties: ExcludedProperties;
  /**
   * True only while the initial editor state is being written into an empty
   * shared document (the `shouldBootstrap` path). Bootstrapping is not a user
   * edit, so the {@link UndoManager} returned by `createUndoManager` does not
   * capture transactions produced while this is set.
   *
   * @internal Set by the collaboration plugin around the bootstrap update;
   * not part of the supported surface for application code.
   */
  isBootstrapping: boolean;
}

export interface Binding extends BaseBinding {
  /** @internal Movement hints for the editor-state transition being synced. */
  _movedNodeKeys?: Set<NodeKey>;
  collabNodeMap: Map<
    NodeKey,
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
  >;
  root: CollabElementNode;
}

export interface BindingV2 extends BaseBinding {
  mapping: CollabV2Mapping;
  root: XmlElement;
  /**
   * @experimental The {@link CreateBindingV2Options__EXPERIMENTAL.inlineFormats}
   * option this binding was created with. Which layout the document uses is
   * {@link getInlineFormatLayoutState__EXPERIMENTAL}.
   */
  readonly inlineFormats?: boolean;
}

export type AnyBinding = Binding | BindingV2;

export type ExcludedProperties = Map<Klass<LexicalNode>, Set<string>>;

function createBaseBinding(
  editor: LexicalEditor,
  id: string,
  doc: Doc,
  docMap: Map<string, Doc>,
  excludedProperties?: ExcludedProperties,
): BaseBinding {
  const binding = {
    clientID: doc.clientID,
    cursorHighlightSheet: null,
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    docMap,
    editor,
    excludedProperties: excludedProperties || new Map(),
    id,
    isBootstrapping: false,
    nodeProperties: new Map(),
  };
  initializeNodeProperties(binding);
  return binding;
}

/** Options for {@link createYjsBinding}. */
export interface CreateYjsBindingOptions {
  editor: LexicalEditor;
  /** Identifier for this binding, used as the key in `docMap`. */
  id: string;
  doc: Doc;
  docMap: Map<string, Doc>;
  excludedProperties?: ExcludedProperties;
  /** The key used to look up the root `XmlText` shared type on the Yjs `Doc`. Defaults to `'root'`. */
  rootName?: string;
  /**
   * Resolve the root `XmlText` from the `Doc` yourself, for roots that are not
   * a top-level shared type (e.g. an `XmlText` held in a `Y.Map` or `Y.Array`,
   * as when one `Doc` stores many independently editable documents).
   *
   * Called while the binding is constructed — before any provider has synced —
   * so it must resolve (or create) the root from whatever the `Doc` holds
   * locally at that moment, and it must be idempotent: a caller may build more
   * than one binding over the same root (React StrictMode's double-invoked
   * render, a remount), and creating a shared type twice would replace what the
   * first call created.
   *
   * The returned type is checked to be an `XmlText` integrated into `doc`
   * (reachable from a top-level shared type). It must also not be in use by
   * another live binding, which cannot be checked — a second binding over one
   * root replaces the collab nodes cached on its shared types. A binding cannot
   * be repointed at a different root afterwards. When given, this takes
   * precedence over {@link CreateYjsBindingOptions.rootName}.
   */
  getXmlText?: (doc: Doc) => XmlText;
}

/**
 * Create a V1 Yjs {@link Binding} that connects a {@link LexicalEditor} to a
 * Yjs `Doc` for real-time collaboration.
 *
 * For the legacy positional-argument API, see {@link createBinding}.
 */
export function createYjsBinding({
  editor,
  id,
  doc,
  docMap,
  excludedProperties,
  rootName = 'root',
  getXmlText,
}: CreateYjsBindingOptions): Binding {
  const rootXmlText = getXmlText
    ? getXmlText(doc)
    : (doc.get(rootName, XmlText) as XmlText);
  invariant(
    rootXmlText instanceof XmlText && rootXmlText.doc === doc,
    'createYjsBinding: getXmlText must return an XmlText that is already integrated into the given doc',
  );
  const root: CollabElementNode = $createCollabElementNode(
    rootXmlText,
    null,
    'root',
  );
  root._key = 'root';
  const baseBinding = createBaseBinding(
    editor,
    id,
    doc,
    docMap,
    excludedProperties,
  );
  editor._recordNodeMoves = true;
  return {
    ...baseBinding,
    collabNodeMap: new Map(),
    root,
  };
}

export function createBinding(
  editor: LexicalEditor,
  provider: Provider,
  id: string,
  doc: Doc | null | undefined,
  docMap: Map<string, Doc>,
  excludedProperties?: ExcludedProperties,
): Binding {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  return createYjsBinding({doc, docMap, editor, excludedProperties, id});
}

/** Options for {@link createBindingV2__EXPERIMENTAL}. */
export interface CreateBindingV2Options__EXPERIMENTAL {
  excludedProperties?: ExcludedProperties;
  /**
   * @experimental Write new documents in the inline-format layout. Defaults to
   * `false`, which keeps the existing layout byte for byte.
   *
   * In this layout:
   * - an inline ElementNode whose class declares
   *   `$config({collab: {inline: 'format'}})` (LinkNode and AutoLinkNode do)
   *   is stored as formatting over the characters it wraps rather than as its
   *   own XmlElement, so wrapping, unwrapping or undoing a wrap never deletes
   *   and re-inserts those characters, and typing inside the range
   *   concurrently stays inside it. Its synchronized value is its JSON schema
   *   fields beyond ElementNode's, one Yjs key per field, plus its NodeState;
   * - a TextNode's format is stored as one key per format (`f_bold`, ...), so
   *   concurrent bold and italic on overlapping text both apply;
   * - a LineBreakNode is stored inside the text run, so a concurrent line
   *   break does not split the run.
   *
   * Adoption is explicit and per document. A document is put in this layout
   * by {@link initializeInlineFormatLayout__EXPERIMENTAL}, which marks it (in a
   * dedicated top-level Y.Map, per root) only if this option is set and its
   * shared root is still empty; call it once the provider has synced, right
   * before writing the first content. The React collaboration plugin does so
   * after the provider's first sync. Every binding that finds the mark uses
   * the layout, with or without the option. An unmarked document keeps the
   * default layout, whatever this option says: nothing is converted, and
   * content written before the mark (e.g. typed before the first sync) is in
   * the default layout and keeps the document there (a migration mode may be
   * added later). A binding that finds a mark from a newer layout version
   * reads the document as well as it can, makes the editor read-only and does
   * not write to it (see {@link getInlineFormatLayoutState__EXPERIMENTAL}).
   *
   * Clients from before this option existed cannot read the layout, so every
   * client of a document must be upgraded before a document is created with
   * it. Such a client:
   * - fails to load the document if any paragraph contains a line break
   *   (its reader throws on the line break stored in the text run);
   * - otherwise shows the text without links or formats, and on its first
   *   edit of a paragraph removes the links and formats of that paragraph for
   *   every client.
   *
   * Known limits:
   * - Formatting with the same key applied concurrently over overlapping
   *   ranges with different extents follows Yjs formatting semantics: the
   *   text is never lost or duplicated, but one range can lose its part past
   *   the other's end, and a property changed by one client while another
   *   deletes or undoes the formatted range can briefly cover neighboring
   *   text (see the tests). Presence and each property are separate keys to
   *   keep this to the property that changed; as a consequence, concurrent
   *   changes to different properties of overlapping wrappers merge per
   *   property, which can combine properties from different clients (for
   *   example one client's URL with another's target).
   * - Each wrapper property is its own format key with its own boundary
   *   markers, so link-heavy documents are larger than in the default layout
   *   (about 1.5 times for a document of short linked phrases).
   * - Inline DecoratorNodes and inline ElementNodes that do not opt in still
   *   split the text run; inside a wrapper they carry its keys and are
   *   reassembled under it.
   * - An empty wrapper cannot be represented; properties a node does not
   *   declare in its JSON schema are not synchronized.
   */
  inlineFormats?: boolean;
  /** The key used to look up the root `XmlElement` shared type on the Yjs `Doc`. Defaults to `'root-v2'`. */
  rootName?: string;
  /**
   * Resolve the root `XmlElement` from the `Doc` yourself, for roots that are
   * not a top-level shared type (e.g. an `XmlElement` held in a `Y.Map` or
   * `Y.Array`, as when one `Doc` stores many independently editable
   * documents). The V2 equivalent of
   * {@link CreateYjsBindingOptions.getXmlText}, with the same before-any-sync
   * timing and the same idempotency requirement.
   *
   * The returned type is checked to be an `XmlElement` integrated into `doc`
   * (reachable from a top-level shared type) that was created as
   * `new XmlElement()` without a `nodeName` — the root is identified by its
   * default `'UNDEFINED'` node name, which is also what
   * `doc.get(rootName, XmlElement)` produces — and fails with an invariant
   * rather than corrupting the document. As in V1, that it is not in use by
   * another live binding cannot be checked and is the caller's to guarantee.
   * When given, it takes precedence over
   * {@link CreateBindingV2Options__EXPERIMENTAL.rootName}.
   */
  getXmlElement?: (doc: Doc) => XmlElement;
}

export function createBindingV2__EXPERIMENTAL(
  editor: LexicalEditor,
  id: string,
  doc: Doc | null | undefined,
  docMap: Map<string, Doc>,
  options: CreateBindingV2Options__EXPERIMENTAL = {},
): BindingV2 {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  const {
    excludedProperties,
    rootName = 'root-v2',
    getXmlElement,
    inlineFormats = false,
  } = options;
  const root = getXmlElement
    ? getXmlElement(doc)
    : (doc.get(rootName, XmlElement) as XmlElement);
  invariant(
    root instanceof XmlElement && root.doc === doc,
    'createBindingV2: getXmlElement must return an XmlElement that is already integrated into the given doc',
  );
  invariant(
    root.nodeName === ROOT_NODE_NAME,
    'createBindingV2: the root XmlElement must be created without a nodeName (its nodeName is %s, expected %s)',
    root.nodeName,
    ROOT_NODE_NAME,
  );
  return {
    ...createBaseBinding(editor, id, doc, docMap, excludedProperties),
    inlineFormats,
    mapping: new CollabV2Mapping(),
    root,
  };
}

/**
 * @experimental Which layout `binding` uses for its document (see
 * {@link CreateBindingV2Options__EXPERIMENTAL.inlineFormats}):
 * - `'default'`: the default layout;
 * - `'inline'`: the inline-format layout (the document is marked with it);
 * - `'unsupported'`: the document is marked with a newer inline-format layout
 *   version than this version of \@lexical/yjs supports. The binding reads it
 *   as well as it can and does not write to it; it makes the editor
 *   read-only and reports this once through the editor's `onWarn`.
 */
export function getInlineFormatLayoutState__EXPERIMENTAL(
  binding: BindingV2,
): InlineFormatLayoutState {
  return getLayoutState(binding);
}

/**
 * @experimental Puts a new document in the inline-format layout: marks it, if
 * `binding` was created with
 * {@link CreateBindingV2Options__EXPERIMENTAL.inlineFormats} and the
 * document's shared root is empty and unmarked. Call it once the document is
 * complete locally (after the provider's first sync), right before writing
 * the first content; calling it before that can mark a document that has
 * content elsewhere. Returns the binding's layout state afterwards.
 */
export function initializeInlineFormatLayout__EXPERIMENTAL(
  binding: BindingV2,
): InlineFormatLayoutState {
  return initializeInlineFormatLayout(binding);
}

/**
 * @experimental Whether `binding` reads and writes its document in the
 * inline-format layout: {@link getInlineFormatLayoutState__EXPERIMENTAL} is
 * `'inline'`. False for `'unsupported'`, where it does not write.
 */
export function isInlineFormatLayoutActive__EXPERIMENTAL(
  binding: BindingV2,
): boolean {
  return getLayoutState(binding) === 'inline';
}

/**
 * @experimental Releases what a V2 binding registered on its editor and
 * document as it synced: currently the node transforms and the observer of
 * the inline-format layout. Call it when the binding stops syncing (the React
 * collaboration plugin does on unmount). A binding that is used again
 * registers them again on its next sync.
 */
export function disposeBindingV2__EXPERIMENTAL(binding: BindingV2): void {
  disposeInlineFormatLayout(binding);
}

export function isBindingV1(binding: BaseBinding): binding is Binding {
  return Object.prototype.hasOwnProperty.call(binding, 'collabNodeMap');
}

export function isBindingV2(binding: BaseBinding): binding is BindingV2 {
  return Object.prototype.hasOwnProperty.call(binding, 'mapping');
}
