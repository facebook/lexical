/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

declare module 'yjs' {
  declare interface Snapshot {}

  declare export interface Transaction {
    origin: mixed;
  }

  declare interface YEvent {
    target: any;
  }

  declare export class XmlText {
    doc: null | YDoc;
    parent: null | XmlText | XmlElement;
    getAttributes(): {...};
    getAttribute(string): string | Object | void;
    setAttribute(string: string, value: string | number): void;
    insert(offset: number, string: string, attributes?: {...}): void;
    insertEmbed(offset: number, Object): void;
    delete(offset: number, delCount: number): void;
    observeDeep(fn: Function): void;
    unobserveDeep(fn: Function): void;
    observe(fn: Function): void;
    unobserve(fn: Function): void;
    on(type: string, () => void): void;
    toDelta(): Array<TextOperation>;
    toJSON(): Object;
    _length: number;
  }

  declare export class Map {
    +doc: ?YDoc;
    parent: null | XmlText;
    get(key: string): any;
    set(key: string, value: any): void;
    keys(): [string];
    _length: number;
  }

  declare export class XmlElement {
    +doc: ?YDoc;
    parent: null | XmlText | XmlElement;
    getAttributes(): {...};
    getAttribute(string): string | void;
    setAttribute(string: string, value: string | number | Object): void;
    removeAttribute(string: string): void;
    insert(offset: number, entry: any): void;
    delete(offset: number, delCount: number): void;
    observeDeep(fn: Function): void;
    unobserveDeep(fn: Function): void;
    observe(fn: Function): void;
    unobserve(fn: Function): void;
    on(type: string, () => void): void;
    toJSON(): Object;
    firstChild: null | YDoc;
  }

  // $FlowFixMe: needs fixing
  declare type YMapEventKeyChanges = any;

  declare type Operation = {
    insert: string | {...},
    attributes: {__type: string, ...},
  };

  declare type Delta = Array<Operation>;

  declare export interface YMapEvent extends YEvent {
    keysChanged: Set<string>;
    changes: {
      keys: YMapEventKeyChanges,
    };
  }

  declare export type TextOperation = {
    retain?: number,
    delete?: number,
    insert?: string | XmlText | Map | XmlElement,
  };

  declare export interface YTextEvent extends YEvent {
    keysChanged: Set<string>;
    childListChanged: boolean;
    target: XmlText;
    delta: Array<TextOperation>;
  }

  declare export class ID {
    /**
     * @param {number} client client id
     * @param {number} clock unique per client id, continuous number
     */
    constructor(client: number, clock: number): this;

    /**
     * Client id
     * @type {number}
     */
    client: number;

    /**
     * unique per client id, continuous number
     * @type {number}
     */
    clock: number;
  }

  declare export class AbsolutePosition {
    /**
     * @param {AbstractType<any>} type
     * @param {number} index
     */
    constructor(type: YAbstractType, index: number): this;

    /**
     * @type {AbstractType<any>}
     */
    type: Map | XmlText;

    /**
     * @type {number}
     */
    index: number;
  }

  declare export class RelativePosition {
    /**
     * @param {ID|null} type
     * @param {string|null} tname
     * @param {ID|null} item
     */
    constructor(type: ?ID, tname: ?string, item: ?ID): this;

    /**
     * @type {ID|null}
     */
    type: ?ID;

    /**
     * @type {string|null}
     */
    tname: ?string;

    /**
     * @type {ID | null}
     */
    item: ?ID;
  }

  declare export interface YAbstractType {
    +doc: ?YDoc;
    parent: null | XmlText | XmlElement;
    observe((event: YEvent, transaction?: Transaction) => void): void;
    unobserve((event: YEvent, transaction?: Transaction) => void): void;
    toJSON<T>(): T;
  }

