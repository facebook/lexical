'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.throwRetargetableDOMError = throwRetargetableDOMError;
exports.assertDone = assertDone;
exports.waitForSelectorTask = waitForSelectorTask;
exports.kUnableToAdoptErrorMessage =
  exports.InjectedScriptPollHandler =
  exports.ElementHandle =
  exports.FrameExecutionContext =
    void 0;

var mime = _interopRequireWildcard(require('mime'));

var injectedScriptSource = _interopRequireWildcard(
  require('../generated/injectedScriptSource'),
);

var _protocolError = require('./common/protocolError');

var js = _interopRequireWildcard(require('./javascript'));

var _progress = require('./progress');

function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}

function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return {default: obj};
  }
  var cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  var newObj = {};
  var hasPropertyDescriptor =
    Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor
        ? Object.getOwnPropertyDescriptor(obj, key)
        : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class FrameExecutionContext extends js.ExecutionContext {
  constructor(delegate, frame, world) {
    super(frame, delegate);
    this.frame = void 0;
    this._injectedScriptPromise = void 0;
    this.world = void 0;
    this.frame = frame;
    this.world = world;
  }

  async waitForSignalsCreatedBy(action) {
    return this.frame._page._frameManager.waitForSignalsCreatedBy(
      null,
      false,
      action,
    );
  }

  adoptIfNeeded(handle) {
    if (handle instanceof ElementHandle && handle._context !== this)
      return this.frame._page._delegate.adoptElementHandle(handle, this);
    return null;
  }

  async evaluate(pageFunction, arg) {
    return js.evaluate(
      this,
      true,
      /* returnByValue */
      pageFunction,
      arg,
    );
  }

  async evaluateHandle(pageFunction, arg) {
    return js.evaluate(
      this,
      false,
      /* returnByValue */
      pageFunction,
      arg,
    );
  }

  async evaluateExpression(expression, isFunction, arg) {
    return js.evaluateExpression(
      this,
      true,
      /* returnByValue */
      expression,
      isFunction,
      arg,
    );
  }

  async evaluateAndWaitForSignals(pageFunction, arg) {
    return await this.frame._page._frameManager.waitForSignalsCreatedBy(
      null,
      false,
      /* noWaitFor */
      async () => {
        return this.evaluate(pageFunction, arg);
      },
    );
  }

  async evaluateExpressionAndWaitForSignals(expression, isFunction, arg) {
    return await this.frame._page._frameManager.waitForSignalsCreatedBy(
      null,
      false,
      /* noWaitFor */
      async () => {
        return this.evaluateExpression(expression, isFunction, arg);
      },
    );
  }

  async evaluateExpressionHandleAndWaitForSignals(expression, isFunction, arg) {
    return await this.frame._page._frameManager.waitForSignalsCreatedBy(
      null,
      false,
      /* noWaitFor */
      async () => {
        return js.evaluateExpression(
          this,
          false,
          /* returnByValue */
          expression,
          isFunction,
          arg,
        );
      },
    );
  }

  createHandle(remoteObject) {
    if (this.frame._page._delegate.isElementHandle(remoteObject))
      return new ElementHandle(this, remoteObject.objectId);
    return super.createHandle(remoteObject);
  }

  injectedScript() {
    if (!this._injectedScriptPromise) {
      const custom = [];

      for (const [name, {source}] of this.frame._page.selectors._engines)
        custom.push(`{ name: '${name}', engine: (${source}) }`);

      const source = `
        (() => {
        ${injectedScriptSource.source}
        return new pwExport(
          ${this.frame._page._delegate.rafCountForStablePosition()},
          ${!!process.env.PWTEST_USE_TIMEOUT_FOR_RAF},
          "${this.frame._page._browserContext._browser.options.name}",
          [${custom.join(',\n')}]
        );
        })();
      `;
      this._injectedScriptPromise = this._delegate
        .rawEvaluateHandle(source)
        .then(
          (objectId) => new js.JSHandle(this, 'object', undefined, objectId),
        );
    }

    return this._injectedScriptPromise;
  }

  async doSlowMo() {
    return this.frame._page._doSlowMo();
  }
}

exports.FrameExecutionContext = FrameExecutionContext;

class ElementHandle extends js.JSHandle {
  constructor(context, objectId) {
    super(context, 'node', undefined, objectId);
    this._page = void 0;
    this._page = context.frame._page;

    this._initializePreview().catch((e) => {});
  }

