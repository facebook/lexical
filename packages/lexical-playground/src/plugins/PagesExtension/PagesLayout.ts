/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageGeometry, PageSetup, PageSlotKind, SlotHeights} from './types';

import {
  $getNodeByKey,
  getParentElement,
  isHTMLElement,
  type LexicalEditor,
  mergeRegister,
  type NodeKey,
} from 'lexical';

import {PageBreakNode} from '../../nodes/PageBreakNode';
import {MAX_SLOT_HEIGHT_RATIO} from './constants';
import {
  computeGeometry,
  computePageBreakMarginBottom,
  computePageCount,
  computeZoom,
  pageContentHeight,
  pageContentTop,
  pageIndexAtY,
  slotHeight,
} from './layoutMath';

/**
 * Supplies the content of header/footer slots. The layout only knows about
 * slot elements and page indices; what goes inside them is somebody else's
 * business (see `HeaderFooterSession`).
 */
export interface PagesLayoutSlotProvider {
  fillSlot(slot: HTMLElement, kind: PageSlotKind, pageIndex: number): void;
  /** `slot` is about to be removed along with its page. */
  releaseSlot(slot: HTMLElement): void;
}

export interface PagesLayoutOptions {
  gap: number;
  onPageCountChange?: (pageCount: number) => void;
}

/** Writes per settle window before the layout stops chasing itself. */
const MAX_PASSES_PER_BURST = 8;
/** Idle time after which the pass counter resets. */
const BURST_WINDOW_MS = 250;
/** Ignore sub-pixel jitter when deciding whether to rewrite a margin. */
const MARGIN_EPSILON = 0.5;
/**
 * A top-level text block holding a line with nothing but a line break: two
 * breaks in a row, a leading one, or a trailing one (followed by Lexical's
 * managed break, or in WebKit by its managed image).
 */
const BLANK_SOFT_LINE_BLOCK =
  ':is(p, h1, h2, h3, h4, h5, h6, blockquote):is(' +
  ':has(> br:first-child), :has(> br + br), ' +
  ':has(> br + img[data-lexical-managed-linebreak]))';
/** Marks a block that `index.css` moves whole past a band. */
const KEEP_TOGETHER_ATTRIBUTE = 'data-page-keep-together';

const CSS = {
  break: 'Pages__break',
  breakHeader: 'Pages__breakHeader',
  footer: 'Pages__footer',
  footerLast: 'Pages__footer--last',
  gap: 'Pages__gap',
  header: 'Pages__header',
  headerFirst: 'Pages__header--first',
  host: 'Pages__host',
  layer: 'Pages__layer',
  parking: 'Pages__parking',
  slotContent: 'Pages__slotContent',
  spacer: 'Pages__spacer',
} as const;

const HOST_VARS = [
  '--page-width',
  '--page-height',
  '--page-margin-top',
  '--page-margin-right',
  '--page-margin-bottom',
  '--page-margin-left',
  '--page-header-height',
  '--page-footer-height',
  '--page-gap',
  '--page-content-height',
  '--page-first-top',
  '--page-count',
  '--page-zoom',
];

/**
 * One page boundary: a zero-width spacer as tall as the content area, then
 * three full-width floats. Keeping footer band, gap and header band as
 * separate floats means no float ever crosses a printed page boundary
 * (the gap is zero in print), so the browser never has to fragment or
 * push one.
 */
interface PageBreakElements {
  spacer: HTMLElement;
  footerBand: HTMLElement;
  gap: HTMLElement;
  headerBand: HTMLElement;
}

