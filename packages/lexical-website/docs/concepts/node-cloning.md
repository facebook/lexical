# Node Cloning

Understanding how to properly clone and modify nodes is crucial for working with Lexical. This guide explains the different cloning mechanisms and when to use each one.

## Types of Node Cloning

Lexical provides several ways to clone nodes, each serving a different purpose:

1. `static clone()` - Internal API for state management
2. `$copyNode()` - Public API for creating new nodes
3. `getWritable()` - Public API for node modifications

## The `clone` Method

### What is `clone`?

The `clone` method is a static method required by all Lexical nodes that creates the next version of a node. However, it's important to understand that this is an **internal API** used by Lexical's state management system.

```typescript
class MyCustomNode extends ElementNode {
  static clone(node: MyCustomNode): MyCustomNode {
    // ✅ Correct implementation
    return new MyCustomNode(node.__someData, node.__key);
  }
}
```

### When is `clone` Used?

1. **Internal State Management**
   - Used by Lexical internally
   - Part of the editor's state update system
   - Called by `getWritable()`

2. **Node Mutations**
   ```typescript
   // Example of a node method implementation
   class MyCustomNode extends ElementNode {
     setData(data: string): this {
       const self = this.getWritable();
       self.__data = data;
       return self;
     }
   }

   node.setSomeData("new data");
   ```

### When NOT to Use `clone`?

```typescript
// ❌ Never do this
function $duplicateNode(node: MyCustomNode) {
  return MyCustomNode.clone(node); // Don't call clone directly
}
```

## Using `$copyNode`

### What is `$copyNode`?

`$copyNode` is the public API for creating a copy of a node with a new key. Use this when you need to create a duplicate node.

```typescript
// ✅ Correct: Using $copyNode
const copy = $copyNode(existingNode);
```

### When to Use `$copyNode`?

1. **Creating Duplicates**
   ```typescript
   // ✅ Correct: Duplicating a node
   const duplicate = $copyNode(originalNode);
   someParent.append(duplicate);
   ```

## Using `getWritable`

### What is `getWritable`?

`getWritable` is an internal API used within node method implementations to get a mutable version of a node. Node consumers should use the node's public methods instead.

```typescript
// ✅ Correct: Implementation of a node method
class MyCustomNode extends ElementNode {
  setData(data: string): this {
    const self = this.getWritable();
    self.__data = data;
    return self;
  }
}

// ✅ Correct: Using the node
const node = new MyCustomNode();
node.setData("new value");
```

## Common Patterns

### Modifying Nodes

```typescript
// ✅ Correct: Modifying a node
function $updateNodeData(node: MyCustomNode, newData: string): MyCustomNode {
  return node.setData(newData);
}

// ❌ Incorrect: Don't clone manually
function $updateNodeDataWrong(node: MyCustomNode, newData: string): MyCustomNode {
  const clone = MyCustomNode.clone(node);
  clone.setData(newData);
  return clone;
}
```

### Copying Nodes

```typescript
// ✅ Correct: Copying a node
function $duplicateNode(node: MyCustomNode): MyCustomNode {
  return $copyNode(node);
}

// ❌ Incorrect: Don't use clone
function $duplicateNodeWrong(node: MyCustomNode): MyCustomNode {
  return node.constructor.clone(node);
}
```

## Performance Considerations

1. **Referential Integrity**
   - `getWritable()` ensures proper EditorState updates with new clones
   - Prevents "orphaned" nodes that won't be rendered

2. **State Management**
   ```typescript
   class MyCustomNode extends ElementNode {
     setData(data: string): this {
       const self = this.getWritable();
       self.__data = data; // Properly tracked by editor
       return self;
     }
   }
   ```

## Testing

```typescript
test('node modification', async () => {
  await editor.update(() => {
    const node = new MyCustomNode("test");
    
    node.setData("new data");
    
    // ✅ Correct: Use $copyNode for duplication
    const copy = $copyNode(node);
  });
});
```

## Related Concepts

- [Editor State](editor-state.md) - How cloning affects editor state
- [Nodes](nodes.mdx) - Core concepts about Lexical nodes

## Common Questions

**Q: How do I duplicate a node?**
A: Use `$copyNode(node)` to create a new copy with a new key.

**Q: When should I use clone?**
A: Never directly. Use `$copyNode()` or `getWritable()` instead. 