  async _initializePreview() {
    const utility = await this._context.injectedScript();

    this._setPreview(
      await utility.evaluate(
        (injected, e) => 'JSHandle@' + injected.previewNode(e),
        this,
      ),
    );
  }

  asElement() {
    return this;
  }

  async _evaluateInMainAndWaitForSignals(pageFunction, arg) {
    const main = await this._context.frame._mainContext();
    return main.evaluateAndWaitForSignals(pageFunction, [
      await main.injectedScript(),
      this,
      arg,
    ]);
  }

  async evaluateInUtility(pageFunction, arg) {
    try {
      const utility = await this._context.frame._utilityContext();
      return await utility.evaluate(pageFunction, [
        await utility.injectedScript(),
        this,
        arg,
      ]);
    } catch (e) {
      if (
        js.isJavaScriptErrorInEvaluate(e) ||
        (0, _protocolError.isSessionClosedError)(e)
      )
        throw e;
      return 'error:notconnected';
    }
  }

  async evaluateHandleInUtility(pageFunction, arg) {
    try {
      const utility = await this._context.frame._utilityContext();
      return await utility.evaluateHandle(pageFunction, [
        await utility.injectedScript(),
        this,
        arg,
      ]);
    } catch (e) {
      if (
        js.isJavaScriptErrorInEvaluate(e) ||
        (0, _protocolError.isSessionClosedError)(e)
      )
        throw e;
      return 'error:notconnected';
    }
  }

  async ownerFrame() {
    const frameId = await this._page._delegate.getOwnerFrame(this);
    if (!frameId) return null;

    const frame = this._page._frameManager.frame(frameId);

    if (frame) return frame;

    for (const page of this._page._browserContext.pages()) {
      const frame = page._frameManager.frame(frameId);

      if (frame) return frame;
    }

    return null;
  }

  async contentFrame() {
    const isFrameElement = throwRetargetableDOMError(
      await this.evaluateInUtility(
        ([injected, node]) =>
          node && (node.nodeName === 'IFRAME' || node.nodeName === 'FRAME'),
        {},
      ),
    );
    if (!isFrameElement) return null;
    return this._page._delegate.getContentFrame(this);
  }

  async getAttribute(name) {
    return throwRetargetableDOMError(
      await this.evaluateInUtility(([injected, node, name]) => {
        if (node.nodeType !== Node.ELEMENT_NODE)
          throw injected.createStacklessError('Node is not an element');
        const element = node;
        return {
          value: element.getAttribute(name),
        };
      }, name),
    ).value;
  }

  async inputValue() {
    return throwRetargetableDOMError(
      await this.evaluateInUtility(([injected, node]) => {
        if (
          node.nodeType !== Node.ELEMENT_NODE ||
          (node.nodeName !== 'INPUT' &&
            node.nodeName !== 'TEXTAREA' &&
            node.nodeName !== 'SELECT')
        )
          throw injected.createStacklessError(
            'Node is not an <input>, <textarea> or <select> element',
          );
        const element = node;
        return {
          value: element.value,
        };
      }, undefined),
    ).value;
  }

  async textContent() {
    return throwRetargetableDOMError(
      await this.evaluateInUtility(([injected, node]) => {
        return {
          value: node.textContent,
        };
      }, undefined),
    ).value;
  }

  async innerText() {
    return throwRetargetableDOMError(
      await this.evaluateInUtility(([injected, node]) => {
        if (node.nodeType !== Node.ELEMENT_NODE)
          throw injected.createStacklessError('Node is not an element');
        if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml')
          throw injected.createStacklessError('Node is not an HTMLElement');
        const element = node;
        return {
          value: element.innerText,
        };
      }, undefined),
    ).value;
  }

  async innerHTML() {
    return throwRetargetableDOMError(
      await this.evaluateInUtility(([injected, node]) => {
        if (node.nodeType !== Node.ELEMENT_NODE)
          throw injected.createStacklessError('Node is not an element');
        const element = node;
        return {
          value: element.innerHTML,
        };
      }, undefined),
    ).value;
  }

  async dispatchEvent(type, eventInit = {}) {
    await this._evaluateInMainAndWaitForSignals(
      ([injected, node, {type, eventInit}]) =>
        injected.dispatchEvent(node, type, eventInit),
      {
        type,
        eventInit,
      },
    );
    await this._page._doSlowMo();
  }

  async _scrollRectIntoViewIfNeeded(rect) {
    return await this._page._delegate.scrollRectIntoViewIfNeeded(this, rect);
  }

