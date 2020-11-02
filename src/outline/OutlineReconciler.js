import {
  getNodeType,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_TEXT,
  IS_UNDERLINE,
} from "./OutlineNode";

let subTreeTextContent = "";
let forceTextDirection = null;

const RTL = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
const LTR =
  "A-Za-z\u00C0-\u00D6\u00D8-\u00F6" +
  "\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C" +
  "\uFE00-\uFE6F\uFEFD-\uFFFF";

const rtl = new RegExp("^[^" + LTR + "]*[" + RTL + "]");
const ltr = new RegExp("^[^" + RTL + "]*[" + LTR + "]");
const zeroWidthString = "\uFEFF";

function getTextDirection(text) {
  if (rtl.test(text)) {
    return "rtl";
  }
  if (ltr.test(text)) {
    return "ltr";
  }
  return "";
}

function handleBlockTextDirection(dom) {
  if (forceTextDirection === null) {
    const prevSubTreeTextContent = dom.__outlineTextContent;
    if (prevSubTreeTextContent !== subTreeTextContent) {
      dom.dir = getTextDirection(subTreeTextContent);
      dom.__outlineTextContent = subTreeTextContent;
    }
  }
}

function setTextContent(prevText, nextText, dom, node) {
  const firstChild = dom.firstChild;
  const hasBreakNode = firstChild && firstChild.nextSibling;
  // Check if we are on an empty line
  if (node.getNextSibling() === null) {
    if (nextText === "") {
      if (firstChild === null) {
        // We use a zero width string so that the browser moves
        // the cursor into the text node. It won't move the cursor
        // in if it's empty. This trick makes it seem empty, so
        // the browser plays along nicely. We use the <br>
        // to ensure we take up a full line, as we don't have any
        // characters taking up the full height yet.
        dom.appendChild(document.createTextNode(zeroWidthString));
        dom.appendChild(document.createElement("br"));
      } else if (!hasBreakNode) {
        firstChild.nodeValue = zeroWidthString;
        dom.appendChild(document.createElement("br"));
      }
      return;
    } else if (nextText.endsWith("\n")) {
      nextText = nextText + "\n";
    }
  }
  if (firstChild === null || hasBreakNode) {
    dom.textContent = nextText;
  } else if (prevText !== nextText) {
    firstChild.nodeValue = nextText;
  }
}

function destroyNode(key, parentDOM, prevNodeMap, nextNodeMap, editor) {
  const node = prevNodeMap[key];
  const flags = node._flags;
  if (parentDOM !== null) {
    const dom = editor.getElementByKey(key);
    parentDOM.removeChild(dom);
  }
  if (nextNodeMap[key] === undefined) {
    editor._keyToDOMMap.delete(key);
  }
  if ((flags & IS_TEXT) === 0) {
    const children = node._children;
    destroyChildren(
      children,
      0,
      children.length - 1,
      null,
      prevNodeMap,
      nextNodeMap,
      editor
    );
  }
}

function destroyChildren(
  children,
  startIndex,
  endIndex,
  dom,
  prevNodeMap,
  nextNodeMap,
  editor
) {
  for (; startIndex <= endIndex; ++startIndex) {
    destroyNode(children[startIndex], dom, prevNodeMap, nextNodeMap, editor);
  }
}

function buildNode(key, parentDOM, insertDOM, nodeMap, editor) {
  const node = nodeMap[key];
  const children = node._children;
  const flags = node._flags;
  const type = getNodeType(node, flags);
  const dom = document.createElement(type);
  const domStyle = dom.style;

  storeDOMWithKey(key, dom, editor);

  const style = node._style;

  if (style !== null) {
    domStyle.cssText = style;
  }

  if (flags & IS_TEXT) {
    setTextStyling(domStyle, type, 0, flags);
    subTreeTextContent += children;
    setTextContent(null, children, dom, node);
    // add data-text attribute
    dom.setAttribute("data-text", true);
  } else {
    let previousSubTreeTextContent = subTreeTextContent;
    subTreeTextContent = "";
    const childrenLength = children.length;
    buildChildren(children, 0, childrenLength - 1, dom, null, nodeMap, editor);
    handleBlockTextDirection(dom);
    subTreeTextContent = previousSubTreeTextContent;
  }
  if (parentDOM !== null) {
    if (insertDOM !== null) {
      parentDOM.insertBefore(dom, insertDOM);
    } else {
      parentDOM.appendChild(dom);
    }
  }
  return dom;
}

