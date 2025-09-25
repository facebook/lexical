/**
 * We set up the editor (mostly) outside of .svelte files to avoid the
 * svelte/dollar_prefix_invalid compiler error because svelte
 * assigns special meaning that prefix and Lexical also has its
 * conventions around it.
 */

import { buildEditorFromExtensions, EditorStateExtension } from '@lexical/extension';
import { RichTextExtension } from '@lexical/rich-text';
import { TailwindExtension } from '@lexical/tailwind';
import { HistoryExtension } from '@lexical/history';
import { $generateNodesFromDOM } from '@lexical/html';
import { $insertGeneratedNodes } from '@lexical/clipboard';
import { AutoLinkExtension, ClickableLinkExtension } from '@lexical/link';
import { $addUpdateTag, $getEditor, HISTORY_MERGE_TAG } from 'lexical';
import { CheckListExtension } from '@lexical/list';
// @ts-expect-error -- broken types
import { withDOM } from '@lexical/headless/dom';
import { $selectAll, type InitialEditorStateType, type LexicalEditor } from 'lexical';

export const INITIAL_CONTENT = `
<h1>Welcome to the Svelte 5 Tailwind example!</h1>
<p></p>
<p>This example uses history, lists and the link extension! SSR is used for the editor.</p>
<p></p>
<blockquote>
	Quotes are supported.<br>
	Note that this initial state is hydrated from the content rendered by the server!<br>
	You won't find this string in the client-side javascript bundle: <code>SERVER_AND_HTML_ONLY</code>!<br>
	You should only find it in <code>.svelte-kit/output/server/</code>
</blockquote>

<p>See more:</p>

<ul>
<li><a href="https://lexical.dev/">lexical.dev</a></li>
<li><a href="https://svelte.dev/">svelte.dev</a></li>
</ul>
`.trim();

function $parseInitialHtml(html: string) {
	const parser = new window.DOMParser();
	const dom = parser.parseFromString(html, 'text/html');
	const editor = $getEditor();
	const nodes = $generateNodesFromDOM(editor, dom);
	$insertGeneratedNodes(editor, nodes, $selectAll());
	$addUpdateTag(HISTORY_MERGE_TAG);
}

export function $initialEditorStateServer() {
	withDOM(() => $parseInitialHtml(INITIAL_CONTENT));
}

export function prerenderHtml(editor: LexicalEditor) {
	return withDOM(({ document, getComputedStyle }: typeof globalThis.window) => {
		const el = document.createElement('div');
		const prevGetComputedStyle = globalThis.getComputedStyle;
		try {
			globalThis.getComputedStyle = getComputedStyle;
			editor.setRootElement(el);
		} finally {
			globalThis.getComputedStyle = prevGetComputedStyle;
		}
		const html = el.innerHTML;
		editor.setRootElement(null);
		return html;
	});
}

export function hydrate(editor: LexicalEditor, dom: HTMLElement) {
	editor.update(() => $parseInitialHtml(dom.innerHTML));
}

export function buildEditor($initialEditorState: InitialEditorStateType = null) {
	return buildEditorFromExtensions({
		name: '[root]',
		$initialEditorState,
		editable: false,
		dependencies: [
			RichTextExtension,
			TailwindExtension,
			HistoryExtension,
			AutoLinkExtension,
			ClickableLinkExtension,
			CheckListExtension,
			EditorStateExtension
		]
	});
}
