/* eslint-disable strict */
declare type WindowSelection = {
  anchorNode: Node | null,
  anchorOffset: number,
  focusNode: Node | null,
  focusOffset: number,
  isCollapsed: boolean,
  // Note that this is non-exhaustive, I just defined
  // what we use. Used MDN for reference:
  // https://developer.mozilla.org/en-US/docs/Web/API/Selection
};