function buildChildren(
  children,
  startIndex,
  endIndex,
  dom,
  insertDOM,
  nodeMap,
  editor
) {
  for (; startIndex <= endIndex; ++startIndex) {
    buildNode(children[startIndex], dom, insertDOM, nodeMap, editor);
  }
}

function setTextStyling(domStyle, type, prevFlags, nextFlags) {
  if (type === "strong") {
    if (nextFlags & IS_ITALIC) {
      // When prev is not italic, but next is
      if ((prevFlags & IS_ITALIC) === 0) {
        domStyle.setProperty("font-style", "italic");
      }
    } else if (prevFlags & IS_ITALIC) {
      // When prev was italic, but the next is not
      domStyle.setProperty("font-style", "normal");
    }
  }
  const prevIsNotStrikeThrough = (prevFlags & IS_STRIKETHROUGH) === 0;
  const prevIsNotUnderline = (prevFlags & IS_UNDERLINE) === 0;
  const nextIsStrikeThrough = nextFlags & IS_STRIKETHROUGH;
  const nextIsUnderline = nextFlags & IS_UNDERLINE;
  if (nextIsStrikeThrough && nextIsUnderline) {
    if (prevIsNotStrikeThrough || prevIsNotUnderline) {
      domStyle.setProperty("text-decoration", "underline line-through");
    }
  } else if (nextIsStrikeThrough) {
    if (prevIsNotStrikeThrough) {
      domStyle.setProperty("text-decoration", "line-through");
    }
  } else if (nextIsUnderline) {
    if (prevIsNotUnderline) {
      domStyle.setProperty("text-decoration", "underline");
    }
  } else {
    domStyle.setProperty("text-decoration", "initial");
  }
}

function reconcileNode(
  key,
  parentDOM,
  prevNodeMap,
  nextNodeMap,
  editor,
  dirtySubTrees
) {
  const prevNode = prevNodeMap[key];
  const nextNode = nextNodeMap[key];
  const prevFlags = prevNode._flags;
  const prevIsText = prevFlags & IS_TEXT;
  const hasDirtySubTree =
    dirtySubTrees !== null ? dirtySubTrees.has(key) : true;
  const nextChildren = nextNode._children;
  const dom = editor.getElementByKey(key);

  if (prevNode === nextNode && !hasDirtySubTree) {
    if (!prevIsText) {
      const prevSubTreeTextContent = dom.__outlineTextContent;
      if (prevSubTreeTextContent !== undefined) {
        subTreeTextContent += prevSubTreeTextContent;
      }
    } else {
      subTreeTextContent += nextChildren;
    }
    return;
  }
  const nextFlags = nextNode._flags;
  const prevType = getNodeType(prevNode, prevFlags);
  const nextType = getNodeType(nextNode, nextFlags);
  const nextIsText = nextFlags & IS_TEXT;

  // Handle change in type
  if (prevType !== nextType) {
    const replacementDOM = buildNode(key, null, null, nextNodeMap, editor);
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null, prevNodeMap, nextNodeMap, editor);
    return;
  }

  // Handle styling
  const domStyle = dom.style;

  const prevStyle = prevNode._style;
  const nextStyle = nextNode._style;

  if (prevStyle !== nextStyle) {
    if (nextStyle === null) {
      domStyle.cssText = "";
    } else {
      domStyle.cssText = nextStyle;
    }
  }

  const prevChildren = prevNode._children;
  // Handle text
  if (nextIsText) {
    setTextStyling(domStyle, nextType, prevFlags, nextFlags);
    subTreeTextContent += nextChildren;
    setTextContent(prevChildren, nextChildren, dom, nextNode);
    return;
  }

  // Handle block children
  const childrenAreDifferent = prevChildren !== nextChildren;
  if (childrenAreDifferent || hasDirtySubTree) {
    const prevChildrenLength = prevChildren.length;
    const nextChildrenLength = nextChildren.length;
    let previousSubTreeTextContent = subTreeTextContent;
    subTreeTextContent = "";

    if (prevChildrenLength === 1 && nextChildrenLength === 1) {
      const prevChildKey = prevChildren[0];
      const nextChildKey = nextChildren[0];
      if (prevChildKey === nextChildKey) {
        reconcileNode(
          prevChildKey,
          dom,
          prevNodeMap,
          nextNodeMap,
          editor,
          dirtySubTrees
        );
      } else {
        const lastDOM = editor.getElementByKey(prevChildKey);
        const replacementDOM = buildNode(
          nextChildKey,
          null,
          null,
          nextNodeMap,
          editor
        );
        dom.replaceChild(replacementDOM, lastDOM);
        destroyNode(prevChildKey, null, prevNodeMap, nextNodeMap, editor);
      }
    } else if (prevChildrenLength === 0) {
      if (nextChildrenLength !== 0) {
        buildChildren(
          nextChildren,
          0,
          nextChildrenLength - 1,
          dom,
          null,
          nextNodeMap,
          editor
        );
      }
    } else if (nextChildrenLength === 0) {
      if (prevChildrenLength !== 0) {
        destroyChildren(
          prevChildren,
          0,
          prevChildrenLength - 1,
          null,
          prevNodeMap,
          nextNodeMap,
          editor
        );
        // Fast path for removing DOM nodes
        dom.textContent = "";
      }
    } else {
      reconcileNodeChildren(
        prevChildren,
        nextChildren,
        prevChildrenLength,
        nextChildrenLength,
        dom,
        prevNodeMap,
        nextNodeMap,
        editor,
        dirtySubTrees
      );
    }
    handleBlockTextDirection(dom);
    subTreeTextContent = previousSubTreeTextContent;
  }
}

