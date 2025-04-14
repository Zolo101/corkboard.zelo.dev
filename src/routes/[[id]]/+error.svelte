<script lang="ts">
    import { page } from "$app/stores";
</script>

<main class="flex h-full flex-col items-center justify-center gap-4">
    <img src="/corkboard_404.png" alt="logo" class="w-1/3" style="image-rendering: pixelated" />
    <h1 class="text-6xl">{$page.status}: {$page.error?.message}</h1>
    <a href="/" class="text-3xl text-blue-500">I don't care</a>
</main>