  declare type YDocEvents = {
    beforeTransaction: [Transaction, YDoc],
    beforeObserverCalls: [Transaction, YDoc],
    afterTransaction: [Transaction, YDoc],
    beforeAllTransactions: [YDoc],
    update: [Uint8Array, mixed, YDoc, Transaction],
    // More efficient update format, but not recommended for production
    updateV2: [Uint8Array, mixed, YDoc, Transaction],
    subdocs: [
      {
        loaded: $ReadOnlySet<YDoc>,
        added: $ReadOnlySet<YDoc>,
        removed: $ReadOnlySet<YDoc>,
      },
    ],
    destroy: [YDoc],
  };

  declare class YDoc {
    constructor(): this;

    /**
     * A unique id that identifies a client for a session. It should not be reused
     * across sessions - see FAQ.
     */
    +clientID: number;

    /**
     * Whether garbage collection is enabled on this doc instance. Set
     * doc.gc = false to disable garbage collection and be able to restore old
     * content. See Internals for more information about how garbage collection
     * works.
     */
    gc: boolean;

    /**
     * Every change on the shared document happens in a transaction. Observer
     * calls and the update event are called after each transaction. You should
     * bundle changes into a single transaction to reduce event calls. I.e.
     * doc.transact(() => { yarray.insert(..); ymap.set(..) }) triggers a single
     * change event.
     *
     * You can specify an optional origin parameter that is stored on
     * transaction.origin and on('update', (update, origin) => ..).
     */
    transact((transaction: Transaction) => void, origin?: mixed): void;

    /**
     * Get a top-level instance of a shared type.
     */
    get(name: string, type: Class<YAbstractType>): YAbstractType;

    /**
     * Define a shared Y.Array type. Is equivalent to y.get(string, Y.Array).
     */
    getArray<T>(name?: ?string): YArray<T>;

    /**
     * Define a shared Y.Map type. Is equivalent to y.get(string, Y.Map).
     */
    getMap<T>(name?: ?string): YMap<T>;

    /**
     * Define a shared Y.Text type. Is equivalent to y.get(string, Y.Text).
     */
    getText(name?: ?string): YText;

    /**
     * Register an event handler.
     */
    on<TEvent: $Keys<YDocEvents>>(
      name: TEvent,
      listener: (...args: YDocEvents[TEvent]) => void,
    ): void;

    /**
     * Register an event handler. But only call it once.
     */
    once<TEvent: $Keys<YDocEvents>>(
      name: TEvent,
      listener: (...args: YDocEvents[TEvent]) => void,
    ): void;

    /**
     * Unregister an event handler.
     */
    off<TEvent: $Keys<YDocEvents>>(
      name: TEvent,
      listener: (...args: YDocEvents[TEvent]) => void,
    ): void;

    destroy(): void;

    toJSON<T>(): T;

    load(): void;
  }

  /**
   * A shared type to store data in a sequence-like data structure
   */
  declare class YArray<T> implements YAbstractType {
    /**
     * An alternative constructor to create a Y.Array based on existing content.
     */
    static from(Array<T>): YArray<T>;

    /**
     * The Yjs document that this type is bound to. Is null when it is not bound
     * yet.
     */
    +doc: ?YDoc;

    /**
     * The parent that holds this type. Is null if this yarray is a top-level
     * type.
     */
    parent: null | XmlText | XmlElement;

    /**
     * The number of elements that this Y.Array holds.
     */
    length: number;

    /**
     * Insert content at a specified index. Note that - for performance reasons -
     * content is always an array of elements. I.e. yarray.insert(0, [1]) inserts
     * 1 at position 0.
     */
    insert(index: number, content: Array<T>): void;

    /**
     * Delete length Y.Array elements starting from index.
     */
    delete(index: number, length: number): void;

    /**
     * Append content at the end of the Y.Array. Same as
     * yarray.insert(yarray.length, content).
     */
    push(content: Array<T>): void;

    /**
     * Prepend content to the beginning of the Y.Array. Same as yarray.insert(0,
     * content).
     */
    unshift(content: Array<T>): void;

