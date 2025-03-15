export function jsonEqualish(actual: any, expected: any) {
  if (Object.is(actual, expected)) {
    return true;
  }

  // For non-objects, use Object.is. This will cause 'undefined' and 'null' to
  // be different, as desired.
  if (
    !actual ||
    !expected ||
    (typeof actual !== 'object' && typeof expected !== 'object')
  ) {
    // Except for numbers, since we want '-0' and '+0' to be equivalent
    //
    // (We should really just use JSON.stringify here. Might be slower but would
    // it matter?)
    return typeof actual === 'number'
      ? actual === expected
      : Object.is(actual, expected);
  }

  return objEquiv(actual, expected);
}

function objEquiv(a: any, b: any) {
  if (typeof a !== typeof b) {
    return false;
  }

  if (a instanceof Date) {
    return b instanceof Date && a.getTime() == b.getTime();
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  // We only deal with POD at the moment.
  if (
    (a.constructor && a.constructor !== Object && a.constructor !== Array) ||
    (b.constructor && b.constructor !== Object && b.constructor !== Array)
  ) {
    throw new Error('Trying to compare something fancy');
  }

  const aKeys = definedKeys(a);
  const bKeys = definedKeys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  aKeys.sort();
  bKeys.sort();

  // Compare keys first
  for (let i = 0; i < aKeys.length; ++i) {
    if (aKeys[i] != bKeys[i]) {
      return false;
    }
  }

  // Compare values
  for (const key of aKeys) {
    if (!jsonEqualish(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

function definedKeys(a: any) {
  return Object.keys(a).filter(key => typeof a[key] !== 'undefined');
}