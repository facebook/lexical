<script lang="ts">
	/**
	 * Copyright (c) Meta Platforms, Inc. and affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 *
	 */

	import { registerDragonSupport } from '@lexical/dragon';
	import { createEmptyHistoryState, registerHistory } from '@lexical/history';
	import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';
	import { mergeRegister } from '@lexical/utils';
	import { createEditor } from 'lexical';

	import prepopulatedRichText from '$lib/prepopulatedRichText';
	import { onMount } from 'svelte';

	let editorRef: HTMLElement;
	let stateRef: HTMLTextAreaElement;

	const initialConfig = {
		namespace: 'Vanilla JS Demo',
		// Register nodes specific for @lexical/rich-text
		nodes: [HeadingNode, QuoteNode],
		onError: (error: Error) => {
			throw error;
		},
		theme: {
			// Adding styling to Quote node, see styles.css
			quote: 'PlaygroundEditorTheme__quote'
		}
	};
	onMount(() => {
		const editor = createEditor(initialConfig);
		editor.setRootElement(editorRef);

		// Registering Plugins
		mergeRegister(
			registerRichText(editor),
			registerDragonSupport(editor),
			registerHistory(editor, createEmptyHistoryState(), 300)
		);

		editor.update(prepopulatedRichText, { tag: 'history-merge' });

		editor.registerUpdateListener(({ editorState }) => {
			stateRef!.value = JSON.stringify(editorState.toJSON(), undefined, 2);
		});
	});
</script>

<h1>SvelteKit Lexical Basic - Vanilla JS</h1>
<div class="editor-wrapper">
	<div id="lexical-editor" bind:this={editorRef} contenteditable></div>
</div>
<h4>Editor state:</h4>
<textarea id="lexical-state" bind:this={stateRef}></textarea>

<style>
	.editor-wrapper {
		border: 2px solid gray;
	}
	#lexical-state {
		width: 100%;
		height: 300px;
	}
	:global(.PlaygroundEditorTheme__quote) {
		margin: 0;
		margin-left: 20px;
		margin-bottom: 10px;
		font-size: 15px;
		color: rgb(101, 103, 107);
		border-left-color: rgb(206, 208, 212);
		border-left-width: 4px;
		border-left-style: solid;
		padding-left: 16px;
	}
</style>
