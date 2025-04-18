<script lang="ts">
    import loadingGIF from "$lib/assets/loading.gif";
    const { src, alt } = $props();
    let loaded = $state(false);
    let retryCount = $state(0);
    let img: HTMLImageElement | undefined = $state();
    let currentSrc = $state(src);

    const maxAttempts = 10;
    const initialDelay = 500; // Start with 500ms
    const maxDelay = 5000; // Max 5 seconds between retries

    const loadImage = () => {
        if (!src) return;

        const newImg = new Image();
        newImg.src = src;

        newImg.onload = () => {
            loaded = true;
            img = newImg;
            currentSrc = src;
        };

        newImg.onerror = () => {
            if (retryCount < maxAttempts) {
                // Exponential backoff with jitter
                const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);

                setTimeout(() => {
                    retryCount++;
                    loadImage();
                }, delay);
            } else {
                console.error(`Failed to load image after ${maxAttempts} attempts: ${src}`);
                // You could set a fallback image here if desired
            }
        };
    };

    // TODO: Do we need both of these? Maybe merge them?
    // Initial load
    $effect(() => {
        if (src) {
            retryCount = 0;
            loadImage();
        }
    });

    // Watch for src changes
    $effect(() => {
        if (src && src !== currentSrc) {
            retryCount = 0;
            loadImage();
        }
    });
</script>

{#if loaded && img}
    <img src={currentSrc} {alt} bind:this={img} class="m-2" />
{:else}
    <img src={loadingGIF} alt="Loading..." class="m-2 inline opacity-50 grayscale" />
{/if}
