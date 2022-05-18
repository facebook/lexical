// packages/playwright-core/src/server/injected/selectorUtils.ts
function shouldSkipForTextMatching(element) {
  return element.nodeName === "SCRIPT" || element.nodeName === "STYLE" || document.head && document.head.contains(element);
}
function elementText(cache, root) {
  let value = cache.get(root);
  if (value === void 0) {
    value = { full: "", immediate: [] };
    if (!shouldSkipForTextMatching(root)) {
      let currentImmediate = "";
      if (root instanceof HTMLInputElement && (root.type === "submit" || root.type === "button")) {
        value = { full: root.value, immediate: [root.value] };
      } else {
        for (let child = root.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === Node.TEXT_NODE) {
            value.full += child.nodeValue || "";
            currentImmediate += child.nodeValue || "";
          } else {
            if (currentImmediate)
              value.immediate.push(currentImmediate);
            currentImmediate = "";
            if (child.nodeType === Node.ELEMENT_NODE)
              value.full += elementText(cache, child).full;
          }
        }
        if (currentImmediate)
          value.immediate.push(currentImmediate);
        if (root.shadowRoot)
          value.full += elementText(cache, root.shadowRoot).full;
      }
    }
    cache.set(root, value);
  }
  return value;
}

// packages/playwright-core/src/server/injected/selectorGenerator.ts
var cacheAllowText = /* @__PURE__ */ new Map();
var cacheDisallowText = /* @__PURE__ */ new Map();
var kNthScore = 1e3;
function querySelector(injectedScript, selector, ownerDocument) {
  try {
    const parsedSelector = injectedScript.parseSelector(selector);
    return {
      selector,
      elements: injectedScript.querySelectorAll(parsedSelector, ownerDocument)
    };
  } catch (e) {
    return {
      selector,
      elements: []
    };
  }
}
function generateSelector(injectedScript, targetElement, strict) {
  injectedScript._evaluator.begin();
  try {
    targetElement = targetElement.closest("button,select,input,[role=button],[role=checkbox],[role=radio]") || targetElement;
    const targetTokens = generateSelectorFor(injectedScript, targetElement, strict);
    const bestTokens = targetTokens || cssFallback(injectedScript, targetElement, strict);
    const selector = joinTokens(bestTokens);
    const parsedSelector = injectedScript.parseSelector(selector);
    return {
      selector,
      elements: injectedScript.querySelectorAll(parsedSelector, targetElement.ownerDocument)
    };
  } finally {
    cacheAllowText.clear();
    cacheDisallowText.clear();
    injectedScript._evaluator.end();
  }
}
function filterRegexTokens(textCandidates) {
  return textCandidates.filter((c) => c[0].selector[0] !== "/");
}
function generateSelectorFor(injectedScript, targetElement, strict) {
  if (targetElement.ownerDocument.documentElement === targetElement)
    return [{ engine: "css", selector: "html", score: 1 }];
  const calculate = (element, allowText) => {
    const allowNthMatch = element === targetElement;
    let textCandidates = allowText ? buildTextCandidates(injectedScript, element, element === targetElement).map((token) => [token]) : [];
    if (element !== targetElement) {
      textCandidates = filterRegexTokens(textCandidates);
    }
    const noTextCandidates = buildCandidates(injectedScript, element).map((token) => [token]);
    let result = chooseFirstSelector(injectedScript, targetElement.ownerDocument, element, [...textCandidates, ...noTextCandidates], allowNthMatch, strict);
    textCandidates = filterRegexTokens(textCandidates);
    const checkWithText = (textCandidatesToUse) => {
      const allowParentText = allowText && !textCandidatesToUse.length;
      const candidates = [...textCandidatesToUse, ...noTextCandidates].filter((c) => {
        if (!result)
          return true;
        return combineScores(c) < combineScores(result);
      });
      let bestPossibleInParent = candidates[0];
      if (!bestPossibleInParent)
        return;
      for (let parent = parentElementOrShadowHost(element); parent; parent = parentElementOrShadowHost(parent)) {
        const parentTokens = calculateCached(parent, allowParentText);
        if (!parentTokens)
          continue;
        if (result && combineScores([...parentTokens, ...bestPossibleInParent]) >= combineScores(result))
          continue;
        bestPossibleInParent = chooseFirstSelector(injectedScript, parent, element, candidates, allowNthMatch, strict);
        if (!bestPossibleInParent)
          return;
        const combined = [...parentTokens, ...bestPossibleInParent];
        if (!result || combineScores(combined) < combineScores(result))
          result = combined;
      }
    };
    checkWithText(textCandidates);
    if (element === targetElement && textCandidates.length)
      checkWithText([]);
    return result;
  };
  const calculateCached = (element, allowText) => {
    const cache = allowText ? cacheAllowText : cacheDisallowText;
    let value = cache.get(element);
    if (value === void 0) {
      value = calculate(element, allowText);
      cache.set(element, value);
    }
    return value;
  };
  return calculateCached(targetElement, true);
}
function buildCandidates(injectedScript, element) {
  const candidates = [];
  for (const attribute of ["data-testid", "data-test-id", "data-test"]) {
    if (element.getAttribute(attribute))
      candidates.push({ engine: "css", selector: `[${attribute}=${quoteAttributeValue(element.getAttribute(attribute))}]`, score: 1 });
  }
  if (element.nodeName === "INPUT") {
    const input = element;
    if (input.placeholder)
      candidates.push({ engine: "css", selector: `[placeholder=${quoteAttributeValue(input.placeholder)}]`, score: 10 });
  }
  if (element.getAttribute("aria-label"))
    candidates.push({ engine: "css", selector: `[aria-label=${quoteAttributeValue(element.getAttribute("aria-label"))}]`, score: 10 });
  if (element.getAttribute("alt") && ["APPLET", "AREA", "IMG", "INPUT"].includes(element.nodeName))
    candidates.push({ engine: "css", selector: `${cssEscape(element.nodeName.toLowerCase())}[alt=${quoteAttributeValue(element.getAttribute("alt"))}]`, score: 10 });
  if (element.getAttribute("role"))
    candidates.push({ engine: "css", selector: `${cssEscape(element.nodeName.toLowerCase())}[role=${quoteAttributeValue(element.getAttribute("role"))}]`, score: 50 });
  if (element.getAttribute("name") && ["BUTTON", "FORM", "FIELDSET", "IFRAME", "INPUT", "KEYGEN", "OBJECT", "OUTPUT", "SELECT", "TEXTAREA", "MAP", "META", "PARAM"].includes(element.nodeName))
    candidates.push({ engine: "css", selector: `${cssEscape(element.nodeName.toLowerCase())}[name=${quoteAttributeValue(element.getAttribute("name"))}]`, score: 50 });
  if (["INPUT", "TEXTAREA"].includes(element.nodeName) && element.getAttribute("type") !== "hidden") {
    if (element.getAttribute("type"))
      candidates.push({ engine: "css", selector: `${cssEscape(element.nodeName.toLowerCase())}[type=${quoteAttributeValue(element.getAttribute("type"))}]`, score: 50 });
  }
  if (["INPUT", "TEXTAREA", "SELECT"].includes(element.nodeName))
    candidates.push({ engine: "css", selector: cssEscape(element.nodeName.toLowerCase()), score: 50 });
  const idAttr = element.getAttribute("id");
  if (idAttr && !isGuidLike(idAttr))
    candidates.push({ engine: "css", selector: makeSelectorForId(idAttr), score: 100 });
  candidates.push({ engine: "css", selector: cssEscape(element.nodeName.toLowerCase()), score: 200 });
  return candidates;
}
function buildTextCandidates(injectedScript, element, allowHasText) {
  if (element.nodeName === "SELECT")
    return [];
  const text = elementText(injectedScript._evaluator._cacheText, element).full.trim().replace(/\s+/g, " ").substring(0, 80);
  if (!text)
    return [];
  const candidates = [];
  let escaped = text;
  if (text.includes('"') || text.includes(">>") || text[0] === "/")
    escaped = `/.*${escapeForRegex(text)}.*/`;
  candidates.push({ engine: "text", selector: escaped, score: 10 });
  if (allowHasText && escaped === text) {
    let prefix = element.nodeName.toLowerCase();
    if (element.hasAttribute("role"))
      prefix += `[role=${quoteAttributeValue(element.getAttribute("role"))}]`;
    candidates.push({ engine: "css", selector: `${prefix}:has-text("${text}")`, score: 30 });
  }
  return candidates;
}
function parentElementOrShadowHost(element) {
  if (element.parentElement)
    return element.parentElement;
  if (!element.parentNode)
    return null;
  if (element.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE && element.parentNode.host)
    return element.parentNode.host;
  return null;
}
function makeSelectorForId(id) {
  return /^[a-zA-Z][a-zA-Z0-9\-\_]+$/.test(id) ? "#" + id : `[id="${cssEscape(id)}"]`;
}
function cssFallback(injectedScript, targetElement, strict) {
  const kFallbackScore = 1e7;
  const root = targetElement.ownerDocument;
  const tokens = [];
  function uniqueCSSSelector(prefix) {
    const path = tokens.slice();
    if (prefix)
      path.unshift(prefix);
    const selector = path.join(" > ");
    const parsedSelector = injectedScript.parseSelector(selector);
    const node = injectedScript.querySelector(parsedSelector, targetElement.ownerDocument, false);
    return node === targetElement ? selector : void 0;
  }
  function makeStrict(selector) {
    const token = { engine: "css", selector, score: kFallbackScore };
    if (!strict)
      return [token];
    const parsedSelector = injectedScript.parseSelector(selector);
    const elements = injectedScript.querySelectorAll(parsedSelector, targetElement.ownerDocument);
    if (elements.length === 1)
      return [token];
    const nth = { engine: "nth", selector: String(elements.indexOf(targetElement)), score: kNthScore };
    return [token, nth];
  }
  for (let element = targetElement; element && element !== root; element = parentElementOrShadowHost(element)) {
    const nodeName = element.nodeName.toLowerCase();
    let bestTokenForLevel = "";
    if (element.id) {
      const token = makeSelectorForId(element.id);
      const selector = uniqueCSSSelector(token);
      if (selector)
        return makeStrict(selector);
      bestTokenForLevel = token;
    }
    const parent = element.parentNode;
    const classes = [...element.classList];
    for (let i = 0; i < classes.length; ++i) {
      const token = "." + classes.slice(0, i + 1).join(".");
      const selector = uniqueCSSSelector(token);
      if (selector)
        return makeStrict(selector);
      if (!bestTokenForLevel && parent) {
        const sameClassSiblings = parent.querySelectorAll(token);
        if (sameClassSiblings.length === 1)
          bestTokenForLevel = token;
      }
    }
    if (parent) {
      const siblings = [...parent.children];
      const sameTagSiblings = siblings.filter((sibling) => sibling.nodeName.toLowerCase() === nodeName);
      const token = sameTagSiblings.indexOf(element) === 0 ? cssEscape(nodeName) : `${cssEscape(nodeName)}:nth-child(${1 + siblings.indexOf(element)})`;
      const selector = uniqueCSSSelector(token);
      if (selector)
        return makeStrict(selector);
      if (!bestTokenForLevel)
        bestTokenForLevel = token;
    } else if (!bestTokenForLevel) {
      bestTokenForLevel = nodeName;
    }
    tokens.unshift(bestTokenForLevel);
  }
  return makeStrict(uniqueCSSSelector());
}
function escapeForRegex(text) {
  return text.replace(/[.*+?^>${}()|[\]\\]/g, "\\$&");
}
function quoteAttributeValue(text) {
  return `"${cssEscape(text).replace(/\\ /g, " ")}"`;
}
function joinTokens(tokens) {
  const parts = [];
  let lastEngine = "";
  for (const { engine, selector } of tokens) {
    if (parts.length && (lastEngine !== "css" || engine !== "css" || selector.startsWith(":nth-match(")))
      parts.push(">>");
    lastEngine = engine;
    if (engine === "css")
      parts.push(selector);
    else
      parts.push(`${engine}=${selector}`);
  }
  return parts.join(" ");
}
function combineScores(tokens) {
  let score = 0;
  for (let i = 0; i < tokens.length; i++)
    score += tokens[i].score * (tokens.length - i);
  return score;
}
function chooseFirstSelector(injectedScript, scope, targetElement, selectors, allowNthMatch, strict) {
  const joined = selectors.map((tokens) => ({ tokens, score: combineScores(tokens) }));
  joined.sort((a, b) => a.score - b.score);
  let bestWithIndex = null;
  for (const { tokens } of joined) {
    const parsedSelector = injectedScript.parseSelector(joinTokens(tokens));
    const result = injectedScript.querySelectorAll(parsedSelector, scope);
    const isStrictEnough = !strict || result.length === 1;
    const index = result.indexOf(targetElement);
    if (index === 0 && isStrictEnough) {
      return tokens;
    }
    if (!allowNthMatch || bestWithIndex || index === -1 || result.length > 5)
      continue;
    const nth = { engine: "nth", selector: String(index), score: kNthScore };
    bestWithIndex = [...tokens, nth];
  }
  return bestWithIndex;
}
function isGuidLike(id) {
  let lastCharacterType;
  let transitionCount = 0;
  for (let i = 0; i < id.length; ++i) {
    const c = id[i];
    let characterType;
    if (c === "-" || c === "_")
      continue;
    if (c >= "a" && c <= "z")
      characterType = "lower";
    else if (c >= "A" && c <= "Z")
      characterType = "upper";
    else if (c >= "0" && c <= "9")
      characterType = "digit";
    else
      characterType = "other";
    if (characterType === "lower" && lastCharacterType === "upper") {
      lastCharacterType = characterType;
      continue;
    }
    if (lastCharacterType && lastCharacterType !== characterType)
      ++transitionCount;
    lastCharacterType = characterType;
  }
  return transitionCount >= id.length / 4;
}
function cssEscape(s) {
  let result = "";
  for (let i = 0; i < s.length; i++)
    result += cssEscapeOne(s, i);
  return result;
}
function cssEscapeOne(s, i) {
  const c = s.charCodeAt(i);
  if (c === 0)
    return "\uFFFD";
  if (c >= 1 && c <= 31 || c >= 48 && c <= 57 && (i === 0 || i === 1 && s.charCodeAt(0) === 45))
    return "\\" + c.toString(16) + " ";
  if (i === 0 && c === 45 && s.length === 1)
    return "\\" + s.charAt(i);
  if (c >= 128 || c === 45 || c === 95 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122)
    return s.charAt(i);
  return "\\" + s.charAt(i);
}

