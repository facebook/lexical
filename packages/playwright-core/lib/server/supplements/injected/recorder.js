"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Recorder = void 0;

var _selectorGenerator = require("../../injected/selectorGenerator");

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
class Recorder {
  constructor(injectedScript, params) {
    this._injectedScript = void 0;
    this._performingAction = false;
    this._outerGlassPaneElement = void 0;
    this._glassPaneShadow = void 0;
    this._innerGlassPaneElement = void 0;
    this._highlightElements = [];
    this._tooltipElement = void 0;
    this._listeners = [];
    this._hoveredModel = null;
    this._hoveredElement = null;
    this._activeModel = null;
    this._expectProgrammaticKeyUp = false;
    this._pollRecorderModeTimer = void 0;
    this._mode = 'none';
    this._actionPointElement = void 0;
    this._actionPoint = void 0;
    this._actionSelector = void 0;
    this._params = void 0;
    this._params = params;
    this._injectedScript = injectedScript;
    this._outerGlassPaneElement = document.createElement('x-pw-glass');
    this._outerGlassPaneElement.style.position = 'fixed';
    this._outerGlassPaneElement.style.top = '0';
    this._outerGlassPaneElement.style.right = '0';
    this._outerGlassPaneElement.style.bottom = '0';
    this._outerGlassPaneElement.style.left = '0';
    this._outerGlassPaneElement.style.zIndex = '2147483647';
    this._outerGlassPaneElement.style.pointerEvents = 'none';
    this._outerGlassPaneElement.style.display = 'flex';
    this._tooltipElement = document.createElement('x-pw-tooltip');
    this._actionPointElement = document.createElement('x-pw-action-point');

    this._actionPointElement.setAttribute('hidden', 'true');

    this._innerGlassPaneElement = document.createElement('x-pw-glass-inner');
    this._innerGlassPaneElement.style.flex = 'auto';

    this._innerGlassPaneElement.appendChild(this._tooltipElement); // Use a closed shadow root to prevent selectors matching our internal previews.


    this._glassPaneShadow = this._outerGlassPaneElement.attachShadow({
      mode: this._params.isUnderTest ? 'open' : 'closed'
    });

    this._glassPaneShadow.appendChild(this._innerGlassPaneElement);

    this._glassPaneShadow.appendChild(this._actionPointElement);

    const styleElement = document.createElement('style');
    styleElement.textContent = `
        x-pw-tooltip {
          align-items: center;
          backdrop-filter: blur(5px);
          background-color: rgba(0, 0, 0, 0.7);
          border-radius: 2px;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 3.6px 3.7px,
                      rgba(0, 0, 0, 0.15) 0px 12.1px 12.3px,
                      rgba(0, 0, 0, 0.1) 0px -2px 4px,
                      rgba(0, 0, 0, 0.15) 0px -12.1px 24px,
                      rgba(0, 0, 0, 0.25) 0px 54px 55px;
          color: rgb(204, 204, 204);
          display: none;
          font-family: 'Dank Mono', 'Operator Mono', Inconsolata, 'Fira Mono',
                       'SF Mono', Monaco, 'Droid Sans Mono', 'Source Code Pro', monospace;
          font-size: 12.8px;
          font-weight: normal;
          left: 0;
          line-height: 1.5;
          max-width: 600px;
          padding: 3.2px 5.12px 3.2px;
          position: absolute;
          top: 0;
        }
        x-pw-action-point {
          position: absolute;
          width: 20px;
          height: 20px;
          background: red;
          border-radius: 10px;
          pointer-events: none;
          margin: -10px 0 0 -10px;
          z-index: 2;
        }
        *[hidden] {
          display: none !important;
        }
    `;

    this._glassPaneShadow.appendChild(styleElement);

    this._refreshListenersIfNeeded();

    injectedScript.onGlobalListenersRemoved.add(() => this._refreshListenersIfNeeded());

    globalThis._playwrightRefreshOverlay = () => {
      this._pollRecorderMode().catch(e => console.log(e)); // eslint-disable-line no-console

    };

    globalThis._playwrightRefreshOverlay();

    if (params.isUnderTest) console.error('Recorder script ready for test');
  }

