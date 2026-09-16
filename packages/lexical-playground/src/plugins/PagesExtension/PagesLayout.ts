/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageGeometry, PageSetup, PageSlotKind} from './types';

import {
  getParentElement,
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
} from './layoutMath';

/**
 * Supplies the content of header/footer slots. The layout only knows about
 * slot elements and page indices; what goes inside them is somebody else's
 * business (see `HeaderFooterSession`).
 */
export interface PagesLayoutSlotProvider {
  fillSlot(slot: HTMLElement, kind: PageSlotKind, pageIndex: number): void;
}

export interface PagesLayoutOptions {
  gap: number;
  onPageCountChange?: (pageCount: number) => void;
  slotProvider?: PagesLayoutSlotProvider;
}

/** Writes per settle window before the layout stops chasing itself. */
const MAX_PASSES_PER_BURST = 8;
/** Idle time after which the pass counter resets. */
const BURST_WINDOW_MS = 250;
/** Ignore sub-pixel jitter when deciding whether to rewrite a margin. */
const MARGIN_EPSILON = 0.5;

const CSS = {
  break: 'Pages__break',
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
  '--page-break-height',
  '--page-first-top',
  '--page-count',
  '--page-zoom',
];

interface PageBreakElements {
  spacer: HTMLElement;
  brk: HTMLElement;
}

