<script lang="ts">
	import * as buildEditor from '$lib/buildEditor';
	import { browser } from '$app/environment';
	import * as extension from '@lexical/extension';
	import { derivedFromSignal } from '$lib/derivedFromSignal.svelte';

	let editorRef: HTMLElement;
	let exportJson = $state('');
	let initialState = browser ? null : buildEditor.$initialEditorStateServer;
	const editor = buildEditor.buildEditor(initialState, browser ? import.meta.hot : undefined);
	const stateSignal = extension.getExtensionDependencyFromEditor(
		editor,
		extension.EditorStateExtension
	).output;
	const editableSignal = extension.getExtensionDependencyFromEditor(
		editor,
		buildEditor.WatchEditableExtension
	).output;
	let editableValue = derivedFromSignal(editableSignal);
	let stateValue = derivedFromSignal(stateSignal);
	$effect(() => {
		if (browser && editorRef) {
			buildEditor.hydrate(editor, editorRef);
			editor.setRootElement(editorRef);
		}
	});
	$effect(() => {
		exportJson = JSON.stringify(stateValue.value, null, 2);
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
				editor.setEditable(!editableValue.value);
			}}>Toggle Editable {editableValue.value ? 'OFF' : 'ON'}</button
		>
		<div
			class="relative container mx-auto border border-solid p-4"
			role="textbox"
			data-lexical-editor="true"
			bind:this={editorRef}
			contenteditable={editableValue.value}
		>
			<!-- svelte-ignore hydration_html_changed -->
			{@html browser ? '<!-- server hydrated -->' : prerender}
		</div>
	</div>
	<pre class="max-w-xl">{exportJson}</pre>
</main>