  async _waitAndScrollIntoViewIfNeeded(progress) {
    while (progress.isRunning()) {
      assertDone(
        throwRetargetableDOMError(
          await this._waitForDisplayedAtStablePosition(
            progress,
            false,
            /* force */
            false,
            /* waitForEnabled */
          ),
        ),
      );
      progress.throwIfAborted(); // Avoid action that has side-effects.

      const result = throwRetargetableDOMError(
        await this._scrollRectIntoViewIfNeeded(),
      );
      if (result === 'error:notvisible') continue;
      assertDone(result);
      return;
    }
  }

  async scrollIntoViewIfNeeded(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(
      (progress) => this._waitAndScrollIntoViewIfNeeded(progress),
      this._page._timeoutSettings.timeout(options),
    );
  }

  async _clickablePoint() {
    const intersectQuadWithViewport = (quad) => {
      return quad.map((point) => ({
        x: Math.min(Math.max(point.x, 0), metrics.width),
        y: Math.min(Math.max(point.y, 0), metrics.height),
      }));
    };

    const computeQuadArea = (quad) => {
      // Compute sum of all directed areas of adjacent triangles
      // https://en.wikipedia.org/wiki/Polygon#Simple_polygons
      let area = 0;

      for (let i = 0; i < quad.length; ++i) {
        const p1 = quad[i];
        const p2 = quad[(i + 1) % quad.length];
        area += (p1.x * p2.y - p2.x * p1.y) / 2;
      }

      return Math.abs(area);
    };

    const [quads, metrics] = await Promise.all([
      this._page._delegate.getContentQuads(this),
      this._page
        .mainFrame()
        ._utilityContext()
        .then((utility) =>
          utility.evaluate(() => ({
            width: innerWidth,
            height: innerHeight,
          })),
        ),
    ]);
    if (!quads || !quads.length) return 'error:notvisible'; // Allow 1x1 elements. Compensate for rounding errors by comparing with 0.99 instead.

    const filtered = quads
      .map((quad) => intersectQuadWithViewport(quad))
      .filter((quad) => computeQuadArea(quad) > 0.99);
    if (!filtered.length) return 'error:notinviewport'; // Return the middle point of the first quad.

    const result = {
      x: 0,
      y: 0,
    };

    for (const point of filtered[0]) {
      result.x += point.x / 4;
      result.y += point.y / 4;
    }

    compensateHalfIntegerRoundingError(result);
    return result;
  }

  async _offsetPoint(offset) {
    const [box, border] = await Promise.all([
      this.boundingBox(),
      this.evaluateInUtility(
        ([injected, node]) => injected.getElementBorderWidth(node),
        {},
      ).catch((e) => {}),
    ]);
    if (!box || !border) return 'error:notvisible';
    if (border === 'error:notconnected') return border; // Make point relative to the padding box to align with offsetX/offsetY.

    return {
      x: box.x + border.left + offset.x,
      y: box.y + border.top + offset.y,
    };
  }

  async _retryPointerAction(
    progress,
    actionName,
    waitForEnabled,
    action,
    options,
  ) {
    let retry = 0; // We progressively wait longer between retries, up to 500ms.

    const waitTime = [0, 20, 100, 100, 500]; // By default, we scroll with protocol method to reveal the action point.
    // However, that might not work to scroll from under position:sticky elements
    // that overlay the target element. To fight this, we cycle through different
    // scroll alignments. This works in most scenarios.

    const scrollOptions = [
      undefined,
      {
        block: 'end',
        inline: 'end',
      },
      {
        block: 'center',
        inline: 'center',
      },
      {
        block: 'start',
        inline: 'start',
      },
    ];

    while (progress.isRunning()) {
      if (retry) {
        progress.log(
          `retrying ${actionName} action${
            options.trial ? ' (trial run)' : ''
          }, attempt #${retry}`,
        );
        const timeout = waitTime[Math.min(retry - 1, waitTime.length - 1)];

        if (timeout) {
          progress.log(`  waiting ${timeout}ms`);
          const result = await this.evaluateInUtility(
            ([injected, node, timeout]) =>
              new Promise((f) => setTimeout(f, timeout)),
            timeout,
          );
          if (result === 'error:notconnected') return result;
        }
      } else {
        progress.log(
          `attempting ${actionName} action${
            options.trial ? ' (trial run)' : ''
          }`,
        );
      }

      const forceScrollOptions = scrollOptions[retry % scrollOptions.length];
      const result = await this._performPointerAction(
        progress,
        actionName,
        waitForEnabled,
        action,
        forceScrollOptions,
        options,
      );
      ++retry;

      if (result === 'error:notvisible') {
        if (options.force) throw new Error('Element is not visible');
        progress.log('  element is not visible');
        continue;
      }

      if (result === 'error:notinviewport') {
        if (options.force)
          throw new Error('Element is outside of the viewport');
        progress.log('  element is outside of the viewport');
        continue;
      }

      if (typeof result === 'object' && 'hitTargetDescription' in result) {
        if (options.force)
          throw new Error(
            `Element does not receive pointer events, ${result.hitTargetDescription} intercepts them`,
          );
        progress.log(
          `  ${result.hitTargetDescription} intercepts pointer events`,
        );
        continue;
      }

      return result;
    }

    return 'done';
  }

