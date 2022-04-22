const isApple = /(Mac|iPhone|iPad)/i.test(navigator.platform);

export const toolbarShortcut = {
  bold: isApple ? 'Bold (⌘B)' : 'Bold (Ctrl+B)',
  italic: isApple ? 'Italic (⌘I)' : 'Italic (Ctrl+I)',
  redo: isApple ? 'Redo (⌘Y)' : 'Undo (Ctrl+Y)',
  underline: isApple ? 'Underline (⌘U)' : 'Underline (Ctrl+U)',
  undo: isApple ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)',
};