    /**
     * Retrieve the n-th element.
     */
    get<T>(index: number): T;

    /**
     * Retrieve a range of content starting from index start (inclusive) to index
     * end (exclusive). Negative indexes can be used to indicate offsets from the
     * end of the Y.Array. I.e. yarray.slice(-1) returns the last element.
     * yarray.slice(0, -1) returns all but the last element. Works similarly to
     * the Array.slice method.
     */
    slice(start?: number, end?: number): Array<T>;

    /**
     * Retrieve the JSON representation of this type. The result is a fresh Array
     * that contains all Y.Array elements. Elements that are shared types are
     * transformed to JSON as well, using their toJSON method. The result may
     * contain Uint8Arrays which are not JSON-encodable.
     */
    toJSON<T>(): T;

    /**
     * Execute the provided function once on every element.
     */
    forEach(f: (item: T, index: number, array: YArray<T>) => void): void;

    /**
     * Creates a new Array filled with the results of calling the provided
     * function on each element in the Y.Array.
     */
    map<M>(f: (item: T, index: number, array: YArray<T>) => M): Array<M>;

    /**
     * Returns an Iterator of values for the Y.Array. This allows you to iterate
     * over the yarray using a for..of loop: for (const value of yarray) { .. }
     */
    @@iterator<T>(): Iterator<T>;

    /**
     * Clone all values into a fresh Y.Array instance. The returned type can be
     * included into the Yjs document.
     */
    clone(): YArray<T>;

    /**
     * Registers a change observer that will be called synchronously every time
     * this shared type is modified. In the case this type is modified in the
     * observer call, the event listener will be called again after the current
     * event listener returns.
     */
    observe(observer: (event: YEvent, transaction?: Transaction) => void): void;

    /**
     * Unregisters a change observer that has been registered with yarray.observe.
     */
    unobserve(
      observer: (event: YEvent, transaction?: Transaction) => void,
    ): void;

    /**
     * Registers a change observer that will be called synchronously every time
     * this type or any of its children is modified. In the case this type is
     * modified in the event listener, the event listener will be called again
     * after the current event listener returns. The event listener receives all
     * Events created by itself or any of its children.
     */
    observeDeep(
      observer: (events: Array<YEvent>, transaction?: Transaction) => void,
    ): void;

    /**
     * Unregisters a change observer that has been registered with
     * yarray.observeDeep.
     */
    unobserveDeep(
      observer: (events: Array<YEvent>, transaction?: Transaction) => void,
    ): void;

    toArray(): Array<T>;
  }

  /**
   * A shared type similar with a similar API to global.Map
   */
  declare class YMap<T> implements YAbstractType {
    /**
     * The Yjs document that this type is bound to. Is null when it is not bound
     * yet.
     */
    +doc: ?YDoc;

    /**
     * The parent that holds this type. Is null if this ymap is a top-level type.
     */
    parent: null | XmlText | XmlElement;

    /**
     * Number of   elements in the map.
     */
    size: number;

    /**
     * Add or update an entry with a specified key. This method works similarly to
     * the Map.set method. The value can be a shared type, an Uint8Array, or
     * anything JSON-encodable.
     */
    set(key: string, value: T): T;

    /**
     * Returns an entry with the specified key. This method works similarly to the
     * Map.get method.
     */
    get<T>(key: string): ?T;

    /**
     * Deletes an entry with the specified key. This method works similarly to the
     * Map.delete method.
     */
    delete(key: string): void;

    /**
     * Returns true if an entry with the specified key exists. This method works
     * similarly to the Map.has method.
     */
    has(key: string): boolean;

    /**
     * Copies the [key,value] pairs of this Y.Map to a new Object. It transforms
     * all shared types to JSON using their toJSON method.
     */
    toJSON<T>(): T;

    /**
     * Execute the provided function once on every key-value pair.
     */
    forEach<T>(f: (value: T, key: string, map: YMap<T>) => void): void;

