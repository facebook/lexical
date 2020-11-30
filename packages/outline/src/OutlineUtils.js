// @flow strict

let keyCounter = 0;

// inviariant(condition, message) will refine types based on "condition", and
// if "condition" is false will throw an error. This functio is special-cased
// in flow itself, so we can't name it anything else.
export function invariant(cond: boolean, message: string) {
  if (!cond) {
    const err = new Error(message);
    err.name = 'Invariant Violation';
    throw err;
  }
}

export function generateRandomKey(): string {
  return '#' + keyCounter++;
}
