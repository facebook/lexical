/**
 * Valid example - $function calling another $function
 */
function $createMyNode() {
  return $getRoot();
}

/**
 * Valid example - using editor.update
 */
function validUsesUpdate(editor) {
  editor.update(() => {
    const root = $getRoot();
    return root;
  });
}

/**
 * Valid example - class method can call $functions
 */
class MyNode {
  createChild() {
    return $createTextNode('hello');
  }
}

module.exports = {$createMyNode, validUsesUpdate, MyNode};
