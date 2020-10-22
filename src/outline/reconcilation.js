import { getEditorInstance } from "./editor";
import { IS_TEXT } from "./state";
import { emptyObject } from "./utils";

export const nodeKeyToDOM = new Map();

let subTreeTextContent = "";
let forceTextDirection = null;

var RTL = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
var LTR =
  "A-Za-z\u00C0-\u00D6\u00D8-\u00F6" +
  "\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C" +
  "\uFE00-\uFE6F\uFEFD-\uFFFF";

var rtl = new RegExp("^[^" + LTR + "]*[" + RTL + "]");
var ltr = new RegExp("^[^" + RTL + "]*[" + LTR + "]");

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

function setTextContent(text, dom, node) {
  const firstChild = dom.firstChild;
  // Check if we are on an empty line
  if (node.getNextSibling() === null) {
    if (text === "") {
      if (firstChild === null) {
        dom.appendChild(document.createElement("br"));
      } else if (firstChild.nodeType === 3) {
        dom.removeChild(firstChild);
        dom.appendChild(document.createElement("br"));
      }
      return;
    } else if (text.endsWith("\n")) {
      text = text + "\n";
    }
  }
  if (firstChild === null || firstChild.nodeType === 1) {
    if (text === "") {
      dom.appendChild(document.createTextNode(""));
    } else {
      dom.textContent = text;
    }
    return;
  }
  firstChild.nodeValue = text;
}

function destroyNode(key, parentDOM, prevNodeMap, nextNodeMap) {
  const node = prevNodeMap[key];
  const flags = node._flags;
  if (parentDOM !== null) {
    const dom = nodeKeyToDOM.get(key);
    parentDOM.removeChild(dom);
  }
  if (nextNodeMap[key] === undefined) {
    nodeKeyToDOM.delete(key);
  }
  if ((flags & IS_TEXT) === 0) {
    const children = node._children;
    destroyChildren(
      children,
      0,
      children.length - 1,
      null,
      prevNodeMap,
      nextNodeMap
    );
  }
}

function destroyChildren(
  children,
  startIndex,
  endIndex,
  dom,
  prevNodeMap,
  nextNodeMap
) {
  for (; startIndex <= endIndex; ++startIndex) {
    destroyNode(children[startIndex], dom, prevNodeMap, nextNodeMap);
  }
}

