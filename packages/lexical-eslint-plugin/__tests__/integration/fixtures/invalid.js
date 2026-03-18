/**
 * Invalid example - should trigger rules-of-lexical error
 * This function calls $getRoot() but doesn't have $ prefix
 */
function invalidFunction() {
  return $getRoot();
}

module.exports = {invalidFunction};