/**
 * Renders a paginated view of a flat document without touching the document.
 *
 * The editor root's parent becomes the "host" (a block formatting context).
 * A `Pages__layer` is inserted before the root holding, for every page
 * boundary, a zero-width `Pages__spacer` float as tall as a page's content
 * area followed by three full-width floats: the `Pages__break` footer band,
 * the `Pages__gap` and the `Pages__breakHeader` band of the next page.
 * Because the layer is not a formatting context of its own,
 * the floats intrude into the root's line boxes: lines that would straddle a
 * page boundary flow around the break, and blocks that establish their own
 * formatting context are pushed below it whole. Page positions are pure CSS
 * (`clear: both` stacks the floats); the only JavaScript is deciding how many
 * breaks exist and stretching manual page breaks to the next page top.
 *
 * All DOM reads happen in observer callbacks (after layout, so they are
 * free) and all writes are deferred to `requestAnimationFrame`. Nothing in
 * this class calls `editor.update()`.
 */
export class PagesLayout {
  /**
   * The window that owns the editor root. Frames, observers and timing all
   * come from it, so an editor inside an iframe is laid out by the iframe.
   */
  readonly win: Window & typeof globalThis;
  readonly host: HTMLElement;
  readonly layer: HTMLElement;
  readonly parking: HTMLElement;
  private readonly firstHeader: HTMLElement;
  private readonly lastFooter: HTMLElement;
  private readonly breaks: PageBreakElements[] = [];
  private readonly pageBreakKeys = new Set<NodeKey>();
  /** Blocks marked with {@link KEEP_TOGETHER_ATTRIBUTE}. */
  private readonly keptTogether = new Set<HTMLElement>();
  private readonly cleanup: () => void;
  private slotProvider: PagesLayoutSlotProvider | null = null;
  private geom: PageGeometry | null = null;
  private pageSetup: PageSetup | null = null;
  private gap: number;
  private slotHeights: SlotHeights = {footer: {}, header: {}};
  private pageCount = 1;
  /** The zoom last written to `--page-zoom`, not the one last measured. */
  private zoom = 1;
  private pendingWrites: (() => void)[] = [];
  private writeRafId: number | null = null;
  private measureRafIds: number[] = [];
  private passes = 0;
  private lastPassAt = 0;
  private recentCounts: number[] = [];
  private pinnedCount: number | null = null;
  /** The settle guard dropped writes, so the layout may be stale. */
  private dropped = false;
  private disposed = false;