function buildNode(key, parentDOM, insertDOM, nodeMap) {
  const node = nodeMap[key];
  const dom = document.createElement(node._type);
  const children = node._children;
  const props = node._props;
  const flags = node._flags;

  storeDOMWithNodeKey(key, dom);

  if (props !== null) {
    for (let prop in props) {
      const value = props[prop];
      if (prop != null) {
        if (prop in dom) {
          dom[prop] = value;
        } else {
          dom.setAttribute(prop, value);
        }
      }
    }
  }

  if (flags & IS_TEXT) {
    subTreeTextContent += children;
    setTextContent(children, dom, node);
  } else {
    let previousSubTreeTextContent = subTreeTextContent;
    subTreeTextContent = "";
    const childrenLength = children.length;
    buildChildren(children, 0, childrenLength - 1, dom, null, nodeMap);
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
  nodeMap
) {
  for (; startIndex <= endIndex; ++startIndex) {
    buildNode(children[startIndex], dom, insertDOM, nodeMap);
  }
}

function setNodeProperty(propName, propValue, dom) {
  if (propValue == null) {
    if (propName in dom) {
      dom[propName] = null;
    } else {
      dom.removeAttribute(propName);
    }
  } else {
    if (propName in dom) {
      dom[propName] = propValue;
    } else {
      dom.setAttribute(propName, propValue);
    }
  }
}

function reconcileNode(key, parentDOM, prevNodeMap, nextNodeMap) {
  const editorInstance = getEditorInstance();
  const prevNode = prevNodeMap[key];
  const nextNode = nextNodeMap[key];
  const prevFlags = prevNode._flags;
  const prevIsText = prevFlags & IS_TEXT;
  const hasDirtySubTree = editorInstance.dirtySubTreeTracker.has(key);
  const nextChildren = nextNode._children;
  const dom = getDOMFromNodeKey(key);

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
  const prevType = prevNode._type;
  const nextType = nextNode._type;
  const nextFlags = nextNode._flags;
  const nextIsText = nextFlags & IS_TEXT;

  if (prevType !== nextType || (prevIsText && !nextIsText)) {
    const replacementDOM = buildNode(key, null, null, nextNodeMap);
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null, prevNodeMap, nextNodeMap);
    return;
  }
  const prevProps = prevNode._props || emptyObject;
  const nextProps = nextNode._props || emptyObject;

  if (prevProps !== nextProps) {
    for (let nextProp in nextProps) {
      const nextValue = nextProps[nextProp];
      const prevValue = prevProps[nextProp];
      if (prevValue !== nextValue) {
        setNodeProperty(nextProp, nextValue, dom);
      }
    }
    for (let prevProp in prevProps) {
      if (!(prevProp in nextProps)) {
        setNodeProperty(prevProp, null, dom);
      }
    }
  }
  const prevChildren = prevNode._children;
  const childrenAreDifferent = prevChildren !== nextChildren;

  if (childrenAreDifferent || hasDirtySubTree) {
    if (nextIsText) {
      subTreeTextContent += nextChildren;
      if (childrenAreDifferent) {
        setTextContent(nextChildren, dom, nextNode);
      }
    } else {
      const prevChildrenLength = prevChildren.length;
      const nextChildrenLength = nextChildren.length;
      let previousSubTreeTextContent = subTreeTextContent;
      subTreeTextContent = "";

      if (prevChildrenLength === 1 && nextChildrenLength === 1) {
        const prevChildKey = prevChildren[0];
        const nextChildKey = nextChildren[0];
        if (prevChildKey === nextChildKey) {
          reconcileNode(prevChildKey, dom, prevNodeMap, nextNodeMap);
        } else {
          const lastDOM = getDOMFromNodeKey(prevChildKey);
          const replacementDOM = buildNode(
            nextChildKey,
            null,
            null,
            nextNodeMap
          );
          dom.replaceChild(replacementDOM, lastDOM);
          destroyNode(prevChildKey, null, prevNodeMap, nextNodeMap);
        }
      } else if (prevChildrenLength === 0) {
        if (nextChildrenLength !== 0) {
          buildChildren(
            nextChildren,
            0,
            nextChildrenLength - 1,
            dom,
            null,
            nextNodeMap
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
            nextNodeMap
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
          nextNodeMap
        );
      }
      handleBlockTextDirection(dom);
      subTreeTextContent = previousSubTreeTextContent;
    }
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
  nextNodeMap
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
      reconcileNode(prevStartKey, dom, prevNodeMap, nextNodeMap);
      prevStartKey = prevChildren[++prevStartIndex];
      nextStartKey = nextChildren[++nextStartIndex];
    } else if (prevEndKey === nextEndKey) {
      reconcileNode(prevEndKey, dom, prevNodeMap, nextNodeMap);
      prevEndKey = prevChildren[--prevEndIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevStartKey === nextEndKey) {
      reconcileNode(prevStartKey, dom, prevNodeMap, nextNodeMap);
      dom.insertBefore(
        getDOMFromNodeKey(prevStartKey),
        getDOMFromNodeKey(prevEndKey).nextSibling
      );
      prevStartKey = prevChildren[++prevStartIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevEndKey === nextStartKey) {
      reconcileNode(prevEndKey, dom, prevNodeMap, nextNodeMap);
      dom.insertBefore(
        getDOMFromNodeKey(prevEndKey),
        getDOMFromNodeKey(prevStartKey)
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
          getDOMFromNodeKey(prevStartKey),
          nextNodeMap
        );
      } else {
        const keyToMove = prevChildren[indexInPrevChildren];
        if (keyToMove === nextStartKey) {
          reconcileNode(keyToMove, dom, prevNodeMap, nextNodeMap);
          if (hasClonedPrevChildren) {
            hasClonedPrevChildren = true;
            prevChildren = [...prevChildren];
          }
          prevChildren[indexInPrevChildren] = undefined;
          dom.insertBefore(
            getDOMFromNodeKey(keyToMove),
            getDOMFromNodeKey(prevStartKey)
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
      previousNode === undefined
        ? null
        : getDOMFromNodeKey(previousNode);
    buildChildren(
      nextChildren,
      nextStartIndex,
      nextEndIndex,
      dom,
      insertDOM,
      nextNodeMap
    );
  } else if (nextStartIndex > nextEndIndex) {
    destroyChildren(
      prevChildren,
      prevStartIndex,
      prevEndIndex,
      dom,
      prevNodeMap,
      nextNodeMap
    );
  }
}

export function reconcileViewModel(editorState) {
  const prevViewModel = editorState.currentViewModel;
  const nextViewModel = editorState.pendingViewModel;
  // TODO: take this value from Editor props, default to null;
  // This will over-ride any sub-tree text direction properties.
  forceTextDirection = null;
  subTreeTextContent = "";

  reconcileNode(
    "body",
    null,
    prevViewModel.nodeMap,
    nextViewModel.nodeMap
  );

  const nextSelection = nextViewModel.selection;
  if (nextSelection !== null) {
    const [anchorOffset, focusOffset] = nextSelection.getRangeOffsets();
    const domSelection = window.getSelection();
    const range = document.createRange();
    range.setStart(nextSelection.getAnchorDOM(), anchorOffset);
    range.setEnd(nextSelection.getFocusDOM(), focusOffset);
    range.collapse(true);
    domSelection.removeAllRanges();
    domSelection.addRange(range);
  }
}

export function storeDOMWithNodeKey(key, dom) {
  if (key === null) {
    throw new Error("storeDOMWithNodeKey failed");
  }
  dom.__outlineInternalRef = key;
  nodeKeyToDOM.set(key, dom);
}

export function getDOMFromNodeKey(key) {
  const elem = nodeKeyToDOM.get(key);
  if (elem === undefined) {
    throw new Error("getDOMFromNode failed for key " + key);
  }
  return elem;
}

export function getNodeKeyFromDOM(dom, nodeMap) {
  // Adjust target if dom is a text node
  const target = dom.nodeType === 3 ? dom.parentNode : dom;
  const key = target.__outlineInternalRef || null;
  return key;
}
