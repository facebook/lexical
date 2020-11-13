/* eslint-disable strict */
// Flow comes with a pretty good library definitions for React, and it
// includes a type for useRef but no definition for the ref object itself.
declare type RefObject<T> = {current: null | T};
