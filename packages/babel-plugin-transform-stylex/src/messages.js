/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const ILLEGAL_REQUIRE =
  "require('stylex') must be bound to a variable called stylex. See https://fburl.com/wiki/of6hv3f6";
const ILLEGAL_IMPORT =
  "import stylex from 'stylex'; must be bound to a variable called stylex. See https://fburl.com/wiki/of6hv3f6";
const ILLEGAL_ARGUMENT_LENGTH =
  'stylex() should have 1 argument. See https://fburl.com/wiki/of6hv3f6';
const NON_STATIC_VALUE =
  'Only static values are allowed inside of a stylex.create() call. See https://fburl.com/wiki/of6hv3f6';
const ESCAPED_STYLEX_VALUE =
  'Escaping a stylex.create() value is not allowed. https://fburl.com/wiki/r7ek1kbr';
const UNBOUND_STYLEX_CALL_VALUE =
  'stylex.create calls must be bound to a bare variable. See https://fburl.com/wiki/of6hv3f6';
const ONLY_TOP_LEVEL =
  'stylex.create() is only allowed at the root of a program. See https://fburl.com/wiki/of6hv3f6';
const NON_OBJECT_FOR_STYLEX_CALL =
  'stylex.create() can only accept a style object. See https://fburl.com/wiki/of6hv3f6';
const UNKNOWN_PROP_KEY = 'Unknown property key';
const INVALID_PSEUDO =
  'Invalid pseudo selector, not on the whitelist. See https://fburl.com/wiki/5k4dppm8';
const ILLEGAL_NAMESPACE_TYPE =
  'Only a string literal namespace is allowed here. See https://fburl.com/wiki/tj9ppp8v';
const UNKNOWN_NAMESPACE = 'Unknown namespace';
const ILLEGAL_NESTED_PSEUDO =
  "Pseudo objects can't be nested. See https://fburl.com/wiki/q7q1aie8";
const ILLEGAL_PROP_VALUE =
  'A style value can only contain an array, string or number. See https://fburl.com/wiki/pre5uib6';
const ILLEGAL_PROP_ARRAY_VALUE =
  'A style array value can only contain strings or numbers. See https://fburl.com/wiki/zdvdlk9p';
const ILLEGAL_NAMESPACE_VALUE =
  'A stylex namespace must be an object. See https://fburl.com/wiki/tj9ppp8v';
const INVALID_SPREAD =
  'Imported styles spread with a stylex.create call must be type cast as `XStyle<>` to verify their type.';
const LINT_UNCLOSED_FUNCTION = 'Rule contains an unclosed function';
const LOCAL_ONLY =
  'The return value of stylex.create() should not be exported. ' +
  'See https://fburl.com/wiki/t8u68x5n';
const UNEXPECTED_ARGUMENT =
  'Unexpected argument passed to the stylex() function.';
const EXPECTED_FUNCTION_CALL =
  'Expected a simple function call but found something else.';

module.exports = {
  ILLEGAL_PROP_ARRAY_VALUE,
  ILLEGAL_NAMESPACE_VALUE,
  ILLEGAL_PROP_VALUE,
  ILLEGAL_NESTED_PSEUDO,
  INVALID_PSEUDO,
  UNKNOWN_NAMESPACE,
  ILLEGAL_NAMESPACE_TYPE,
  UNKNOWN_PROP_KEY,
  ILLEGAL_REQUIRE,
  ILLEGAL_IMPORT,
  ILLEGAL_ARGUMENT_LENGTH,
  INVALID_SPREAD,
  NON_STATIC_VALUE,
  ESCAPED_STYLEX_VALUE,
  ONLY_TOP_LEVEL,
  UNBOUND_STYLEX_CALL_VALUE,
  NON_OBJECT_FOR_STYLEX_CALL,
  LINT_UNCLOSED_FUNCTION,
  LOCAL_ONLY,
  UNEXPECTED_ARGUMENT,
  EXPECTED_FUNCTION_CALL,
};
