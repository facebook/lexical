import { effect, type Signal } from '@lexical/extension';

export function derivedFromSignal<T>(signal: Signal<T>): { readonly value: T } {
	let state = $state(signal.peek());
	$effect(() =>
		effect(() => {
			state = signal.value;
		})
	);
	return {
		get value() {
			return state;
		}
	};
}
