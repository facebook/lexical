import type {InputEvents} from './shared/useEditorEvents';
import type {LexicalEditor} from 'lexical';

import {useEditorEvents} from './shared/useEditorEvents';

export function useLexicalEditorEvents(
  events: InputEvents,
  editor: LexicalEditor,
): void {
  useEditorEvents(events, editor);
}