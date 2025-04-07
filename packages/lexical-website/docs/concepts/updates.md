# Updates

Updates in Lexical are the way you can mutate the editor state. All updates are run asynchronously and batched by default. This means that if you have multiple updates back-to-back, they'll be batched together and run in a single update. This is done for performance reasons, as it means we can avoid unnecessary re-renders and DOM updates.

## Update Tags

Update tags are string identifiers that can be attached to an update to indicate its type or purpose. They can be used to control how updates are processed, merged, or handled by listeners. Multiple tags can be used in a single update.

You can add tags in two ways:

1. Using the `tag` option in `editor.update()`:
```js
editor.update(() => {
  // Your update code
}, {
  tag: 'history-push' // Single tag
});

editor.update(() => {
  // Your update code
}, {
  tag: ['history-push', 'paste'] // Multiple tags
});
```

2. Using the `$addUpdateTag()` function within an update:
```js
editor.update(() => {
  $addUpdateTag('history-push');
  // Your update code
});
```

You can check if a tag is present using `$hasUpdateTag()`:
```js
editor.update(() => {
  $addUpdateTag('my-tag');
  console.log($hasUpdateTag('my-tag')); // true
});
```

Note: Update tags are cleared after each update. If you need to check for tags, make sure to do it within the same update callback where they were added.

### Common Update Tags

Lexical provides several built-in update tags that serve specific purposes:

- `historic`: Indicates that the update is related to history operations (undo/redo)
- `history-push`: Forces a new history entry to be created
- `history-merge`: Merges the current update with the previous history entry
- `paste`: Indicates that the update is related to a paste operation
- `collaboration`: Indicates that the update is related to collaborative editing
- `skip-collab`: Indicates that the update should skip collaborative sync
- `skip-scroll-into-view`: Prevents scrolling the selection into view
- `skip-dom-selection`: Prevents updating the DOM selection (useful for updates that shouldn't affect focus)

### Tag Validation

To help catch typos and ensure you're using known tags, you can enable tag validation by passing `true` as the second argument to `$addUpdateTag`:

```js
editor.update(() => {
  // Will warn if "unknown-tag" is not a known tag
  $addUpdateTag('unknown-tag', true);
  // Warning: "unknown-tag" is not a known update tag. This may be a typo. Known tags are: historic, history-push...
});
```

### Custom Tags

While Lexical provides common tags, you can also use custom tags for your own purposes. These are useful for tracking the source or purpose of updates in your application:

```js
editor.update(() => {
  $addUpdateTag('my-custom-feature');
}, {
  tag: 'my-custom-update'
});

// Listen for updates with specific tags
editor.registerUpdateListener(({tags}) => {
  if (tags.has('my-custom-feature')) {
    // Handle updates from your custom feature
  }
});
```