  _refreshListenersIfNeeded() {
    // Ensure we are attached to the current document, and we are on top (last element);
    if (this._outerGlassPaneElement.parentElement === document.documentElement && !this._outerGlassPaneElement.nextElementSibling) return;
    removeEventListeners(this._listeners);
    this._listeners = [addEventListener(document, 'click', event => this._onClick(event), true), addEventListener(document, 'auxclick', event => this._onClick(event), true), addEventListener(document, 'input', event => this._onInput(event), true), addEventListener(document, 'keydown', event => this._onKeyDown(event), true), addEventListener(document, 'keyup', event => this._onKeyUp(event), true), addEventListener(document, 'mousedown', event => this._onMouseDown(event), true), addEventListener(document, 'mouseup', event => this._onMouseUp(event), true), addEventListener(document, 'mousemove', event => this._onMouseMove(event), true), addEventListener(document, 'mouseleave', event => this._onMouseLeave(event), true), addEventListener(document, 'focus', () => this._onFocus(), true), addEventListener(document, 'scroll', () => {
      this._hoveredModel = null;
      this._actionPointElement.hidden = true;

      this._updateHighlight();
    }, true)];
    document.documentElement.appendChild(this._outerGlassPaneElement);
  }

  async _pollRecorderMode() {
    var _this$_hoveredModel;

    const pollPeriod = 1000;
    if (this._pollRecorderModeTimer) clearTimeout(this._pollRecorderModeTimer);
    const state = await globalThis._playwrightRecorderState().catch(e => null);

    if (!state) {
      this._pollRecorderModeTimer = setTimeout(() => this._pollRecorderMode(), pollPeriod);
      return;
    }

    const {
      mode,
      actionPoint,
      actionSelector
    } = state;

    if (mode !== this._mode) {
      this._mode = mode;

      this._clearHighlight();
    }

    if (actionPoint && this._actionPoint && actionPoint.x === this._actionPoint.x && actionPoint.y === this._actionPoint.y) {// All good.
    } else if (!actionPoint && !this._actionPoint) {// All good.
    } else {
      if (actionPoint) {
        this._actionPointElement.style.top = actionPoint.y + 'px';
        this._actionPointElement.style.left = actionPoint.x + 'px';
        this._actionPointElement.hidden = false;
      } else {
        this._actionPointElement.hidden = true;
      }

      this._actionPoint = actionPoint;
    } // Race or scroll.


    if (this._actionSelector && !((_this$_hoveredModel = this._hoveredModel) !== null && _this$_hoveredModel !== void 0 && _this$_hoveredModel.elements.length)) this._actionSelector = undefined;

    if (actionSelector !== this._actionSelector) {
      this._hoveredModel = actionSelector ? (0, _selectorGenerator.querySelector)(this._injectedScript, actionSelector, document) : null;

      this._updateHighlight();

      this._actionSelector = actionSelector;
    }

    this._pollRecorderModeTimer = setTimeout(() => this._pollRecorderMode(), pollPeriod);
  }

  _clearHighlight() {
    this._hoveredModel = null;
    this._activeModel = null;

    this._updateHighlight();
  }

  _actionInProgress(event) {
    // If Playwright is performing action for us, bail.
    if (this._performingAction) return true; // Consume as the first thing.

    consumeEvent(event);
    return false;
  }

  _consumedDueToNoModel(event, model) {
    if (model) return false;
    consumeEvent(event);
    return true;
  }

  _consumedDueWrongTarget(event) {
    if (this._activeModel && this._activeModel.elements[0] === this._deepEventTarget(event)) return false;
    consumeEvent(event);
    return true;
  }