// packages/playwright-core/src/server/injected/highlight.ts
var Highlight = class {
  constructor(isUnderTest) {
    this._highlightElements = [];
    this._isUnderTest = isUnderTest;
    this._outerGlassPaneElement = document.createElement("x-pw-glass");
    this._outerGlassPaneElement.style.position = "fixed";
    this._outerGlassPaneElement.style.top = "0";
    this._outerGlassPaneElement.style.right = "0";
    this._outerGlassPaneElement.style.bottom = "0";
    this._outerGlassPaneElement.style.left = "0";
    this._outerGlassPaneElement.style.zIndex = "2147483647";
    this._outerGlassPaneElement.style.pointerEvents = "none";
    this._outerGlassPaneElement.style.display = "flex";
    this._tooltipElement = document.createElement("x-pw-tooltip");
    this._actionPointElement = document.createElement("x-pw-action-point");
    this._actionPointElement.setAttribute("hidden", "true");
    this._innerGlassPaneElement = document.createElement("x-pw-glass-inner");
    this._innerGlassPaneElement.style.flex = "auto";
    this._innerGlassPaneElement.appendChild(this._tooltipElement);
    this._glassPaneShadow = this._outerGlassPaneElement.attachShadow({ mode: isUnderTest ? "open" : "closed" });
    this._glassPaneShadow.appendChild(this._innerGlassPaneElement);
    this._glassPaneShadow.appendChild(this._actionPointElement);
    const styleElement = document.createElement("style");
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
  }
  install() {
    document.documentElement.appendChild(this._outerGlassPaneElement);
  }
  uninstall() {
    this._outerGlassPaneElement.remove();
  }
  isInstalled() {
    return this._outerGlassPaneElement.parentElement === document.documentElement && !this._outerGlassPaneElement.nextElementSibling;
  }
  showActionPoint(x, y) {
    this._actionPointElement.style.top = y + "px";
    this._actionPointElement.style.left = x + "px";
    this._actionPointElement.hidden = false;
    if (this._isUnderTest)
      console.error("Action point for test: " + JSON.stringify({ x, y }));
  }
  hideActionPoint() {
    this._actionPointElement.hidden = true;
  }
  updateHighlight(elements, selector, isRecording) {
    this._tooltipElement.textContent = selector;
    this._tooltipElement.style.top = "0";
    this._tooltipElement.style.left = "0";
    this._tooltipElement.style.display = "flex";
    const boxes = elements.map((e) => e.getBoundingClientRect());
    const tooltipWidth = this._tooltipElement.offsetWidth;
    const tooltipHeight = this._tooltipElement.offsetHeight;
    const totalWidth = this._innerGlassPaneElement.offsetWidth;
    const totalHeight = this._innerGlassPaneElement.offsetHeight;
    if (boxes.length) {
      const primaryBox = boxes[0];
      let anchorLeft = primaryBox.left;
      if (anchorLeft + tooltipWidth > totalWidth - 5)
        anchorLeft = totalWidth - tooltipWidth - 5;
      let anchorTop = primaryBox.bottom + 5;
      if (anchorTop + tooltipHeight > totalHeight - 5) {
        if (primaryBox.top > tooltipHeight + 5) {
          anchorTop = primaryBox.top - tooltipHeight - 5;
        } else {
          anchorTop = totalHeight - 5 - tooltipHeight;
        }
      }
      this._tooltipElement.style.top = anchorTop + "px";
      this._tooltipElement.style.left = anchorLeft + "px";
    } else {
      this._tooltipElement.style.display = "none";
    }
    const pool = this._highlightElements;
    this._highlightElements = [];
    for (const box of boxes) {
      const highlightElement = pool.length ? pool.shift() : this._createHighlightElement();
      const color = isRecording ? "#dc6f6f7f" : "#6fa8dc7f";
      highlightElement.style.backgroundColor = this._highlightElements.length ? "#f6b26b7f" : color;
      highlightElement.style.left = box.x + "px";
      highlightElement.style.top = box.y + "px";
      highlightElement.style.width = box.width + "px";
      highlightElement.style.height = box.height + "px";
      highlightElement.style.display = "block";
      this._highlightElements.push(highlightElement);
      if (this._isUnderTest)
        console.error("Highlight box for test: " + JSON.stringify({ x: box.x, y: box.y, width: box.width, height: box.height }));
    }
    for (const highlightElement of pool) {
      highlightElement.style.display = "none";
      this._highlightElements.push(highlightElement);
    }
  }
  maskElements(elements) {
    const boxes = elements.map((e) => e.getBoundingClientRect());
    const pool = this._highlightElements;
    this._highlightElements = [];
    for (const box of boxes) {
      const highlightElement = pool.length ? pool.shift() : this._createHighlightElement();
      highlightElement.style.backgroundColor = "#F0F";
      highlightElement.style.left = box.x + "px";
      highlightElement.style.top = box.y + "px";
      highlightElement.style.width = box.width + "px";
      highlightElement.style.height = box.height + "px";
      highlightElement.style.display = "block";
      this._highlightElements.push(highlightElement);
    }
    for (const highlightElement of pool) {
      highlightElement.style.display = "none";
      this._highlightElements.push(highlightElement);
    }
  }
  _createHighlightElement() {
    const highlightElement = document.createElement("x-pw-highlight");
    highlightElement.style.position = "absolute";
    highlightElement.style.top = "0";
    highlightElement.style.left = "0";
    highlightElement.style.width = "0";
    highlightElement.style.height = "0";
    highlightElement.style.boxSizing = "border-box";
    this._glassPaneShadow.appendChild(highlightElement);
    return highlightElement;
  }
};