function createKeyToIndexMap(children, startIndex, endIndex) {
  let i, key;
  const map = new Map();
  for (i = startIndex; i <= endIndex; ++i) {
    key = children[i];
    if (key !== undefined) {
      map.set(key, i);
    }
  }
  return map;
}

function findIndexInPrevChildren(
  targetKey,
  prevChildren,
  startIndex,
  endIndex
) {
  for (let i = startIndex; i < endIndex; i++) {
    const c = prevChildren[i];
    if (c === targetKey) {
      return i;
    }
  }
}

// Disclaimer: this logic was adapted from Vue (MIT):
// https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L404

function reconcileNodeChildren(
  prevChildren,
  nextChildren,
  prevChildrenLength,
  nextChildrenLength,
  dom,
  prevNodeMap,
  nextNodeMap,
  editor,
  dirtySubTrees
) {
  let hasClonedPrevChildren = false;
  let prevStartIndex = 0;
  let nextStartIndex = 0;
  let prevEndIndex = prevChildren.length - 1;
  let prevStartKey = prevChildren[0];
  let prevEndKey = prevChildren[prevEndIndex];
  let nextEndIndex = nextChildren.length - 1;
  let nextStartKey = nextChildren[0];
  let nextEndKey = nextChildren[nextEndIndex];
  let prevKeyToIndexMap = null;

  while (prevStartIndex <= prevEndIndex && nextStartIndex <= nextEndIndex) {
    if (prevStartKey === undefined) {
      prevStartKey = prevChildren[++prevStartIndex];
    } else if (nextEndKey === undefined) {
      nextEndKey = prevChildren[--prevEndIndex];
    } else if (prevStartKey === nextStartKey) {
      reconcileNode(
        prevStartKey,
        dom,
        prevNodeMap,
        nextNodeMap,
        editor,
        dirtySubTrees
      );
      prevStartKey = prevChildren[++prevStartIndex];
      nextStartKey = nextChildren[++nextStartIndex];
    } else if (prevEndKey === nextEndKey) {
      reconcileNode(
        prevEndKey,
        dom,
        prevNodeMap,
        nextNodeMap,
        editor,
        dirtySubTrees
      );
      prevEndKey = prevChildren[--prevEndIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevStartKey === nextEndKey) {
      reconcileNode(
        prevStartKey,
        dom,
        prevNodeMap,
        nextNodeMap,
        editor,
        dirtySubTrees
      );
      dom.insertBefore(
        editor.getElementByKey(prevStartKey),
        editor.getElementByKey(prevEndKey).nextSibling
      );
      prevStartKey = prevChildren[++prevStartIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevEndKey === nextStartKey) {
      reconcileNode(
        prevEndKey,
        dom,
        prevNodeMap,
        nextNodeMap,
        editor,
        dirtySubTrees
      );
      dom.insertBefore(
        editor.getElementByKey(prevEndKey),
        editor.getElementByKey(prevStartKey)
      );
      prevEndKey = prevChildren[--prevEndIndex];
      nextStartKey = nextChildren[++nextStartIndex];
    } else {
      // Lazily create Map
      if (prevKeyToIndexMap === null) {
        prevKeyToIndexMap = createKeyToIndexMap(
          prevChildren,
          prevStartIndex,
          prevEndIndex
        );
      }
      const indexInPrevChildren =
        nextStartKey !== undefined
          ? prevKeyToIndexMap.get(nextStartKey)
          : findIndexInPrevChildren(
              nextStartKey,
              prevChildren,
              prevStartIndex,
              prevEndIndex
            );
      if (indexInPrevChildren === undefined) {
        buildNode(
          nextStartKey,
          dom,
          editor.getElementByKey(prevStartKey),
          nextNodeMap,
          editor
        );
      } else {
        const keyToMove = prevChildren[indexInPrevChildren];
        if (keyToMove === nextStartKey) {
          reconcileNode(
            keyToMove,
            dom,
            prevNodeMap,
            nextNodeMap,
            editor,
            dirtySubTrees
          );
          if (hasClonedPrevChildren) {
            hasClonedPrevChildren = true;
            prevChildren = [...prevChildren];
          }
          prevChildren[indexInPrevChildren] = undefined;
          dom.insertBefore(
            editor.getElementByKey(keyToMove),
            editor.getElementByKey(prevStartKey)
          );
        } else {
          throw new Error("TODO: Should this ever happen?");
        }
      }
      nextStartKey = nextChildren[++nextStartIndex];
    }
  }
  if (prevStartIndex > prevEndIndex) {
    const previousNode = nextChildren[nextEndIndex + 1];
    const insertDOM =
      previousNode === undefined ? null : editor.getElementByKey(previousNode);
    buildChildren(
      nextChildren,
      nextStartIndex,
      nextEndIndex,
      dom,
      insertDOM,
      nextNodeMap,
      editor
    );
  } else if (nextStartIndex > nextEndIndex) {
    destroyChildren(
      prevChildren,
      prevStartIndex,
      prevEndIndex,
      dom,
      prevNodeMap,
      nextNodeMap,
      editor
    );
  }
}

export function reconcileViewModel(nextViewModel, editor) {
  const prevViewModel = editor.getCurrentViewModel();
  // TODO: take this value from Editor props, default to null;
  // This will over-ride any sub-tree text direction properties.
  forceTextDirection = null;
  subTreeTextContent = "";
  const dirtySubTrees = nextViewModel._dirtySubTrees;

  reconcileNode(
    "body",
    null,
    prevViewModel.nodeMap,
    nextViewModel.nodeMap,
    editor,
    dirtySubTrees
  );

  const nextSelection = nextViewModel.selection;
  if (nextSelection !== null) {
    const [startOffset, endOffset] = nextSelection.getRangeOffsets();
    const domSelection = window.getSelection();
    const range = document.createRange();
    const startElement = getSelectionElement(nextSelection.anchorKey, editor);
    const endElement = getSelectionElement(nextSelection.focusKey, editor);
    range.collapse(nextSelection.isCollapsed);
    range.setStart(startElement, startOffset);
    range.setEnd(endElement, endOffset);
    domSelection.removeAllRanges();
    domSelection.addRange(range);
  }
}

function getSelectionElement(key, editor) {
  const element = editor.getElementByKey(key);
  const possibleTextNode = element.firstChild;
  return possibleTextNode.nodeType === 3 ? possibleTextNode : element;
}

export function storeDOMWithKey(key, dom, editor) {
  if (key === null) {
    throw new Error("storeDOMWithNodeKey failed");
  }
  const keyToDOMMap = editor._keyToDOMMap;
  dom.__outlineInternalRef = key;
  keyToDOMMap.set(key, dom);
}

export function getNodeKeyFromDOM(dom, nodeMap) {
  // Adjust target if dom is a text node
  const target = dom.nodeType === 3 ? dom.parentNode : dom;
  const key = target.__outlineInternalRef || null;
  return key;
}
