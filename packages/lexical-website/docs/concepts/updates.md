# Updates

Updates in Lexical are synchronous operations that mutate the editor state (except in nested update scenarios which should be deprecated). The reconciliation process (DOM updates) is batched for performance reasons. This batching of DOM updates means we can avoid unnecessary re-renders and optimize the rendering process.

## Update Tags

Update tags are string identifiers that can be attached to an update to indicate its type or purpose. They can be used to control how updates are processed, merged, or handled by listeners. Multiple tags can be used in a single update.

You can add tags in two ways:

1. Using the `tag` option in `editor.update()`:
```js
import {HISTORY_PUSH_TAG, PASTE_TAG} from 'lexical';

editor.update(() => {
  // Your update code
}, {
  tag: HISTORY_PUSH_TAG // Single tag
});

editor.update(() => {
  // Your update code
}, {
  tag: [HISTORY_PUSH_TAG, PASTE_TAG] // Multiple tags
});
```

2. Using the `$addUpdateTag()` function within an update:
```js
import {HISTORY_PUSH_TAG} from 'lexical';

editor.update(() => {
  $addUpdateTag(HISTORY_PUSH_TAG);
  // Your update code
});
```

You can check if a tag is present using `$hasUpdateTag()`:
```js
import {HISTORIC_TAG} from 'lexical';

editor.update(() => {
  $addUpdateTag(HISTORIC_TAG);
  console.log($hasUpdateTag(HISTORIC_TAG)); // true
});
```

Note: While update tags can be checked within the same update using `$hasUpdateTag()`, they are typically accessed in update and mutation listeners through the `tags` and `updateTags` properties in their respective payloads. Here's the more common usage pattern:

```js
import {HISTORIC_TAG} from 'lexical';

editor.registerUpdateListener(({tags}) => {
  if (tags.has(HISTORIC_TAG)) {
    // Handle updates with historic tag
  }
});

editor.registerMutationListener(MyNode, (mutations) => {
  // updateTags contains tags from the current update
  if (mutations.updateTags.has(HISTORIC_TAG)) {
    // Handle mutations with historic tag
  }
});
```

### Common Update Tags

Lexical provides several built-in update tags that are exported as constants:

- `HISTORIC_TAG`: Indicates that the update is related to history operations (undo/redo)
- `HISTORY_PUSH_TAG`: Forces a new history entry to be created
- `HISTORY_MERGE_TAG`: Merges the current update with the previous history entry
- `PASTE_TAG`: Indicates that the update is related to a paste operation
- `COLLABORATION_TAG`: Indicates that the update is related to collaborative editing
- `SKIP_COLLAB_TAG`: Indicates that the update should skip collaborative sync
- `SKIP_SCROLL_INTO_VIEW_TAG`: Prevents scrolling the selection into view
- `SKIP_DOM_SELECTION_TAG`: Prevents updating the DOM selection (useful for updates that shouldn't affect focus)

### Tag Validation

To prevent typos and ensure type safety when using update tags, Lexical exports constants for all built-in tags. It's recommended to always use these constants instead of string literals:

```js
import {
  HISTORIC_TAG,
  HISTORY_PUSH_TAG,
  COLLABORATION_TAG,
} from 'lexical';

editor.update(() => {
  // Using constants ensures type safety and prevents typos
  $addUpdateTag(HISTORIC_TAG);
  
  // These constants can be used in update options
  editor.update(() => {
    // Your update code
  }, {
    tag: HISTORY_PUSH_TAG
  });
  
  // And in listener checks
  editor.registerUpdateListener(({tags}) => {
    if (tags.has(COLLABORATION_TAG)) {
      // Handle collaborative updates
    }
  });
});
```

### Custom Tags

While Lexical provides common tags as constants, you can also define your own constants for custom tags to maintain consistency and type safety:

```js
// Define your custom tags as constants
const MY_FEATURE_TAG = 'my-custom-feature';
const MY_UPDATE_TAG = 'my-custom-update';

editor.update(() => {
  $addUpdateTag(MY_FEATURE_TAG);
}, {
  tag: MY_UPDATE_TAG
});

// Listen for updates with specific tags
editor.registerUpdateListener(({tags}) => {
  if (tags.has(MY_FEATURE_TAG)) {
    // Handle updates from your custom feature
  }
});
```
