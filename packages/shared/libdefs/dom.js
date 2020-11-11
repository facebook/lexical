/* eslint-disable strict */
declare type WindowSelection = {
  isCollapsed: boolean,
  anchorNode: Node | null,
  focusNode: Node | null,
  anchorOffset: number,
  focusOffset: number,
  // Note that this is non-exhaustive, I just defined
  // what we use. Used MDN for reference:
  // https://developer.mozilla.org/en-US/docs/Web/API/Selection
};
