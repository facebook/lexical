import type {LexicalEditor} from 'lexical';
import useList from './shared/useList';
export default function useLexicalList(editor: LexicalEditor): void {
  useList(editor);
}