/**
 * Renders a paginated view of a flat document without touching the document.
 *
 * The editor root's parent becomes the "host" (a block formatting context).
 * A `Pages__layer` is inserted before the root holding, for every page
 * boundary, a zero-width `Pages__spacer` float as tall as a page's content
 * area followed by a full-width `Pages__break` float (footer, gap, header of
 * the next page). Because the layer is not a formatting context of its own,
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
  readonly host: HTMLElement;
  readonly layer: HTMLElement;
  readonly parking: HTMLElement;
  private readonly firstHeader: HTMLElement;
  private readonly lastFooter: HTMLElement;
  private readonly breaks: PageBreakElements[] = [];
  private readonly pageBreakKeys = new Set<NodeKey>();
  private readonly cleanup: () => void;
  private geom: PageGeometry | null = null;
  private pageSetup: PageSetup | null = null;
  private headerHeight = 0;
  private footerHeight = 0;
  private pageCount = 1;
  private zoom = 1;
  private pendingWrites: (() => void)[] = [];
  private writeRafId: number | null = null;
  private measureRafIds: number[] = [];
  private passes = 0;
  private lastPassAt = 0;
  private recentCounts: number[] = [];
  private pinnedCount: number | null = null;
  private disposed = false;

  constructor(
    private readonly editor: LexicalEditor,
    private readonly rootElement: HTMLElement,
    private readonly options: PagesLayoutOptions,
  ) {
    const host = getParentElement(rootElement);
    if (!(host instanceof HTMLElement)) {
      throw new Error(
        'PagesLayout: the editor root must have a parent element',
      );
    }
    this.host = host;
    const doc = rootElement.ownerDocument;
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
    if (typeof ResizeObserver !== 'undefined') {
      const rootObserver = new ResizeObserver(() => this.measure());
      rootObserver.observe(rootElement);
      const slotObserver = new ResizeObserver(() => this.measureSlots());
      slotObserver.observe(this.slotContent(this.firstHeader));
      slotObserver.observe(this.slotContent(this.lastFooter));
      observers.push(rootObserver, slotObserver);
      const viewport = getParentElement(host);
      if (viewport instanceof HTMLElement) {
        const viewportObserver = new ResizeObserver(() => this.measureZoom());
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
        // A manual page break can move without the root changing height
        // (text edited above it), which the ResizeObserver cannot see.
        if (
          this.pageBreakKeys.size > 0 &&
          (dirtyElements.size > 0 || dirtyLeaves.size > 0)
        ) {
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
    this.breaks.forEach(({brk}, i) => {
      const [footer, , header] = brk.children as unknown as HTMLElement[];
      fn(footer, 'footer', i);
      fn(header, 'header', i + 1);
    });
    fn(this.lastFooter, 'footer', this.pageCount - 1);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.writeRafId !== null) {
      cancelAnimationFrame(this.writeRafId);
    }
    this.measureRafIds.forEach(id => cancelAnimationFrame(id));
    this.cleanup();
    for (const key of this.pageBreakKeys) {
      const el = this.editor.getElementByKey(key);
      if (el) {
        el.style.removeProperty('margin-bottom');
      }
    }
    this.layer.remove();
    this.host.classList.remove(CSS.host);
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
    let count = computePageCount(rootTop + root.offsetHeight, geom);
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
      const current = parseFloat(el.style.marginBottom) || 0;
      if (getParentElement(el) !== root) {
        // Only top-level page breaks are stretched.
        if (current !== 0) {
          writes.push(() => el.style.removeProperty('margin-bottom'));
        }
        continue;
      }
      const marginBottom = computePageBreakMarginBottom(
        rootTop + el.offsetTop,
        el.offsetHeight,
        geom,
      );
      if (Math.abs(marginBottom - current) > MARGIN_EPSILON) {
        writes.push(() => {
          if (marginBottom > 0) {
            el.style.marginBottom = `${marginBottom}px`;
          } else {
            el.style.removeProperty('margin-bottom');
          }
        });
      }
    }
    if (writes.length > 0) {
      this.scheduleWrites(writes);
    }
  }

  private measureSlots(): void {
    if (this.disposed || this.geom === null) {
      return;
    }
    const max = this.geom.pageHeight * MAX_SLOT_HEIGHT_RATIO;
    const headerHeight = Math.min(
      max,
      this.slotContent(this.firstHeader).offsetHeight,
    );
    const footerHeight = Math.min(
      max,
      this.slotContent(this.lastFooter).offsetHeight,
    );
    if (
      headerHeight !== this.headerHeight ||
      footerHeight !== this.footerHeight
    ) {
      this.headerHeight = headerHeight;
      this.footerHeight = footerHeight;
      this.resetGuard();
      this.recomputeGeometry();
    }
  }

  private measureZoom(): void {
    if (this.disposed || this.geom === null) {
      return;
    }
    const viewport = getParentElement(this.host);
    if (!(viewport instanceof HTMLElement)) {
      return;
    }
    const zoom = computeZoom(viewport.clientWidth - 2, this.geom.pageWidth);
    if (zoom !== this.zoom) {
      this.zoom = zoom;
      this.scheduleWrites([
        () => this.host.style.setProperty('--page-zoom', String(zoom)),
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
      this.headerHeight,
      this.footerHeight,
      this.options.gap,
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
    style.setProperty('--page-break-height', px(geom.breakHeight));
    style.setProperty('--page-first-top', px(geom.firstTop));
    style.setProperty('--page-count', String(this.pageCount));
    style.setProperty('--page-zoom', String(this.zoom));
    this.layer.style.counterReset = `lexical-page 1 lexical-pages ${this.pageCount}`;
    // Width and zoom changed, so re-derive the fit on the next frame.
    this.measureRafIds.push(requestAnimationFrame(() => this.measureZoom()));
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
    while (this.breaks.length < count - 1) {
      const pageIndex = this.breaks.length + 1;
      const spacer = this.rootElement.ownerDocument.createElement('div');
      spacer.className = CSS.spacer;
      const brk = this.rootElement.ownerDocument.createElement('div');
      brk.className = CSS.break;
      brk.dataset.pageIndex = String(pageIndex);
      const gap = this.rootElement.ownerDocument.createElement('div');
      gap.className = CSS.gap;
      brk.append(
        this.createSlot('footer', pageIndex - 1),
        gap,
        this.createSlot('header', pageIndex),
      );
      this.layer.insertBefore(spacer, this.lastFooter);
      this.layer.insertBefore(brk, this.lastFooter);
      this.breaks.push({brk, spacer});
    }
    while (this.breaks.length > Math.max(0, count - 1)) {
      const {brk, spacer} = this.breaks.pop()!;
      brk.remove();
      spacer.remove();
    }
    this.pageCount = count;
    this.host.style.setProperty('--page-count', String(count));
    this.layer.style.counterReset = `lexical-page 1 lexical-pages ${count}`;
    this.lastFooter.dataset.pageIndex = String(count - 1);
    this.fillSlot(this.lastFooter, 'footer', count - 1);
    this.options.onPageCountChange?.(count);
  }

  private scheduleWrites(writes: (() => void)[]): void {
    this.pendingWrites.push(...writes);
    if (this.writeRafId !== null) {
      return;
    }
    this.writeRafId = requestAnimationFrame(() => {
      this.writeRafId = null;
      const queued = this.pendingWrites;
      this.pendingWrites = [];
      if (this.disposed) {
        return;
      }
      const now = performance.now();
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
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => {
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
    this.options.slotProvider?.fillSlot(slot, kind, pageIndex);
  }

  private slotContent(slot: HTMLElement): HTMLElement {
    return slot.firstElementChild as HTMLElement;
  }
}