  async _performPointerAction(
    progress,
    actionName,
    waitForEnabled,
    action,
    forceScrollOptions,
    options,
  ) {
    const {force = false, position} = options;
    if (options.__testHookBeforeStable) await options.__testHookBeforeStable();
    const result = await this._waitForDisplayedAtStablePosition(
      progress,
      force,
      waitForEnabled,
    );
    if (result !== 'done') return result;
    if (options.__testHookAfterStable) await options.__testHookAfterStable();
    progress.log('  scrolling into view if needed');
    progress.throwIfAborted(); // Avoid action that has side-effects.

    if (forceScrollOptions) {
      const scrolled = await this.evaluateInUtility(
        ([injected, node, options]) => {
          if (
            node.nodeType === 1
            /* Node.ELEMENT_NODE */
          )
            node.scrollIntoView(options);
        },
        forceScrollOptions,
      );
      if (scrolled === 'error:notconnected') return scrolled;
    } else {
      const scrolled = await this._scrollRectIntoViewIfNeeded(
        position
          ? {
              x: position.x,
              y: position.y,
              width: 0,
              height: 0,
            }
          : undefined,
      );
      if (scrolled !== 'done') return scrolled;
    }

    progress.log('  done scrolling');
    const maybePoint = position
      ? await this._offsetPoint(position)
      : await this._clickablePoint();
    if (typeof maybePoint === 'string') return maybePoint;
    const point = roundPoint(maybePoint);

    if (!force) {
      if (options.__testHookBeforeHitTarget)
        await options.__testHookBeforeHitTarget();
      progress.log(
        `  checking that element receives pointer events at (${point.x},${point.y})`,
      );
      const hitTargetResult = await this._checkHitTargetAt(point);
      if (hitTargetResult !== 'done') return hitTargetResult;
      progress.log(`  element does receive pointer events`);
    }

    progress.metadata.point = point;

    if (options.trial) {
      progress.log(`  trial ${actionName} has finished`);
      return 'done';
    }

    await progress.beforeInputAction(this);
    await this._page._frameManager.waitForSignalsCreatedBy(
      progress,
      options.noWaitAfter,
      async () => {
        if (options.__testHookBeforePointerAction)
          await options.__testHookBeforePointerAction();
        progress.throwIfAborted(); // Avoid action that has side-effects.

        let restoreModifiers;
        if (options && options.modifiers)
          restoreModifiers = await this._page.keyboard._ensureModifiers(
            options.modifiers,
          );
        progress.log(`  performing ${actionName} action`);
        await action(point);
        progress.log(`  ${actionName} action done`);
        progress.log('  waiting for scheduled navigations to finish');
        if (options.__testHookAfterPointerAction)
          await options.__testHookAfterPointerAction();
        if (restoreModifiers)
          await this._page.keyboard._ensureModifiers(restoreModifiers);
      },
      'input',
    );
    progress.log('  navigations have finished');
    return 'done';
  }

