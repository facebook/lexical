<script lang="ts">
	import * as buildEditor from '$lib/buildEditor';
	import { browser } from '$app/environment';
	import * as utils from '@lexical/utils';
	import * as lexical from 'lexical';
	import * as extension from '@lexical/extension';

	let editorRef: HTMLElement;
	let exportJson = $state('');
	let initialState = browser ? null : buildEditor.$initialEditorStateServer;
	const editor = buildEditor.buildEditor(initialState);
	if (browser && import.meta.hot) {
		const { hot } = import.meta;
		editor.update(() => {
			if (hot.data.editorState) {
				lexical.$addUpdateTag(lexical.HISTORY_MERGE_TAG);
				initialState = hot.data.initialState;
				utils.$restoreEditorState(editor, hot.data.editorState);
			}
		});
		if (typeof hot.data.editable === 'boolean') {
			editor.setEditable(hot.data.editable);
		}
		$effect(() => {
			return utils.mergeRegister(
				editor.registerUpdateListener((payload) => {
					hot.data.editorState = payload.editorState;
				}),
				editor.registerEditableListener((editable) => {
					hot.data.editable = editable;
				})
			);
		});
	}
	let editable = $state(editor.isEditable());
	$effect(() => {
		return editor.registerEditableListener((nextEditable) => {
			editable = nextEditable;
		});
	});
	$effect(() => {
		if (browser && editorRef) {
			if (!initialState) {
				buildEditor.hydrate(editor, editorRef);
			}
			editor.setRootElement(editorRef);
		}
	});

	$effect(() => {
		const stateSignal = extension.getExtensionDependencyFromEditor(
			editor,
			extension.EditorStateExtension
		).output;
		return extension.effect(() => {
			exportJson = JSON.stringify(stateSignal.value, null, 2);
		});
	});
	const prerender = browser ? '<!-- server hydrated -->' : buildEditor.prerenderHtml(editor);
</script>

<svelte:head>
	<title>Lexical Extension + Svelte + Tailwind</title>
</svelte:head>

<header class="m-4">
	<h1 class="my-4 text-xl font-bold">Lexical Extension + Svelte + Tailwind</h1>
</header>
<main class="m-4">
	<div class="relative container mx-auto">
		<button
			class="mb-2 cursor-pointer border-0 bg-indigo-700 px-6 py-2.5 text-sm font-medium tracking-wider text-white outline-0 hover:bg-indigo-800"
			onclick={() => {
				editor.setEditable(!editable);
			}}>Toggle Editable {editable ? 'OFF' : 'ON'}</button
		>
		<div
			class="relative container mx-auto border border-solid p-4"
			bind:this={editorRef}
			contenteditable={editable}
		>
			<!-- svelte-ignore hydration_html_changed -->
			{@html browser ? '<!-- server hydrated -->' : prerender}
		</div>
	</div>
	<pre class="max-w-xl">{exportJson}</pre>
</main>