    /**
     * Returns an Iterator of [key, value] pairs. This allows you to iterate over
     * the ymap using a for..of loop: for (const [key, value] of ymap) { .. }
     */
    @@iterator<T>(): Iterator<[string, T]>;

    /**
     * Returns an Iterator of [key, value] pairs.
     */
    entries<T>(): Iterator<[string, T]>;

    /**
     * Returns an Iterator of values only. This allows you to iterate through the
     * values only for (const value of ymap.values()) { ... } or insert all values
     * into an array Array.from(ymap.values()).
     */
    values<T>(): Iterator<T>;

    /**
     * Returns an Iterator of keys only. This allows you to iterate through the
     * keys only for (const key of ymap.key()) { ... } or insert all keys into an
     * array Array.from(ymap.keys()).
     */
    keys(): Iterator<string>;

    /**
     * Clone all values into a fresh Y.Map instance. The returned type can be
     * included into the Yjs document.
     */
    clone(): YMap<T>;

    /**
     * Clone all values into a fresh Y.Map instance. The returned type can be
     * included into the Yjs document.
     */
    observe(
      observer: (event: YMapEvent, transaction?: Transaction) => void,
    ): void;

    /**
     * Unregisters a change observer that has been registered with ymap.observe.
     */
    unobserve(
      observer: (event: YMapEvent, transaction?: Transaction) => void,
    ): void;

    /**
     * Registers a change observer that will be called synchronously every time
     * this type or any of its children is modified. In the case this type is
     * modified in the event listener, the event listener will be called again
     * after the current event listener returns. The event listener receives all
     * Events created by itself or any of its children.
     */
    observeDeep(
      observer: (events: Array<YEvent>, transaction?: Transaction) => void,
    ): void;

    /**
     * Unregisters a change observer that has been registered with
     * ymap.observeDeep.
     */
    unobserveDeep(
      observer: (events: Array<YEvent>, transaction?: Transaction) => void,
    ): void;
  }

  declare class YText implements YAbstractType {
    /**
     * Create an instance of Y.Text with existing content.
     */
    constructor(text?: ?string): this;

    /**
     * The Yjs document that this type is bound to. Is null when it is not bound
     * yet.
     */
    +doc: ?YDoc;

    /**
     * The parent that holds this type. Is null if this ytext is a top-level type.
     */
    parent: null | XmlElement | XmlText;

    /**
     * The length of the string in UTF-16 code units. Since JavaScripts' String
     * implementation uses the same character encoding
     * ytext.toString().length === ytext.length.
     */
    length: number;

    /**
     * Insert content at a specified index. Optionally, you may specify formatting
     * attributes that are applied to the inserted string.
     */
    insert(index: number, text: string, format?: {[key: string]: mixed}): void;

    /**
     * Assign formatting attributes to a range of text.
     */
    format(
      index: number,
      length: number,
      format?: {[key: string]: mixed},
    ): void;

    /**
     * Apply a Text-Delta to the Y.Text instance.
     */
    applyDelta(delta: Delta): void;

    /**
     * Delete length characters starting from index.
     */
    delete(index: number, length: number): void;

    /**
     * Retrieve the string-representation (without formatting attributes) from the
     * Y.Text instance.
     */
    toString(): string;

    /**
     * Retrieve the Text-Delta-representation of the Y.Text instance.
     * The Text-Delta is equivalent to Quills' Delta format.
     */
    toDelta(): Delta;

    /**
     * Retrieves the string representation of the Y.Text instance.
     */
    toJSON<T>(): T;

    /**
     * Clone this type into a fresh Y.Text instance. The returned type can be
     * included into the Yjs document.
     */
    clone(): YText;

    /**
     * Registers a change observer that will be called synchronously every time
     * this shared type is modified. In the case this type is modified in the
     * observer call, the event listener will be called again after the current
     * event listener returns.
     */
    observe(
      observer: (event: YTextEvent, transaction?: Transaction) => void,
    ): void;