// packages/playwright-core/src/server/injected/recorder.ts
var Recorder = class {
  constructor(injectedScript) {
    this._performingAction = false;
    this._listeners = [];
    this._hoveredModel = null;
    this._hoveredElement = null;
    this._activeModel = null;
    this._expectProgrammaticKeyUp = false;
    this._mode = "none";
    this._injectedScript = injectedScript;
    this._highlight = new Highlight(injectedScript.isUnderTest);
    this._refreshListenersIfNeeded();
    injectedScript.onGlobalListenersRemoved.add(() => this._refreshListenersIfNeeded());
    globalThis.__pw_refreshOverlay = () => {
      this._pollRecorderMode().catch((e) => console.log(e));
    };
    globalThis.__pw_refreshOverlay();
    if (injectedScript.isUnderTest)
      console.error("Recorder script ready for test");
  }
  _refreshListenersIfNeeded() {
    if (this._highlight.isInstalled())
      return;
    removeEventListeners(this._listeners);
    this._listeners = [
      addEventListener(document, "click", (event) => this._onClick(event), true),
      addEventListener(document, "auxclick", (event) => this._onClick(event), true),
      addEventListener(document, "input", (event) => this._onInput(event), true),
      addEventListener(document, "keydown", (event) => this._onKeyDown(event), true),
      addEventListener(document, "keyup", (event) => this._onKeyUp(event), true),
      addEventListener(document, "mousedown", (event) => this._onMouseDown(event), true),
      addEventListener(document, "mouseup", (event) => this._onMouseUp(event), true),
      addEventListener(document, "mousemove", (event) => this._onMouseMove(event), true),
      addEventListener(document, "mouseleave", (event) => this._onMouseLeave(event), true),
      addEventListener(document, "focus", () => this._onFocus(), true),
      addEventListener(document, "scroll", () => {
        this._hoveredModel = null;
        this._highlight.hideActionPoint();
        this._updateHighlight();
      }, true)
    ];
    this._highlight.install();
  }
  async _pollRecorderMode() {
    var _a;
    const pollPeriod = 1e3;
    if (this._pollRecorderModeTimer)
      clearTimeout(this._pollRecorderModeTimer);
    const state = await globalThis.__pw_recorderState().catch((e) => null);
    if (!state) {
      this._pollRecorderModeTimer = setTimeout(() => this._pollRecorderMode(), pollPeriod);
      return;
    }
    const { mode, actionPoint, actionSelector } = state;
    if (mode !== this._mode) {
      this._mode = mode;
      this._clearHighlight();
    }
    if (actionPoint && this._actionPoint && actionPoint.x === this._actionPoint.x && actionPoint.y === this._actionPoint.y) {
    } else if (!actionPoint && !this._actionPoint) {
    } else {
      if (actionPoint)
        this._highlight.showActionPoint(actionPoint.x, actionPoint.y);
      else
        this._highlight.hideActionPoint();
      this._actionPoint = actionPoint;
    }
    if (this._actionSelector && !((_a = this._hoveredModel) == null ? void 0 : _a.elements.length))
      this._actionSelector = void 0;
    if (actionSelector !== this._actionSelector) {
      this._hoveredModel = actionSelector ? querySelector(this._injectedScript, actionSelector, document) : null;
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
    if (this._performingAction)
      return true;
    consumeEvent(event);
    return false;
  }
  _consumedDueToNoModel(event, model) {
    if (model)
      return false;
    consumeEvent(event);
    return true;
  }
  _consumedDueWrongTarget(event) {
    if (this._activeModel && this._activeModel.elements[0] === this._deepEventTarget(event))
      return false;
    consumeEvent(event);
    return true;
  }
  _onClick(event) {
    if (this._mode === "inspecting")
      globalThis.__pw_recorderSetSelector(this._hoveredModel ? this._hoveredModel.selector : "");
    if (this._shouldIgnoreMouseEvent(event))
      return;
    if (this._actionInProgress(event))
      return;
    if (this._consumedDueToNoModel(event, this._hoveredModel))
      return;
    const checkbox = asCheckbox(this._deepEventTarget(event));
    if (checkbox) {
      this._performAction({
        name: checkbox.checked ? "check" : "uncheck",
        selector: this._hoveredModel.selector,
        signals: []
      });
      return;
    }
    this._performAction({
      name: "click",
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
    if (this._mode === "none")
      return true;
    if (this._mode === "inspecting") {
      consumeEvent(event);
      return true;
    }
    const nodeName = target.nodeName;
    if (nodeName === "SELECT")
      return true;
    if (nodeName === "INPUT" && ["date"].includes(target.type))
      return true;
    return false;
  }
  _onMouseDown(event) {
    if (this._shouldIgnoreMouseEvent(event))
      return;
    if (!this._performingAction)
      consumeEvent(event);
    this._activeModel = this._hoveredModel;
  }
  _onMouseUp(event) {
    if (this._shouldIgnoreMouseEvent(event))
      return;
    if (!this._performingAction)
      consumeEvent(event);
  }
  _onMouseMove(event) {
    if (this._mode === "none")
      return;
    const target = this._deepEventTarget(event);
    if (this._hoveredElement === target)
      return;
    this._hoveredElement = target;
    this._updateModelForHoveredElement();
  }
  _onMouseLeave(event) {
    if (this._deepEventTarget(event).nodeType === Node.DOCUMENT_NODE) {
      this._hoveredElement = null;
      this._updateModelForHoveredElement();
    }
  }
  _onFocus() {
    const activeElement = this._deepActiveElement(document);
    const result = activeElement ? generateSelector(this._injectedScript, activeElement, true) : null;
    this._activeModel = result && result.selector ? result : null;
    if (this._injectedScript.isUnderTest)
      console.error("Highlight updated for test: " + (result ? result.selector : null));
  }
  _updateModelForHoveredElement() {
    if (!this._hoveredElement) {
      this._hoveredModel = null;
      this._updateHighlight();
      return;
    }
    const hoveredElement = this._hoveredElement;
    const { selector, elements } = generateSelector(this._injectedScript, hoveredElement, true);
    if (this._hoveredModel && this._hoveredModel.selector === selector || this._hoveredElement !== hoveredElement)
      return;
    this._hoveredModel = selector ? { selector, elements } : null;
    this._updateHighlight();
    if (this._injectedScript.isUnderTest)
      console.error("Highlight updated for test: " + selector);
  }
  _updateHighlight() {
    const elements = this._hoveredModel ? this._hoveredModel.elements : [];
    const selector = this._hoveredModel ? this._hoveredModel.selector : "";
    this._highlight.updateHighlight(elements, selector, this._mode === "recording");
  }
  _onInput(event) {
    if (this._mode !== "recording")
      return true;
    const target = this._deepEventTarget(event);
    if (["INPUT", "TEXTAREA"].includes(target.nodeName)) {
      const inputElement = target;
      const elementType = (inputElement.type || "").toLowerCase();
      if (["checkbox", "radio"].includes(elementType)) {
        return;
      }
      if (elementType === "file") {
        globalThis.__pw_recorderRecordAction({
          name: "setInputFiles",
          selector: this._activeModel.selector,
          signals: [],
          files: [...inputElement.files || []].map((file) => file.name)
        });
        return;
      }
      if (this._consumedDueWrongTarget(event))
        return;
      globalThis.__pw_recorderRecordAction({
        name: "fill",
        selector: this._activeModel.selector,
        signals: [],
        text: inputElement.value
      });
    }
    if (target.nodeName === "SELECT") {
      const selectElement = target;
      if (this._actionInProgress(event))
        return;
      this._performAction({
        name: "select",
        selector: this._hoveredModel.selector,
        options: [...selectElement.selectedOptions].map((option) => option.value),
        signals: []
      });
    }
  }
  _shouldGenerateKeyPressFor(event) {
    if (["Backspace", "Delete", "AltGraph"].includes(event.key))
      return false;
    if (event.key === "@" && event.code === "KeyL")
      return false;
    if (navigator.platform.includes("Mac")) {
      if (event.key === "v" && event.metaKey)
        return false;
    } else {
      if (event.key === "v" && event.ctrlKey)
        return false;
      if (event.key === "Insert" && event.shiftKey)
        return false;
    }
    if (["Shift", "Control", "Meta", "Alt"].includes(event.key))
      return false;
    const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
    if (event.key.length === 1 && !hasModifier)
      return !!asCheckbox(this._deepEventTarget(event));
    return true;
  }
  _onKeyDown(event) {
    if (this._mode === "inspecting") {
      consumeEvent(event);
      return;
    }
    if (this._mode !== "recording")
      return;
    if (!this._shouldGenerateKeyPressFor(event))
      return;
    if (this._actionInProgress(event)) {
      this._expectProgrammaticKeyUp = true;
      return;
    }
    if (this._consumedDueWrongTarget(event))
      return;
    if (event.key === " ") {
      const checkbox = asCheckbox(this._deepEventTarget(event));
      if (checkbox) {
        this._performAction({
          name: checkbox.checked ? "uncheck" : "check",
          selector: this._activeModel.selector,
          signals: []
        });
        return;
      }
    }
    this._performAction({
      name: "press",
      selector: this._activeModel.selector,
      signals: [],
      key: event.key,
      modifiers: modifiersForEvent(event)
    });
  }
  _onKeyUp(event) {
    if (this._mode === "none")
      return;
    if (!this._shouldGenerateKeyPressFor(event))
      return;
    if (!this._expectProgrammaticKeyUp) {
      consumeEvent(event);
      return;
    }
    this._expectProgrammaticKeyUp = false;
  }
  async _performAction(action) {
    this._clearHighlight();
    this._performingAction = true;
    await globalThis.__pw_recorderPerformAction(action).catch(() => {
    });
    this._performingAction = false;
    this._updateModelForHoveredElement();
    this._onFocus();
    if (this._injectedScript.isUnderTest) {
      console.error("Action performed for test: " + JSON.stringify({
        hovered: this._hoveredModel ? this._hoveredModel.selector : null,
        active: this._activeModel ? this._activeModel.selector : null
      }));
    }
  }
  _deepEventTarget(event) {
    return event.composedPath()[0];
  }
  _deepActiveElement(document2) {
    let activeElement = document2.activeElement;
    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
      activeElement = activeElement.shadowRoot.activeElement;
    return activeElement;
  }
};
function modifiersForEvent(event) {
  return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
}
function buttonForEvent(event) {
  switch (event.which) {
    case 1:
      return "left";
    case 2:
      return "middle";
    case 3:
      return "right";
  }
  return "left";
}
function positionForEvent(event) {
  const targetElement = event.target;
  if (targetElement.nodeName !== "CANVAS")
    return;
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
  if (!node || node.nodeName !== "INPUT")
    return null;
  const inputElement = node;
  return ["checkbox", "radio"].includes(inputElement.type) ? inputElement : null;
}
function addEventListener(target, eventName, listener, useCapture) {
  target.addEventListener(eventName, listener, useCapture);
  const remove = () => {
    target.removeEventListener(eventName, listener, useCapture);
  };
  return remove;
}
function removeEventListeners(listeners) {
  for (const listener of listeners)
    listener();
  listeners.splice(0, listeners.length);
}
module.exports = Recorder;
