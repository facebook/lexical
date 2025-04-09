# Understanding `__key` and `clone` in Lexical

## The `__key` Property

### What is `__key`?
The `__key` property is a unique identifier assigned to each node in the Lexical editor. It's used internally by Lexical to track and manage nodes within the editor state.

### When to Use `__key`?
1. **ONLY in Node Constructors**: The `__key` argument should ONLY be used when implementing a node's constructor.
2. **ONLY in Clone Methods**: The `__key` should ONLY be passed when implementing a node's static `clone` method.

### When NOT to Use `__key`?
1. Never manually create or manipulate `__key` values outside of constructors and clone methods
2. Never pass `__key` values between different nodes
3. Never store `__key` values for later use
4. Never use `__key` in application logic

```typescript
// ✅ Correct Usage - In Constructor
class MyCustomNode extends ElementNode {
  constructor(someData: string, key?: NodeKey) {
    super(key); // Correctly passing key to parent constructor
    this.__someData = someData;
  }
}

// ✅ Correct Usage - In Clone Method
static clone(node: MyCustomNode): MyCustomNode {
  return new MyCustomNode(node.__someData, node.__key);
}

// ❌ Incorrect Usage - Never do this
function someFunction(node: LexicalNode) {
  const key = node.__key; // Don't store or manipulate keys
  return new MyCustomNode(data, key); // Don't reuse keys
}
```

## The `clone` Method

### What is `clone`?
The `clone` method is a static method required by all Lexical nodes that creates a copy of a node. However, it's important to understand that this is an internal API used by Lexical's state management system.

### When is `clone` Used?
1. **Internal State Management**: Used by Lexical internally to manage the editor's state
2. **Node Mutations**: Used when creating new versions of nodes through `getWritable()`
3. **EditorState Updates**: Used during editor state updates

### When NOT to Use `clone`?
1. Never call `clone` directly in your application code
2. Never use `clone` to duplicate nodes for insertion
3. Never use `clone` to create copies of nodes for manipulation

```typescript
// ✅ Correct Usage - Implementing clone
class MyCustomNode extends ElementNode {
  static clone(node: MyCustomNode): MyCustomNode {
    return new MyCustomNode(node.__someData, node.__key);
  }
}

// ✅ Correct Usage - Getting a writable node
function updateNode(node: MyCustomNode) {
  const writableNode = node.getWritable(); // Uses clone internally
  writableNode.setSomeData("new data");
}

// ❌ Incorrect Usage - Never do this
function duplicateNode(node: MyCustomNode) {
  const copy = MyCustomNode.clone(node); // Don't call clone directly
  return copy;
}
```

## Best Practices

### Creating New Nodes
When you need to create a new node:
```typescript
// ✅ Correct
const newNode = new MyCustomNode("some data");

// ❌ Incorrect
const existingNode = $getNodeByKey(someKey);
const newNode = MyCustomNode.clone(existingNode);
```

### Modifying Nodes
When you need to modify a node:
```typescript
// ✅ Correct
node.getWritable().setSomeData("new data");

// ❌ Incorrect
const clone = MyCustomNode.clone(node);
clone.setSomeData("new data");
```

### Copying Nodes
When you need to create a copy of a node for insertion:
```typescript
// ✅ Correct
const copy = $copyNode(existingNode);

// ❌ Incorrect
const copy = ExistingNodeClass.clone(existingNode);
```

## Important Notes

1. The `clone` method is part of Lexical's internal API for state management
2. Always use `$copyNode()` when you need to create a copy of a node
3. Use `getWritable()` when you need to modify a node
4. Never manipulate `__key` values directly in your application code
5. Let Lexical handle all key management internally

Remember: `__key` and `clone` are internal implementation details of Lexical's state management system. Your application code should never need to work with them directly. 