    /**
     * Unregisters a change observer that has been registered with ytext.observe.
     */
    unobserve(
      observer: (event: YTextEvent, transaction?: Transaction) => void,
    ): void;

    /**
     * Registers a change observer that will be called synchronously every time
     * this type or any of its children is modified. In the case this type is
     * modified in the event listener, the event listener will be called again
     * after the current event listener returns. The event listener receives all
     * Events created by itself or any of its children.
     */
    observeDeep(
      observer: (events: Array<YEvent>, transaction?: Transaction) => void,
    ): void;

    /**
     * Unregisters a change observer that has been registered with
     * ytext.observeDeep.
     */
    unobserveDeep(
      observer: (events: Array<YEvent>, transaction?: Transaction) => void,
    ): void;
  }

  declare interface Item {}

  declare export type YUndoManagerOptions = {
    captureTimeout?: number,
    trackedOrigins?: $ReadOnlySet<mixed>,
    deleteFilter?: (item: Item) => boolean,
  };

  declare type StackItem = {
    meta: Map<mixed, mixed>,
    type: 'undo' | 'redo',
  };

  declare type YUndoManagerStackItem = {
    stackItem: StackItem,
  };

  declare type YUpdateManagerEvents = {
    /**
     * Register an event that is called when a StackItem is added to the undo- or
     * the redo-stack.
     */
    'stack-item-added': [YUndoManagerStackItem],

    /**
     * Register an event that is called when a StackItem is popped from the undo-
     * or the redo-stack.
     */
    'stack-item-popped': [YUndoManagerStackItem],
  };

  /**
   * Yjs ships with a selective Undo/Redo manager. The changes can be optionally
   * scoped to transaction origins.
   */
  declare class YUndoManager {
    /**
     * Creates a new Y.UndoManager on a scope of shared types. If any of the
     * specified types, or any of its children is modified, the UndoManager adds a
     * reverse-operation on its stack. Optionally, you may specify trackedOrigins
     * to filter specific changes. By default, all local changes will be tracked.
     * The UndoManager merges edits that are created within a certain
     * captureTimeout (defaults to 500ms). Set it to 0 to capture each change
     * individually.
     */
    constructor(scope: XmlText, options?: YUndoManagerOptions): this;

    /**
     * Undo the last operation on the UndoManager stack. The reverse operation
     * will be put on the redo-stack.
     */
    undo(): void;

    /**
     * Redo the last operation on the redo-stack. I.e. the previous redo is
     * reversed.
     */
    redo(): void;

    /**
     * Call stopCapturing() to ensure that the next operation that is put on the
     * UndoManager is not merged with the previous operation.
     */
    stopCapturing(): void;

    /**
     * Delete all captured operations from the undo & redo stack.
     */
    clear(): void;

    /**
     * Register a stack-item-added or stack-item-popped event listener.
     */
    on<TEvent: $Keys<YUpdateManagerEvents>>(
      name: TEvent,
      listener: (...args: YUpdateManagerEvents[TEvent]) => void,
    ): void;
  }

  declare export function applyUpdate(doc: YDoc, update: Uint8Array): void;

  declare export function encodeStateAsUpdate(
    doc: YDoc,
    encodedTargetStateVector?: Uint8Array,
  ): Uint8Array;

  declare export function encodeStateVector(doc: YDoc): Uint8Array;

  declare export function createRelativePositionFromTypeIndex(
    type: XmlText | Map | XmlElement,
    index: number,
  ): RelativePosition;

  declare export function createRelativePositionFromJSON(
    json: mixed,
  ): RelativePosition;

  declare export function createAbsolutePositionFromRelativePosition(
    rpos: RelativePosition,
    doc: YDoc,
  ): AbsolutePosition;

  declare export function compareRelativePositions(
    position1: RelativePosition,
    position2: RelativePosition,
  ): boolean;

  declare export {
    YDoc as Doc,
    YArray as Array,
    YText as Text,
    YUndoManager as UndoManager,
  };
}
