import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from "svelte-kit-sst";

export default {
	preprocess: vitePreprocess(),

	kit: {
		// default options are shown
		adapter: adapter()
	}
};