  async hover(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._hover(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  _hover(progress, options) {
    return this._retryPointerAction(
      progress,
      'hover',
      false,
      /* waitForEnabled */
      (point) => this._page.mouse.move(point.x, point.y),
      options,
    );
  }

  async click(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._click(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  _click(progress, options) {
    return this._retryPointerAction(
      progress,
      'click',
      true,
      /* waitForEnabled */
      (point) => this._page.mouse.click(point.x, point.y, options),
      options,
    );
  }

  async dblclick(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._dblclick(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  _dblclick(progress, options) {
    return this._retryPointerAction(
      progress,
      'dblclick',
      true,
      /* waitForEnabled */
      (point) => this._page.mouse.dblclick(point.x, point.y, options),
      options,
    );
  }

  async tap(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._tap(progress, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  _tap(progress, options) {
    return this._retryPointerAction(
      progress,
      'tap',
      true,
      /* waitForEnabled */
      (point) => this._page.touchscreen.tap(point.x, point.y),
      options,
    );
  }

  async selectOption(metadata, elements, values, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._selectOption(
        progress,
        elements,
        values,
        options,
      );
      return throwRetargetableDOMError(result);
    }, this._page._timeoutSettings.timeout(options));
  }

  async _selectOption(progress, elements, values, options) {
    const optionsToSelect = [...elements, ...values];
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(
      progress,
      options.noWaitAfter,
      async () => {
        progress.throwIfAborted(); // Avoid action that has side-effects.

        progress.log('  selecting specified option(s)');
        const poll = await this.evaluateHandleInUtility(
          ([injected, node, {optionsToSelect, force}]) => {
            return injected.waitForElementStatesAndPerformAction(
              node,
              ['visible', 'enabled'],
              force,
              injected.selectOptions.bind(injected, optionsToSelect),
            );
          },
          {
            optionsToSelect,
            force: options.force,
          },
        );
        if (poll === 'error:notconnected') return poll;
        const pollHandler = new InjectedScriptPollHandler(progress, poll);
        const result = await pollHandler.finish();
        await this._page._doSlowMo();
        return result;
      },
    );
  }

  async fill(metadata, value, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._fill(progress, value, options);
      assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async _fill(progress, value, options) {
    progress.log(`elementHandle.fill("${value}")`);
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(
      progress,
      options.noWaitAfter,
      async () => {
        progress.log(
          '  waiting for element to be visible, enabled and editable',
        );
        const poll = await this.evaluateHandleInUtility(
          ([injected, node, {value, force}]) => {
            return injected.waitForElementStatesAndPerformAction(
              node,
              ['visible', 'enabled', 'editable'],
              force,
              injected.fill.bind(injected, value),
            );
          },
          {
            value,
            force: options.force,
          },
        );
        if (poll === 'error:notconnected') return poll;
        const pollHandler = new InjectedScriptPollHandler(progress, poll);
        const filled = await pollHandler.finish();
        progress.throwIfAborted(); // Avoid action that has side-effects.

        if (filled === 'error:notconnected') return filled;
        progress.log('  element is visible, enabled and editable');

        if (filled === 'needsinput') {
          progress.throwIfAborted(); // Avoid action that has side-effects.

          if (value) await this._page.keyboard.insertText(value);
          else await this._page.keyboard.press('Delete');
        } else {
          assertDone(filled);
        }

        return 'done';
      },
      'input',
    );
  }

  async selectText(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      progress.throwIfAborted(); // Avoid action that has side-effects.

      const poll = await this.evaluateHandleInUtility(
        ([injected, node, force]) => {
          return injected.waitForElementStatesAndPerformAction(
            node,
            ['visible'],
            force,
            injected.selectText.bind(injected),
          );
        },
        options.force,
      );
      const pollHandler = new InjectedScriptPollHandler(
        progress,
        throwRetargetableDOMError(poll),
      );
      const result = await pollHandler.finish();
      assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async setInputFiles(metadata, files, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._setInputFiles(progress, files, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async _setInputFiles(progress, files, options) {
    for (const payload of files) {
      if (!payload.mimeType)
        payload.mimeType =
          mime.getType(payload.name) || 'application/octet-stream';
    }

    const retargeted = await this.evaluateHandleInUtility(
      ([injected, node, multiple]) => {
        const element = injected.retarget(node, 'follow-label');
        if (!element) return 'error:notconnected';
        if (element.tagName !== 'INPUT')
          throw injected.createStacklessError(
            'Node is not an HTMLInputElement',
          );
        if (multiple && !element.multiple)
          throw injected.createStacklessError(
            'Non-multiple file input can only accept single file',
          );
        return element;
      },
      files.length > 1,
    );
    if (retargeted === 'error:notconnected') return retargeted;
    if (!retargeted._objectId) return retargeted.rawValue();
    await progress.beforeInputAction(this);
    await this._page._frameManager.waitForSignalsCreatedBy(
      progress,
      options.noWaitAfter,
      async () => {
        progress.throwIfAborted(); // Avoid action that has side-effects.

        await this._page._delegate.setInputFiles(retargeted, files);
      },
    );
    await this._page._doSlowMo();
    return 'done';
  }

  async focus(metadata) {
    const controller = new _progress.ProgressController(metadata, this);
    await controller.run(async (progress) => {
      const result = await this._focus(progress);
      await this._page._doSlowMo();
      return assertDone(throwRetargetableDOMError(result));
    }, 0);
  }

  async _focus(progress, resetSelectionIfNotFocused) {
    progress.throwIfAborted(); // Avoid action that has side-effects.

    return await this.evaluateInUtility(
      ([injected, node, resetSelectionIfNotFocused]) =>
        injected.focusNode(node, resetSelectionIfNotFocused),
      resetSelectionIfNotFocused,
    );
  }

  async type(metadata, text, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._type(progress, text, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async _type(progress, text, options) {
    progress.log(`elementHandle.type("${text}")`);
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(
      progress,
      options.noWaitAfter,
      async () => {
        const result = await this._focus(
          progress,
          true,
          /* resetSelectionIfNotFocused */
        );
        if (result !== 'done') return result;
        progress.throwIfAborted(); // Avoid action that has side-effects.

        await this._page.keyboard.type(text, options);
        return 'done';
      },
      'input',
    );
  }

  async press(metadata, key, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._press(progress, key, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async _press(progress, key, options) {
    progress.log(`elementHandle.press("${key}")`);
    await progress.beforeInputAction(this);
    return this._page._frameManager.waitForSignalsCreatedBy(
      progress,
      options.noWaitAfter,
      async () => {
        const result = await this._focus(
          progress,
          true,
          /* resetSelectionIfNotFocused */
        );
        if (result !== 'done') return result;
        progress.throwIfAborted(); // Avoid action that has side-effects.

        await this._page.keyboard.press(key, options);
        return 'done';
      },
      'input',
    );
  }

  async check(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._setChecked(progress, true, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async uncheck(metadata, options) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      const result = await this._setChecked(progress, false, options);
      return assertDone(throwRetargetableDOMError(result));
    }, this._page._timeoutSettings.timeout(options));
  }

  async _setChecked(progress, state, options) {
    const isChecked = async () => {
      const result = await this.evaluateInUtility(
        ([injected, node]) => injected.elementState(node, 'checked'),
        {},
      );
      return throwRetargetableDOMError(result);
    };

    if ((await isChecked()) === state) return 'done';
    const result = await this._click(progress, options);
    if (result !== 'done') return result;
    if (options.trial) return 'done';
    if ((await isChecked()) !== state)
      throw new Error('Clicking the checkbox did not change its state');
    return 'done';
  }

  async boundingBox() {
    return this._page._delegate.getBoundingBox(this);
  }

  async screenshot(metadata, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(
      (progress) =>
        this._page._screenshotter.screenshotElement(progress, this, options),
      this._page._timeoutSettings.timeout(options),
    );
  }

  async querySelector(selector, options) {
    return this._page.selectors.query(
      this._context.frame,
      selector,
      options,
      this,
    );
  }

  async querySelectorAll(selector) {
    return this._page.selectors._queryAll(
      this._context.frame,
      selector,
      this,
      true,
      /* adoptToMain */
    );
  }

  async evalOnSelectorAndWaitForSignals(
    selector,
    strict,
    expression,
    isFunction,
    arg,
  ) {
    const handle = await this._page.selectors.query(
      this._context.frame,
      selector,
      {
        strict,
      },
      this,
    );
    if (!handle)
      throw new Error(
        `Error: failed to find element matching selector "${selector}"`,
      );
    const result = await handle.evaluateExpressionAndWaitForSignals(
      expression,
      isFunction,
      true,
      arg,
    );
    handle.dispose();
    return result;
  }

  async evalOnSelectorAllAndWaitForSignals(
    selector,
    expression,
    isFunction,
    arg,
  ) {
    const arrayHandle = await this._page.selectors._queryArray(
      this._context.frame,
      selector,
      this,
    );
    const result = await arrayHandle.evaluateExpressionAndWaitForSignals(
      expression,
      isFunction,
      true,
      arg,
    );
    arrayHandle.dispose();
    return result;
  }

  async isVisible() {
    const result = await this.evaluateInUtility(
      ([injected, node]) => injected.elementState(node, 'visible'),
      {},
    );
    if (result === 'error:notconnected') return false;
    return result;
  }

  async isHidden() {
    const result = await this.evaluateInUtility(
      ([injected, node]) => injected.elementState(node, 'hidden'),
      {},
    );
    return throwRetargetableDOMError(result);
  }

  async isEnabled() {
    const result = await this.evaluateInUtility(
      ([injected, node]) => injected.elementState(node, 'enabled'),
      {},
    );
    return throwRetargetableDOMError(result);
  }

  async isDisabled() {
    const result = await this.evaluateInUtility(
      ([injected, node]) => injected.elementState(node, 'disabled'),
      {},
    );
    return throwRetargetableDOMError(result);
  }

  async isEditable() {
    const result = await this.evaluateInUtility(
      ([injected, node]) => injected.elementState(node, 'editable'),
      {},
    );
    return throwRetargetableDOMError(result);
  }

  async isChecked() {
    const result = await this.evaluateInUtility(
      ([injected, node]) => injected.elementState(node, 'checked'),
      {},
    );
    return throwRetargetableDOMError(result);
  }

  async waitForElementState(metadata, state, options = {}) {
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      progress.log(`  waiting for element to be ${state}`);
      const poll = await this.evaluateHandleInUtility(
        ([injected, node, state]) => {
          return injected.waitForElementStatesAndPerformAction(
            node,
            [state],
            false,
            () => 'done',
          );
        },
        state,
      );
      const pollHandler = new InjectedScriptPollHandler(
        progress,
        throwRetargetableDOMError(poll),
      );
      assertDone(throwRetargetableDOMError(await pollHandler.finish()));
    }, this._page._timeoutSettings.timeout(options));
  }

  async waitForSelector(metadata, selector, options = {}) {
    const {state = 'visible'} = options;
    if (!['attached', 'detached', 'visible', 'hidden'].includes(state))
      throw new Error(
        `state: expected one of (attached|detached|visible|hidden)`,
      );

    const info = this._page.parseSelector(selector, options);

    const task = waitForSelectorTask(info, state, false, this);
    const controller = new _progress.ProgressController(metadata, this);
    return controller.run(async (progress) => {
      progress.log(
        `waiting for selector "${selector}"${
          state === 'attached' ? '' : ' to be ' + state
        }`,
      );
      const context = await this._context.frame._context(info.world);
      const injected = await context.injectedScript();
      const pollHandler = new InjectedScriptPollHandler(
        progress,
        await task(injected),
      );
      const result = await pollHandler.finishHandle();

      if (!result.asElement()) {
        result.dispose();
        return null;
      }

      const handle = result.asElement();
      return handle._adoptTo(await this._context.frame._mainContext());
    }, this._page._timeoutSettings.timeout(options));
  }

  async _adoptTo(context) {
    if (this._context !== context) {
      const adopted = await this._page._delegate.adoptElementHandle(
        this,
        context,
      );
      this.dispose();
      return adopted;
    }

    return this;
  }

  async _waitForDisplayedAtStablePosition(progress, force, waitForEnabled) {
    if (waitForEnabled)
      progress.log(`  waiting for element to be visible, enabled and stable`);
    else progress.log(`  waiting for element to be visible and stable`);
    const poll = await this.evaluateHandleInUtility(
      ([injected, node, {waitForEnabled, force}]) => {
        return injected.waitForElementStatesAndPerformAction(
          node,
          waitForEnabled
            ? ['visible', 'stable', 'enabled']
            : ['visible', 'stable'],
          force,
          () => 'done',
        );
      },
      {
        waitForEnabled,
        force,
      },
    );
    if (poll === 'error:notconnected') return poll;
    const pollHandler = new InjectedScriptPollHandler(progress, poll);
    const result = await pollHandler.finish();
    if (waitForEnabled)
      progress.log('  element is visible, enabled and stable');
    else progress.log('  element is visible and stable');
    return result;
  }

  async _checkHitTargetAt(point) {
    const frame = await this.ownerFrame();

    if (frame && frame.parentFrame()) {
      const element = await frame.frameElement();
      const box = await element.boundingBox();
      if (!box) return 'error:notconnected'; // Translate from viewport coordinates to frame coordinates.

      point = {
        x: point.x - box.x,
        y: point.y - box.y,
      };
    }

    return this.evaluateInUtility(
      ([injected, node, point]) => injected.checkHitTargetAt(node, point),
      point,
    );
  }
} // Handles an InjectedScriptPoll running in injected script:
// - streams logs into progress;
// - cancels the poll when progress cancels.

exports.ElementHandle = ElementHandle;

class InjectedScriptPollHandler {
  constructor(progress, poll) {
    this._progress = void 0;
    this._poll = void 0;
    this._progress = progress;
    this._poll = poll; // Ensure we cancel the poll before progress aborts and returns:
    //   - no unnecessary work in the page;
    //   - no possible side effects after progress promsie rejects.

    this._progress.cleanupWhenAborted(() => this.cancel());

    this._streamLogs();
  }

  async _streamLogs() {
    while (this._poll && this._progress.isRunning()) {
      const log = await this._poll
        .evaluate((poll) => poll.takeNextLogs())
        .catch((e) => []);
      if (!this._poll || !this._progress.isRunning()) return;

      for (const entry of log) this._progress.logEntry(entry);
    }
  }

  async finishHandle() {
    try {
      const result = await this._poll.evaluateHandle((poll) => poll.run());
      await this._finishInternal();
      return result;
    } finally {
      await this.cancel();
    }
  }

  async finish() {
    try {
      const result = await this._poll.evaluate((poll) => poll.run());
      await this._finishInternal();
      return result;
    } catch (e) {
      if (
        js.isJavaScriptErrorInEvaluate(e) ||
        (0, _protocolError.isSessionClosedError)(e)
      )
        throw e;
      return 'error:notconnected';
    } finally {
      await this.cancel();
    }
  }

  async _finishInternal() {
    if (!this._poll) return; // Retrieve all the logs before continuing.

    const log = await this._poll
      .evaluate((poll) => poll.takeLastLogs())
      .catch((e) => []);

    for (const entry of log) this._progress.logEntry(entry);
  }

  async cancel() {
    if (!this._poll) return;
    const copy = this._poll;
    this._poll = null;
    await copy.evaluate((p) => p.cancel()).catch((e) => {});
    copy.dispose();
  }
}

exports.InjectedScriptPollHandler = InjectedScriptPollHandler;

function throwRetargetableDOMError(result) {
  if (result === 'error:notconnected')
    throw new Error('Element is not attached to the DOM');
  return result;
}

function assertDone(result) {
  // This function converts 'done' to void and ensures typescript catches unhandled errors.
}

function roundPoint(point) {
  return {
    x: ((point.x * 100) | 0) / 100,
    y: ((point.y * 100) | 0) / 100,
  };
}

function compensateHalfIntegerRoundingError(point) {
  // Firefox internally uses integer coordinates, so 8.5 is converted to 9 when clicking.
  //
  // This does not work nicely for small elements. For example, 1x1 square with corners
  // (8;8) and (9;9) is targeted when clicking at (8;8) but not when clicking at (9;9).
  // So, clicking at (8.5;8.5) will effectively click at (9;9) and miss the target.
  //
  // Therefore, we skew half-integer values from the interval (8.49, 8.51) towards
  // (8.47, 8.49) that is rounded towards 8. This means clicking at (8.5;8.5) will
  // be replaced with (8.48;8.48) and will effectively click at (8;8).
  //
  // Other browsers use float coordinates, so this change should not matter.
  const remainderX = point.x - Math.floor(point.x);
  if (remainderX > 0.49 && remainderX < 0.51) point.x -= 0.02;
  const remainderY = point.y - Math.floor(point.y);
  if (remainderY > 0.49 && remainderY < 0.51) point.y -= 0.02;
}

function waitForSelectorTask(selector, state, omitReturnValue, root) {
  return (injectedScript) =>
    injectedScript.evaluateHandle(
      (injected, {parsed, strict, state, omitReturnValue, root}) => {
        let lastElement;
        return injected.pollRaf((progress, continuePolling) => {
          const elements = injected.querySelectorAll(parsed, root || document);
          let element = elements[0];
          const visible = element ? injected.isVisible(element) : false;

          if (lastElement !== element) {
            lastElement = element;

            if (!element) {
              progress.log(`  selector did not resolve to any element`);
            } else {
              if (elements.length > 1) {
                if (strict)
                  throw injected.strictModeViolationError(parsed, elements);
                progress.log(
                  `  selector resolved to ${elements.length} elements. Proceeding with the first one.`,
                );
              }

              progress.log(
                `  selector resolved to ${
                  visible ? 'visible' : 'hidden'
                } ${injected.previewNode(element)}`,
              );
            }
          }

          const hasElement = !!element;
          if (omitReturnValue) element = undefined;

          switch (state) {
            case 'attached':
              return hasElement ? element : continuePolling;

            case 'detached':
              return !hasElement ? undefined : continuePolling;

            case 'visible':
              return visible ? element : continuePolling;

            case 'hidden':
              return !visible ? undefined : continuePolling;
          }
        });
      },
      {
        parsed: selector.parsed,
        strict: selector.strict,
        state,
        omitReturnValue,
        root,
      },
    );
}

const kUnableToAdoptErrorMessage =
  'Unable to adopt element handle from a different document';
exports.kUnableToAdoptErrorMessage = kUnableToAdoptErrorMessage;