  _onClick(event) {
    if (this._mode === 'inspecting') globalThis._playwrightRecorderSetSelector(this._hoveredModel ? this._hoveredModel.selector : '');
    if (this._shouldIgnoreMouseEvent(event)) return;
    if (this._actionInProgress(event)) return;
    if (this._consumedDueToNoModel(event, this._hoveredModel)) return;
    const checkbox = asCheckbox(this._deepEventTarget(event));

    if (checkbox) {
      // Interestingly, inputElement.checked is reversed inside this event handler.
      this._performAction({
        name: checkbox.checked ? 'check' : 'uncheck',
        selector: this._hoveredModel.selector,
        signals: []
      });

      return;
    }

    this._performAction({
      name: 'click',
      selector: this._hoveredModel.selector,
      position: positionForEvent(event),
      signals: [],
      button: buttonForEvent(event),
      modifiers: modifiersForEvent(event),
      clickCount: event.detail
    });
  }

  _shouldIgnoreMouseEvent(event) {
    const target = this._deepEventTarget(event);

    if (this._mode === 'none') return true;

    if (this._mode === 'inspecting') {
      consumeEvent(event);
      return true;
    }

    const nodeName = target.nodeName;
    if (nodeName === 'SELECT') return true;
    if (nodeName === 'INPUT' && ['date'].includes(target.type)) return true;
    return false;
  }

  _onMouseDown(event) {
    if (this._shouldIgnoreMouseEvent(event)) return;
    if (!this._performingAction) consumeEvent(event);
    this._activeModel = this._hoveredModel;
  }

  _onMouseUp(event) {
    if (this._shouldIgnoreMouseEvent(event)) return;
    if (!this._performingAction) consumeEvent(event);
  }

  _onMouseMove(event) {
    if (this._mode === 'none') return;

    const target = this._deepEventTarget(event);

    if (this._hoveredElement === target) return;
    this._hoveredElement = target;

    this._updateModelForHoveredElement();
  }

  _onMouseLeave(event) {
    // Leaving iframe.
    if (this._deepEventTarget(event).nodeType === Node.DOCUMENT_NODE) {
      this._hoveredElement = null;

      this._updateModelForHoveredElement();
    }
  }

  _onFocus() {
    const activeElement = this._deepActiveElement(document);

    const result = activeElement ? (0, _selectorGenerator.generateSelector)(this._injectedScript, activeElement) : null;
    this._activeModel = result && result.selector ? result : null;
    if (this._params.isUnderTest) console.error('Highlight updated for test: ' + (result ? result.selector : null));
  }

  _updateModelForHoveredElement() {
    if (!this._hoveredElement) {
      this._hoveredModel = null;

      this._updateHighlight();

      return;
    }

    const hoveredElement = this._hoveredElement;
    const {
      selector,
      elements
    } = (0, _selectorGenerator.generateSelector)(this._injectedScript, hoveredElement);
    if (this._hoveredModel && this._hoveredModel.selector === selector || this._hoveredElement !== hoveredElement) return;
    this._hoveredModel = selector ? {
      selector,
      elements
    } : null;

    this._updateHighlight();

    if (this._params.isUnderTest) console.error('Highlight updated for test: ' + selector);
  }

