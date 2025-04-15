<script lang="ts">
    import loadingGIF from "$lib/assets/loading.gif";
    const { src, alt } = $props();
    let loaded = $state(false);
    let retryCount = $state(0);

    const maxAttempts = 10;
    const delay = 200; // milliseconds

    const onload = () => {
        loaded = true;
    };

    const onerror = () => {
        if (retryCount < maxAttempts) {
            retryCount++;
            setTimeout(() => {
                const img = new Image();
                img.src = src;
                img.onload = onload;
                img.onerror = onerror;
            }, delay * retryCount);
        } else {
            // TODO: Show error image
            console.error(`ERROR: Failed to load ${src} after ${maxAttempts} attempts`);
        }
    };
</script>

{#if loaded}
    <img {src} {alt} class="m-2" />
{:else}
    <img {src} {alt} {onload} {onerror} class="hidden" />
    <img src={loadingGIF} alt="Loading..." class="m-2 inline opacity-50 grayscale" />
{/if}