  constructor(
    private readonly editor: LexicalEditor,
    readonly rootElement: HTMLElement,
    private readonly options: PagesLayoutOptions,
  ) {
    const host = getParentElement(rootElement);
    const doc = rootElement.ownerDocument;
    const win = doc.defaultView;
    if (!isHTMLElement(host) || win === null) {
      throw new Error(
        'PagesLayout: the editor root must have a parent element',
      );
    }
    this.win = win as Window & typeof globalThis;
    this.host = host;
    this.gap = options.gap;
    const createDiv = (className: string) => {
      const el = doc.createElement('div');
      el.className = className;
      return el;
    };
    this.layer = createDiv(CSS.layer);
    this.layer.setAttribute('aria-hidden', 'true');
    this.firstHeader = this.createSlot('header', 0);
    this.firstHeader.classList.add(CSS.headerFirst);
    this.lastFooter = this.createSlot('footer', 0);
    this.lastFooter.classList.add(CSS.footerLast);
    this.parking = createDiv(CSS.parking);
    this.layer.append(this.firstHeader, this.lastFooter, this.parking);
    host.classList.add(CSS.host);
    host.insertBefore(this.layer, rootElement);

    const observers: ResizeObserver[] = [];
    const Observer = this.win.ResizeObserver;
    if (typeof Observer !== 'undefined') {
      const rootObserver = new Observer(() => this.measure());
      rootObserver.observe(rootElement);
      observers.push(rootObserver);
      const viewport = getParentElement(host);
      if (isHTMLElement(viewport)) {
        const viewportObserver = new Observer(() => this.measureZoom());
        viewportObserver.observe(viewport);
        observers.push(viewportObserver);
      }
    }
    this.cleanup = mergeRegister(
      () => observers.forEach(observer => observer.disconnect()),
      editor.registerMutationListener(PageBreakNode, mutations => {
        for (const [key, mutation] of mutations) {
          if (mutation === 'destroyed') {
            this.pageBreakKeys.delete(key);
          } else {
            this.pageBreakKeys.add(key);
          }
        }
        this.resetGuard();
        this.scheduleMeasure();
      }),
      editor.registerUpdateListener(({dirtyElements, dirtyLeaves}) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
          return;
        }
        // An edit is a new situation for the settle guard: a page count
        // pinned (or given up on) for the previous content must not
        // outlive the content that caused it.
        this.resetGuard();
        // A manual page break can move without the root changing height
        // (text edited above it), which the ResizeObserver cannot see.
        if (this.pageBreakKeys.size > 0) {
          this.scheduleMeasure();
        }
      }),
    );
  }

  getPageCount(): number {
    return this.pageCount;
  }

  getGeometry(): PageGeometry | null {
    return this.geom;
  }

  /** Apply a new page setup; geometry is rewritten on the next frame. */
  setPageSetup(pageSetup: PageSetup): void {
    this.pageSetup = pageSetup;
    this.resetGuard();
    this.recomputeGeometry();
  }

  /**
   * Heights of the header and footer content per variant (measured by
   * whoever renders it). Each page's bands take the height of the variant
   * that page shows. Clamped so a runaway header cannot eat the page.
   */
  setSlotHeights(heights: SlotHeights): void {
    const max =
      this.geom !== null
        ? this.geom.pageHeight * MAX_SLOT_HEIGHT_RATIO
        : Number.POSITIVE_INFINITY;
    const clamp = (values: SlotHeights['header']) =>
      Object.fromEntries(
        Object.entries(values).map(([variant, height]) => [
          variant,
          Math.min(max, Math.max(0, height ?? 0)),
        ]),
      ) as SlotHeights['header'];
    const next: SlotHeights = {
      footer: clamp(heights.footer),
      header: clamp(heights.header),
    };
    if (JSON.stringify(next) === JSON.stringify(this.slotHeights)) {
      return;
    }
    this.slotHeights = next;
    this.resetGuard();
    this.recomputeGeometry();
  }

  /**
   * Apply pending writes now and measure synchronously until stable. Only
   * for moments when the next frame is too late, such as `beforeprint`.
   */
  flush(): void {
    for (let pass = 0; pass < 4 && !this.disposed; pass++) {
      if (this.writeRafId !== null) {
        this.win.cancelAnimationFrame(this.writeRafId);
        this.writeRafId = null;
      }
      this.measureRafIds.forEach(id => this.win.cancelAnimationFrame(id));
      this.measureRafIds = [];
      const queued = this.pendingWrites;
      this.pendingWrites = [];
      for (const write of queued) {
        write();
      }
      this.measure();
      if (this.pendingWrites.length === 0) {
        break;
      }
    }
  }

  /** Install the object that renders slot content, then fill every slot. */
  setSlotProvider(provider: PagesLayoutSlotProvider | null): void {
    this.slotProvider = provider;
    this.refreshSlots();
  }

  /** The header/footer slot element of a page, if that page exists. */
  getSlot(kind: PageSlotKind, pageIndex: number): HTMLElement | null {
    let found: HTMLElement | null = null;
    this.forEachSlot((slot, slotKind, slotPageIndex) => {
      if (slotKind === kind && slotPageIndex === pageIndex) {
        found = slot;
      }
    });
    return found;
  }

  /** Re-fill every header/footer slot (after slot content changed). */
  refreshSlots(kind?: PageSlotKind): void {
    this.forEachSlot((slot, slotKind, pageIndex) => {
      if (kind === undefined || kind === slotKind) {
        this.fillSlot(slot, slotKind, pageIndex);
      }
    });
    this.scheduleMeasure();
  }

  forEachSlot(
    fn: (slot: HTMLElement, kind: PageSlotKind, pageIndex: number) => void,
  ): void {
    fn(this.firstHeader, 'header', 0);
    this.breaks.forEach(({footerBand, headerBand}, i) => {
      fn(footerBand.firstElementChild as HTMLElement, 'footer', i);
      fn(headerBand.firstElementChild as HTMLElement, 'header', i + 1);
    });
    fn(this.lastFooter, 'footer', this.pageCount - 1);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.writeRafId !== null) {
      this.win.cancelAnimationFrame(this.writeRafId);
    }
    this.measureRafIds.forEach(id => this.win.cancelAnimationFrame(id));
    this.cleanup();
    for (const key of this.pageBreakKeys) {
      const el = this.editor.getElementByKey(key);
      if (el) {
        el.style.removeProperty('margin-bottom');
        delete el.dataset.pageBreakMargin;
      }
    }
    for (const el of this.keptTogether) {
      el.removeAttribute(KEEP_TOGETHER_ATTRIBUTE);
    }
    this.keptTogether.clear();
    this.layer.remove();
    this.host.classList.remove(CSS.host);
    this.host.style.removeProperty('min-height');
    this.rootElement.style.removeProperty('min-height');
    for (const prop of HOST_VARS) {
      this.host.style.removeProperty(prop);
    }
    this.options.onPageCountChange?.(1);
  }

  // ---- read phase -------------------------------------------------------

  /**
   * Read the root's extent and every manual page break's position, then
   * queue whatever writes are needed. Called from the ResizeObserver, i.e.
   * after layout, so these reads never force a synchronous layout.
   */
  measure(): void {
    const geom = this.geom;
    if (this.disposed || geom === null) {
      return;
    }
    const root = this.rootElement;
    const rootTop = root.offsetTop;
    const writes: (() => void)[] = [];
    let count = computePageCount(
      rootTop + root.offsetHeight,
      geom,
      this.breaks.length,
    );
    if (this.pinnedCount !== null) {
      count = this.pinnedCount;
    }
    if (count !== this.pageCount) {
      writes.push(() => this.applyPageCount(count));
    }
    for (const key of this.pageBreakKeys) {
      const el = this.editor.getElementByKey(key);
      if (!el) {
        continue;
      }
      const current = parseFloat(el.dataset.pageBreakMargin ?? '') || 0;
      if (getParentElement(el) !== root) {
        // Only top-level page breaks are stretched.
        if (current !== 0) {
          writes.push(() => {
            el.style.removeProperty('margin-bottom');
            delete el.dataset.pageBreakMargin;
          });
        }
        continue;
      }
      // A break with nothing after it starts no page: its margin would
      // collapse through the root unseen on screen, yet print a blank page.
      // (Asked of the document: the DOM ends in a decorator boundary.)
      const isLast = this.editor.read(
        'latest',
        () => $getNodeByKey(key)?.getNextSibling() === null,
      );
      const marginBottom = isLast
        ? 0
        : computePageBreakMarginBottom(
            rootTop + el.offsetTop,
            el.offsetHeight,
            geom,
          );
      if (Math.abs(marginBottom - current) > MARGIN_EPSILON) {
        writes.push(() => {
          el.dataset.pageBreakMargin = String(marginBottom);
          if (marginBottom > 0) {
            // The next page top is one gap closer when the gap collapses
            // for print, so express the margin relative to the gap.
            el.style.marginBottom = `calc(${marginBottom - geom.gap}px + var(--page-gap))`;
          } else {
            el.style.removeProperty('margin-bottom');
          }
        });
      }
    }
    this.measureBlankSoftLines(geom, rootTop, writes);
    if (writes.length > 0) {
      this.scheduleWrites(writes);
    }
  }

  /**
   * A line holding nothing but a line break has no width, and every engine
   * fits a zero-width line beside a full-width float: a blank soft line
   * that reaches a band is drawn inside it, past the right margin, and the
   * caret with it. No style on the `<br>` changes that in WebKit or
   * Firefox, so the block holding it is marked to move whole past the band
   * (as an empty paragraph does in CSS), if it fits on a page. A block
   * taller than a page is left to split: moved whole it could only fit by
   * scrolling, hiding lines on screen and cutting them from print.
   *
   * Only the block straddling each band is inspected, found by a binary
   * search of the root's children. Marks stay while they apply, so a block
   * that moved does not move back and forth.
   */
  private measureBlankSoftLines(
    geom: PageGeometry,
    rootTop: number,
    writes: (() => void)[],
  ): void {
    const root = this.rootElement;
    const fitsOnPage = (el: HTMLElement) =>
      el.offsetHeight <=
      pageContentHeight(geom, pageIndexAtY(rootTop + el.offsetTop, geom));
    for (const el of this.keptTogether) {
      if (
        !el.isConnected ||
        getParentElement(el) !== root ||
        !el.matches(BLANK_SOFT_LINE_BLOCK) ||
        !fitsOnPage(el)
      ) {
        writes.push(() => {
          el.removeAttribute(KEEP_TOGETHER_ATTRIBUTE);
          this.keptTogether.delete(el);
        });
      }
    }
    const children = root.children;
    for (let k = 0; k < this.breaks.length; k++) {
      const bandTop = pageContentTop(k, geom) + pageContentHeight(geom, k);
      const bandBottom = pageContentTop(k + 1, geom);
      let lo = 0;
      let hi = children.length - 1;
      let block: HTMLElement | null = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const child = children[mid];
        if (!isHTMLElement(child)) {
          break;
        }
        const top = rootTop + child.offsetTop;
        if (top + child.offsetHeight <= bandTop) {
          lo = mid + 1;
        } else if (top >= bandBottom) {
          hi = mid - 1;
        } else {
          block = child;
          break;
        }
      }
      if (
        block === null ||
        this.keptTogether.has(block) ||
        !block.matches(BLANK_SOFT_LINE_BLOCK) ||
        block.offsetHeight > pageContentHeight(geom, k + 1)
      ) {
        continue;
      }
      const right = block.getBoundingClientRect().right;
      const beside = Array.from(block.querySelectorAll(':scope > br')).some(
        br => br.getBoundingClientRect().left > right + 0.5,
      );
      if (beside) {
        const el = block;
        writes.push(() => {
          el.setAttribute(KEEP_TOGETHER_ATTRIBUTE, 'true');
          this.keptTogether.add(el);
        });
      }
    }
  }

  private measureZoom(): void {
    if (this.disposed || this.geom === null) {
      return;
    }
    const viewport = getParentElement(this.host);
    if (!isHTMLElement(viewport)) {
      return;
    }
    const zoom = computeZoom(viewport.clientWidth - 2, this.geom.pageWidth);
    if (zoom !== this.zoom) {
      // A resize is outside input, like an edit: whatever the settle guard
      // decided about the previous size does not apply to this one.
      this.resetGuard();
      this.scheduleWrites([
        () => {
          // Record the zoom only once it is written: a write that never
          // lands must leave the next measurement free to try again.
          this.zoom = zoom;
          this.host.style.setProperty('--page-zoom', String(zoom));
        },
      ]);
    }
  }

  // ---- write phase ------------------------------------------------------

  private recomputeGeometry(): void {
    if (this.pageSetup === null) {
      return;
    }
    this.geom = computeGeometry(
      this.pageSetup,
      0,
      0,
      this.gap,
      this.slotHeights,
    );
    this.scheduleWrites([() => this.writeGeometry()]);
  }

  private writeGeometry(): void {
    const geom = this.geom;
    if (geom === null) {
      return;
    }
    const style = this.host.style;
    const px = (n: number) => `${n}px`;
    style.setProperty('--page-width', px(geom.pageWidth));
    style.setProperty('--page-height', px(geom.pageHeight));
    style.setProperty('--page-margin-top', px(geom.marginTop));
    style.setProperty('--page-margin-right', px(geom.marginRight));
    style.setProperty('--page-margin-bottom', px(geom.marginBottom));
    style.setProperty('--page-margin-left', px(geom.marginLeft));
    style.setProperty('--page-header-height', px(geom.headerHeight));
    style.setProperty('--page-footer-height', px(geom.footerHeight));
    style.setProperty('--page-gap', px(geom.gap));
    style.setProperty('--page-content-height', px(geom.contentHeight));

    style.setProperty('--page-first-top', px(geom.firstTop));
    style.setProperty('--page-count', String(this.pageCount));
    style.setProperty('--page-zoom', String(this.zoom));
    this.applyPageSizes();
    // Width and zoom changed, so re-derive the fit on the next frame.
    this.measureRafIds.push(
      this.win.requestAnimationFrame(() => this.measureZoom()),
    );
  }

  private applyPageCount(count: number): void {
    this.recentCounts.push(count);
    if (this.recentCounts.length > 4) {
      this.recentCounts.shift();
    }
    const [a, b, c, d] = this.recentCounts;
    if (
      this.recentCounts.length === 4 &&
      a !== b &&
      a === c &&
      b === d &&
      this.pinnedCount === null
    ) {
      // Adding a break pushes content past the next boundary and removing it
      // pulls it back: settle on the larger count.
      this.pinnedCount = Math.max(a, b);
      count = this.pinnedCount;
      if (import.meta.env?.DEV) {
        console.warn(
          `PagesLayout: page count oscillated between ${a} and ${b}; pinned to ${count}`,
        );
      }
    }
    const doc = this.rootElement.ownerDocument;
    while (this.breaks.length < count - 1) {
      const pageIndex = this.breaks.length + 1;
      const spacer = doc.createElement('div');
      spacer.className = CSS.spacer;
      const footerBand = doc.createElement('div');
      footerBand.className = CSS.break;
      footerBand.dataset.pageIndex = String(pageIndex);
      footerBand.appendChild(this.createSlot('footer', pageIndex - 1));
      const gap = doc.createElement('div');
      gap.className = CSS.gap;
      const headerBand = doc.createElement('div');
      headerBand.className = CSS.breakHeader;
      headerBand.appendChild(this.createSlot('header', pageIndex));
      for (const el of [spacer, footerBand, gap, headerBand]) {
        this.layer.insertBefore(el, this.lastFooter);
      }
      this.breaks.push({footerBand, gap, headerBand, spacer});
    }
    const removed: PageBreakElements[] = [];
    while (this.breaks.length > Math.max(0, count - 1)) {
      removed.push(this.breaks.pop()!);
    }
    this.pageCount = count;
    this.host.style.setProperty('--page-count', String(count));
    this.lastFooter.dataset.pageIndex = String(count - 1);
    // Released once the new page structure is in place, so the provider
    // can move what lives in these slots to the pages that remain.
    for (const {footerBand, headerBand} of removed) {
      for (const band of [footerBand, headerBand]) {
        const slot = band.firstElementChild;
        if (isHTMLElement(slot)) {
          this.slotProvider?.releaseSlot(slot);
        }
      }
    }
    for (const {footerBand, gap, headerBand, spacer} of removed) {
      for (const el of [spacer, footerBand, gap, headerBand]) {
        el.remove();
      }
    }
    this.applyPageSizes();
    // Every slot may show the page count, so refill them all.
    this.forEachSlot((slot, kind, pageIndex) =>
      this.fillSlot(slot, kind, pageIndex),
    );
    this.options.onPageCountChange?.(count);
  }

  /**
   * Size every spacer and band for the page it belongs to. Pages showing
   * different header/footer variants have different band heights, so these
   * are inline per element rather than shared custom properties. Anything
   * that spans gaps is written relative to `--page-gap`, so the print
   * stylesheet can collapse the gaps without JavaScript.
   */
  private applyPageSizes(): void {
    const geom = this.geom;
    if (geom === null) {
      return;
    }
    const px = (n: number) => `${n}px`;
    const withGaps = (value: number, gaps: number) =>
      gaps > 0
        ? `calc(${value - gaps * geom.gap}px + ${gaps} * var(--page-gap))`
        : px(value);
    this.firstHeader.style.height = px(
      geom.marginTop + slotHeight(geom, 'header', 0),
    );
    this.breaks.forEach(({spacer, footerBand, headerBand}, i) => {
      spacer.style.height = px(pageContentHeight(geom, i));
      footerBand.style.height = px(
        slotHeight(geom, 'footer', i) + geom.marginBottom,
      );
      headerBand.style.height = px(
        geom.marginTop + slotHeight(geom, 'header', i + 1),
      );
    });
    const last = this.pageCount - 1;
    const lastContentTop = pageContentTop(last, geom);
    const lastContentBottom = lastContentTop + pageContentHeight(geom, last);
    this.lastFooter.style.top = withGaps(lastContentBottom, last);
    this.lastFooter.style.height = px(
      slotHeight(geom, 'footer', last) + geom.marginBottom,
    );
    this.host.style.minHeight = withGaps(
      lastContentBottom + slotHeight(geom, 'footer', last) + geom.marginBottom,
      last,
    );
    this.rootElement.style.minHeight = px(pageContentHeight(geom, 0));
  }

  private scheduleWrites(writes: (() => void)[]): void {
    this.pendingWrites.push(...writes);
    if (this.writeRafId !== null) {
      return;
    }
    this.writeRafId = this.win.requestAnimationFrame(() => {
      this.writeRafId = null;
      const queued = this.pendingWrites;
      this.pendingWrites = [];
      if (this.disposed) {
        return;
      }
      const now = this.win.performance.now();
      if (now - this.lastPassAt > BURST_WINDOW_MS) {
        this.passes = 0;
      }
      this.lastPassAt = now;
      if (++this.passes > MAX_PASSES_PER_BURST) {
        if (import.meta.env?.DEV) {
          console.warn(
            'PagesLayout: layout did not settle; waiting for the next edit',
          );
        }
        this.dropped = true;
        return;
      }
      for (const write of queued) {
        write();
      }
      // Writes that do not change the root's height (a narrower content area
      // with the same line count, a page-break margin) leave the observer
      // silent, so always follow a write with a measurement.
      this.scheduleMeasure();
    });
  }

  /**
   * Measure on a later frame. Two frames, so the browser has laid out the
   * pending DOM changes for paint and the reads do not force a layout.
   */
  private scheduleMeasure(): void {
    if (this.disposed || this.measureRafIds.length > 0) {
      return;
    }
    const outer = this.win.requestAnimationFrame(() => {
      const inner = this.win.requestAnimationFrame(() => {
        this.measureRafIds = [];
        this.measure();
      });
      this.measureRafIds = [inner];
    });
    this.measureRafIds = [outer];
  }

  private resetGuard(): void {
    this.passes = 0;
    this.pinnedCount = null;
    this.recentCounts = [];
    if (this.dropped) {
      // The last burst gave up with writes pending; this new input is the
      // next chance to finish the layout, whether or not it changes the
      // root's height (which is all the ResizeObserver would notice).
      this.dropped = false;
      this.scheduleMeasure();
    }
  }

  // ---- slots ------------------------------------------------------------

  private createSlot(kind: PageSlotKind, pageIndex: number): HTMLElement {
    const doc = this.rootElement.ownerDocument;
    const slot = doc.createElement('div');
    slot.className = kind === 'header' ? CSS.header : CSS.footer;
    slot.dataset.pageSlot = kind;
    slot.dataset.pageIndex = String(pageIndex);
    const content = doc.createElement('div');
    content.className = CSS.slotContent;
    slot.appendChild(content);
    this.fillSlot(slot, kind, pageIndex);
    return slot;
  }

  private fillSlot(
    slot: HTMLElement,
    kind: PageSlotKind,
    pageIndex: number,
  ): void {
    slot.dataset.pageIndex = String(pageIndex);
    this.slotProvider?.fillSlot(slot, kind, pageIndex);
  }
}