  _updateHighlight() {
    const elements = this._hoveredModel ? this._hoveredModel.elements : []; // Code below should trigger one layout and leave with the
    // destroyed layout.
    // Destroy the layout

    this._tooltipElement.textContent = this._hoveredModel ? this._hoveredModel.selector : '';
    this._tooltipElement.style.top = '0';
    this._tooltipElement.style.left = '0';
    this._tooltipElement.style.display = 'flex'; // Trigger layout.

    const boxes = elements.map(e => e.getBoundingClientRect());
    const tooltipWidth = this._tooltipElement.offsetWidth;
    const tooltipHeight = this._tooltipElement.offsetHeight;
    const totalWidth = this._innerGlassPaneElement.offsetWidth;
    const totalHeight = this._innerGlassPaneElement.offsetHeight; // Destroy the layout again.

    if (boxes.length) {
      const primaryBox = boxes[0];
      let anchorLeft = primaryBox.left;
      if (anchorLeft + tooltipWidth > totalWidth - 5) anchorLeft = totalWidth - tooltipWidth - 5;
      let anchorTop = primaryBox.bottom + 5;

      if (anchorTop + tooltipHeight > totalHeight - 5) {
        // If can't fit below, either position above...
        if (primaryBox.top > tooltipHeight + 5) {
          anchorTop = primaryBox.top - tooltipHeight - 5;
        } else {
          // Or on top in case of large element
          anchorTop = totalHeight - 5 - tooltipHeight;
        }
      }

      this._tooltipElement.style.top = anchorTop + 'px';
      this._tooltipElement.style.left = anchorLeft + 'px';
    } else {
      this._tooltipElement.style.display = 'none';
    }

    const pool = this._highlightElements;
    this._highlightElements = [];

    for (const box of boxes) {
      const highlightElement = pool.length ? pool.shift() : this._createHighlightElement();
      const color = this._mode === 'recording' ? '#dc6f6f7f' : '#6fa8dc7f';
      highlightElement.style.backgroundColor = this._highlightElements.length ? '#f6b26b7f' : color;
      highlightElement.style.left = box.x + 'px';
      highlightElement.style.top = box.y + 'px';
      highlightElement.style.width = box.width + 'px';
      highlightElement.style.height = box.height + 'px';
      highlightElement.style.display = 'block';

      this._highlightElements.push(highlightElement);
    }

    for (const highlightElement of pool) {
      highlightElement.style.display = 'none';

      this._highlightElements.push(highlightElement);
    }
  }

  _createHighlightElement() {
    const highlightElement = document.createElement('x-pw-highlight');
    highlightElement.style.position = 'absolute';
    highlightElement.style.top = '0';
    highlightElement.style.left = '0';
    highlightElement.style.width = '0';
    highlightElement.style.height = '0';
    highlightElement.style.boxSizing = 'border-box';

    this._glassPaneShadow.appendChild(highlightElement);

    return highlightElement;
  }

  _onInput(event) {
    if (this._mode !== 'recording') return true;

    const target = this._deepEventTarget(event);

    if (['INPUT', 'TEXTAREA'].includes(target.nodeName)) {
      const inputElement = target;
      const elementType = (inputElement.type || '').toLowerCase();

      if (elementType === 'checkbox') {
        // Checkbox is handled in click, we can't let input trigger on checkbox - that would mean we dispatched click events while recording.
        return;
      }

      if (elementType === 'file') {
        globalThis._playwrightRecorderRecordAction({
          name: 'setInputFiles',
          selector: this._activeModel.selector,
          signals: [],
          files: [...(inputElement.files || [])].map(file => file.name)
        });

        return;
      } // Non-navigating actions are simply recorded by Playwright.


      if (this._consumedDueWrongTarget(event)) return;

      globalThis._playwrightRecorderRecordAction({
        name: 'fill',
        selector: this._activeModel.selector,
        signals: [],
        text: inputElement.value
      });
    }

    if (target.nodeName === 'SELECT') {
      const selectElement = target;
      if (this._actionInProgress(event)) return;

      this._performAction({
        name: 'select',
        selector: this._hoveredModel.selector,
        options: [...selectElement.selectedOptions].map(option => option.value),
        signals: []
      });
    }
  }

