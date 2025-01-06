import { vitePreprocess } from "@sveltejs/kit/vite";
import adapter from "svelte-kit-sst";

export default {
	preprocess: vitePreprocess(),

	kit: {
		// default options are shown
		adapter: adapter()
	}
};