  _shouldGenerateKeyPressFor(event) {
    // Backspace, Delete, AltGraph are changing input, will handle it there.
    if (['Backspace', 'Delete', 'AltGraph'].includes(event.key)) return false; // Ignore the QWERTZ shortcut for creating a at sign on MacOS

    if (event.key === '@' && event.code === 'KeyL') return false; // Allow and ignore common used shortcut for pasting.

    if (navigator.platform.includes('Mac')) {
      if (event.key === 'v' && event.metaKey) return false;
    } else {
      if (event.key === 'v' && event.ctrlKey) return false;
      if (event.key === 'Insert' && event.shiftKey) return false;
    }

    if (['Shift', 'Control', 'Meta', 'Alt'].includes(event.key)) return false;
    const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
    if (event.key.length === 1 && !hasModifier) return !!asCheckbox(this._deepEventTarget(event));
    return true;
  }

  _onKeyDown(event) {
    if (this._mode === 'inspecting') {
      consumeEvent(event);
      return;
    }

    if (this._mode !== 'recording') return true;
    if (!this._shouldGenerateKeyPressFor(event)) return;

    if (this._actionInProgress(event)) {
      this._expectProgrammaticKeyUp = true;
      return;
    }

    if (this._consumedDueWrongTarget(event)) return; // Similarly to click, trigger checkbox on key event, not input.

    if (event.key === ' ') {
      const checkbox = asCheckbox(this._deepEventTarget(event));

      if (checkbox) {
        this._performAction({
          name: checkbox.checked ? 'uncheck' : 'check',
          selector: this._activeModel.selector,
          signals: []
        });

        return;
      }
    }

    this._performAction({
      name: 'press',
      selector: this._activeModel.selector,
      signals: [],
      key: event.key,
      modifiers: modifiersForEvent(event)
    });
  }

  _onKeyUp(event) {
    if (!this._shouldGenerateKeyPressFor(event)) return; // Only allow programmatic keyups, ignore user input.

    if (!this._expectProgrammaticKeyUp) {
      consumeEvent(event);
      return;
    }

    this._expectProgrammaticKeyUp = false;
  }

  async _performAction(action) {
    this._performingAction = true;
    await globalThis._playwrightRecorderPerformAction(action).catch(() => {});
    this._performingAction = false; // Action could have changed DOM, update hovered model selectors.

    this._updateModelForHoveredElement(); // If that was a keyboard action, it similarly requires new selectors for active model.


    this._onFocus();

    if (this._params.isUnderTest) {
      // Serialize all to string as we cannot attribute console message to isolated world
      // in Firefox.
      console.error('Action performed for test: ' + JSON.stringify({
        hovered: this._hoveredModel ? this._hoveredModel.selector : null,
        active: this._activeModel ? this._activeModel.selector : null
      }));
    }
  }

  _deepEventTarget(event) {
    return event.composedPath()[0];
  }

  _deepActiveElement(document) {
    let activeElement = document.activeElement;

    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement) activeElement = activeElement.shadowRoot.activeElement;

    return activeElement;
  }

}

exports.Recorder = Recorder;

function modifiersForEvent(event) {
  return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
}

function buttonForEvent(event) {
  switch (event.which) {
    case 1:
      return 'left';

    case 2:
      return 'middle';

    case 3:
      return 'right';
  }

  return 'left';
}

function positionForEvent(event) {
  const targetElement = event.target;
  if (targetElement.nodeName !== 'CANVAS') return;
  return {
    x: event.offsetX,
    y: event.offsetY
  };
}

function consumeEvent(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}

function asCheckbox(node) {
  if (!node || node.nodeName !== 'INPUT') return null;
  const inputElement = node;
  return inputElement.type === 'checkbox' ? inputElement : null;
}

function addEventListener(target, eventName, listener, useCapture) {
  target.addEventListener(eventName, listener, useCapture);

  const remove = () => {
    target.removeEventListener(eventName, listener, useCapture);
  };

  return remove;
}

function removeEventListeners(listeners) {
  for (const listener of listeners) listener();

  listeners.splice(0, listeners.length);
}

var _default = Recorder;
exports.default = _default;