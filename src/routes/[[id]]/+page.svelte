<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import {
        BoardStage,
        creatingReply,
        id,
        loading,
        posts,
        thread,
        boardStage,
        creatingPostImageBlob,
        creatingPostTitleText,
        creatingPostDescriptionText,
        searchText,
        creatingPostFormData
    } from "$lib/index.svelte";
    import type { Post, Reply } from "$lib/index.svelte";
    import { onMount } from "svelte";
    import { createdDateFormatter, hashToColor } from "$lib/client/clientUtils";
    import { pushState } from "$app/navigation";
    import Logo from "$lib/assets/logo.png";
    import CreateIcon from "$lib/assets/create_icon.png";
    import SettingsIcon from "$lib/assets/settings_icon.png";
    import DiscordIcon from "$lib/assets/discord_icon.png";
    import Corkboard from "../../components/Corkboard.svelte";
    import type { PageData } from "./$types";
    import Image from "../../components/Image.svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { settings } from "$lib/globals.svelte";

    let { data }: { data: PageData } = $props();
    let replyForm: HTMLFormElement;

    $id = data.id;

    $posts = data.board;

    let settingsPage = $state(false);
    let alertMessage = $state("");

    const ratelimitMessage = "You have been rate limited. Calm down!!";

    onMount(() => {
        $effect(() => {
            localStorage.setItem("corkboard_settings", JSON.stringify(settings));
            // console.log("SETTINGS", settings);
        });

        id.subscribe(async (v) => {
            if (v === undefined) return;
            if (v === data.id) {
                $thread = data.post;
            } else {
                const threadRequest = await fetch(`/api/post?id=${v}`);
                if (threadRequest.status === 429) {
                    alertMessage = ratelimitMessage;
                } else if (threadRequest.ok) {
                    $thread = await threadRequest.json();
                }
            }
            $loading = true;
            try {
                pushState(`/${v || ""}`, {});
            } catch (e) {
                console.warn("Failed to update URL", e);
            }
            $loading = false;
            console.log("SELECTED ID", $id);
        });

        const refresh = async () => posts.set(await (await fetch("/api/board")).json());

        // Gives us updates on new posts & replies.
        const updateWebSocket = new WebSocket(
            "wss://f59d4c8ub7.execute-api.eu-west-2.amazonaws.com/$default"
        );
        let dead = false;
        updateWebSocket.onopen = () => {
            console.log("Connected to WebSocket API");
            dead = false;
        };
        updateWebSocket.onmessage = async (event) => {
            console.log("WEBSOCKET", event.data);
            const { newPosts, newReplies }: { newPosts: string[]; newReplies: string[] } =
                JSON.parse(event.data);
            if (newPosts) {
                await refresh();
            }

            if (newReplies) {
                for (const newReply of newReplies) {
                    // TODO: We could optimize this by only messaging users with new replies in the thread currently on by adding a "currentThread" column to the connections table
                    // Only update if its the current thread
                    if (newReply.substring(5) === $id) {
                        $thread = await (await fetch(`/api/post?id=${$id}`)).json();
                    }
                }
                await refresh();
            }
        };
        updateWebSocket.onclose = () => {
            console.log("WebSocket connection closed");
            dead = true;
        };
        updateWebSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        pins = new SvelteMap(Object.entries(JSON.parse(localStorage.getItem("pins") || "{}")));

        $effect(() => {
            localStorage.setItem("pins", JSON.stringify(Object.fromEntries(pins)));
        });
    });

    const enterSubmit = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            replyForm.requestSubmit();
        }
    };

    // TODO: Not sure if it's SubmitEvent
    const createReply = (f: SubmitEvent) => {
        f.preventDefault();
        const formData = new FormData(f.target as HTMLFormElement);

        if ($id === undefined) {
            alert("No post selected??");
            return;
        }

        const message = formData.get("content") as string;
        if (message.trim().length === 0) {
            return;
        }

        formData.append("postId", $id);

        const call = fetch("/api/reply", {
            method: "POST",
            body: formData
        });

        // @ts-ignore
        window.umami.track("create_reply");

        $loading = true;
        call.then(async (result) => {
            $creatingReply = false;
            $loading = false;

            if (result.status === 429) {
                alertMessage = ratelimitMessage;
            } else if (result.ok) {
                $thread = await result.json();
                replyForm.reset();

                // Apparently a 500 isn't an error lol
                if (settings.pinOnReply) {
                    pinPost($thread.post.postId);
                }
            } else {
                let { message } = await result.json();
                alertMessage = message;
            }
        }).catch((err) => {
            console.error(err);
            alert(`Error... DM Zelo101 with a screenshot of the error:\n\n${err.message}`);
        });
    };

    const createPost = () => {
        const formData = $creatingPostFormData;
        console.log($creatingPostFormData.get("x"), $creatingPostFormData.get("y"));
        const call = fetch("/api/post", {
            method: "POST",
            body: formData
        });

        // @ts-ignore
        window.umami.track("create_post");

        $loading = true;
        call.then(async (result) => {
            $loading = false;
            $boardStage = BoardStage.Placed;

            if (result.status === 429) {
                alertMessage = ratelimitMessage;
            } else if (result.ok) {
                const postId = await result.json();

                $id = postId;

                $creatingPostTitleText = "";
                $creatingPostDescriptionText = "";
            } else {
                let { message } = await result.json();
                alertMessage = message;
            }
        }).catch((err) => {
            console.error(err);
            alert(`Error... DM Zelo101 with a screenshot of the error:\n\n${err.message}`);
        });
    };

    const operateCreatingPostStage = () => {
        if ($boardStage === BoardStage.None) {
            $boardStage = BoardStage.Creating;
        } else if ($boardStage === BoardStage.Creating) {
            $boardStage = BoardStage.None;
        }

        // ignore when PostStage.Placing
    };

    const getPostURL200 = (id: string) =>
        `https://drzkh14a10zed.cloudfront.net/200/${id.substring(3)}`;
    const getPostURLOG = (id: string) => `https://drzkh14a10zed.cloudfront.net/${id}`;

    let selectedImage = $state<string | null>(null);

    let pins = $state(new SvelteMap<string, number>());

    const pinPost = (postId: string) => {
        pins.set(postId, Date.now());
    };

    const isPinned = (postId: string) => {
        return pins.has(postId);
    };

    const unpinPost = (postId: string) => {
        pins.delete(postId);
    };

    const getUsername = (creator: string) => (creator ? "Anonymous" : "Unknown");
</script>

<svelte:head>
    {#if $thread}
        {@const sliced = $thread.post.content.length > 200}
        {@const content = sliced
            ? $thread.post.content.slice(0, 200) + "(...)"
            : $thread.post.content}
        <title>{$thread.post.title} - corkboard</title>
        <meta name="description" {content} />
        <!--        <meta property="og:image" content="https://embed.zelo.dev/corkboard-embedgen-sharp?id={$thread.post.postId}">-->
        <meta name="twitter:card" content="summary_large_image" />
    {:else}
        <title>corkboard</title>
        <meta name="description" content="Create a post and pin it to a board!" />
    {/if}
    {#if settings.normalFont}
        <style>
            body {
                font-family: sans-serif !important;
                font-weight: bold !important;
            }
        </style>
    {/if}
</svelte:head>

{#snippet r(reply: Reply, index: number)}
    {@const previousReply = $thread?.replies[index - 1]}
    {@const sameAuthorAbove = previousReply?.creator === reply.creator}
    {@const similarTimeAsAbove =
        previousReply &&
        Math.abs(new Date(reply.created).getTime() - new Date(previousReply.created).getTime()) <
            3600000}
    <!-- TODO: This has a problem of if replies are in 1 minute intervals it'll never show the time-->
    <div>
        <div
            class="flex flex-row-reverse justify-between"
            style="height: {!sameAuthorAbove ? '100%' : '0'}"
        >
            {#if similarTimeAsAbove}
                <span class="text-xs opacity-25 max-sm:text-xs"
                    >{createdDateFormatter(reply.created)}</span
                >
            {:else}
                <span class="text-sm max-sm:text-xs">{createdDateFormatter(reply.created)}</span>
            {/if}
            {#if !sameAuthorAbove}
                <span class="text-sm max-sm:text-xs" style="color: {hashToColor(reply.creator)}">
                    {getUsername(reply.creator)}
                </span>
            {/if}
        </div>
        {#if reply.files.length}
            {@const file = reply.files[0]}
            <button onclick={() => (selectedImage = getPostURLOG(file))} class="block h-full">
                <Image src={getPostURL200(file)} alt={file} />
            </button>
        {/if}
        {#if sameAuthorAbove}
            <p class="px-2.5 text-xl max-sm:text-3xl">{reply.content}</p>
        {:else}
            <p class="px-2.5 text-xl max-sm:text-3xl">{reply.content}</p>
        {/if}
    </div>
{/snippet}

{#snippet settingsOption(name: string, key: string, description?: string)}
    <div>
        <label for={name}>{name}</label>
        <input
            {name}
            bind:checked={settings[key]}
            type="checkbox"
            class="rounded bg-green-50 dark:bg-neutral-500 dark:text-neutral-100"
        />
        {#if description}
            <p class="mb-2 text-sm text-zinc-900">{description}</p>
        {/if}
    </div>
{/snippet}

{#snippet pin(postId: string)}
    <!-- TODO: This will fail if posts gets deleted while pinned -->
    {@const post = $posts.find((p) => p.postId === postId)}
    <button onclick={() => ($id = postId.slice(5))}>
        <img
            src={getPostURL200(post!.files[0])}
            alt={post!.title}
            title={post!.title}
            class="h-24 w-24 rounded object-cover ring-2 ring-black"
            width="96"
            height="96"
        />
    </button>
{/snippet}

{#snippet theme(name: string)}
    <div class="ring-2 ring-black">
        <img
            src="/favicon.png"
            style="filter: hue-rotate({Math.random() * 360}deg)"
            width="64"
            height="64"
            alt={name}
        />
    </div>
{/snippet}

<a href="/">
    <img id="logo" src={Logo} alt="corkboard logo" class="m-auto p-5 brightness-150 grayscale" />
</a>
<main class="mx-5 flex justify-center gap-5 max-lg:flex-col">
    <section class="top-5 mb-5 flex h-fit grow flex-col items-center gap-2 lg:sticky">
        <Corkboard {pins} />
        <div id="menu" class="flex w-1/2 justify-center gap-3">
            <button
                class="cb-input bg-green-400 text-5xl ring-green-500 hover:bg-green-500"
                onclick={operateCreatingPostStage}
                ><img src={CreateIcon} alt="Create" width="64" height="64" class="p-3" /></button
            >
            <input
                type="text"
                name="search"
                placeholder="Search"
                disabled={$boardStage !== BoardStage.None}
                class="cb-mask cb-border max-w-1/2 flex h-16 grow items-center justify-center rounded bg-white p-4 text-3xl ring-2 ring-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-700 dark:text-gray-300"
                oninput={(s) => ($searchText = s.target.value.trim())}
            />
            <button
                class="cb-input bg-neutral-400 text-5xl ring-neutral-500 hover:bg-neutral-500"
                onclick={() => (settingsPage = !settingsPage)}
                ><img
                    src={SettingsIcon}
                    alt="Settings"
                    width="64"
                    height="64"
                    class="p-3"
                /></button
            >
            <a
                href="https://discord.gg/YVuuF9KB5j"
                class="cb-input bg-indigo-400 text-5xl ring-indigo-500 hover:bg-indigo-500"
                ><img src={DiscordIcon} alt="Discord Link" width="64" height="64" class="p-2" /></a
            >
        </div>
        {#if $boardStage === BoardStage.Creating}
            <form
                transition:fly={{ y: 100 }}
                class="flex flex-col gap-2 pt-2 lg:w-1/2"
                method="post"
                enctype="multipart/form-data"
                onsubmit={(e) => {
                    e.preventDefault();
                    $creatingPostFormData = new FormData(e.target);
                    //console.log(e)
                    //console.log($creatingPostFormData, "W");
                    $boardStage = BoardStage.Placing;
                }}
            >
                <div
                    class="cb-border cb-mask flex flex-col gap-2 rounded bg-white px-4 py-4 dark:bg-neutral-500"
                >
                    <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        maxlength="64"
                        class="rounded bg-white px-2 py-1 text-4xl dark:bg-neutral-700 dark:text-neutral-100"
                        bind:value={$creatingPostTitleText}
                        required
                    />
                    <textarea
                        name="content"
                        placeholder="Message"
                        maxlength="2048"
                        required
                        class="rounded bg-white px-2 py-1 dark:bg-neutral-700 dark:text-neutral-100"
                        bind:value={$creatingPostDescriptionText}
                    >
                        <p>{$creatingPostDescriptionText.length}</p>
                    </textarea>
                    <div class="flex justify-center gap-4">
                        <input
                            type="file"
                            name="file"
                            accept="image/jpeg, image/png"
                            placeholder="Images"
                            class="rounded bg-green-50 dark:bg-neutral-500 dark:text-neutral-100"
                            onchange={(s) => ($creatingPostImageBlob = s.target.files[0])}
                            required={false}
                        />
                    </div>
                    <span class="px-1 text-right text-xs text-zinc-200">File limits are 3MB</span>
                    <input
                        type="submit"
                        value="Post!"
                        class="cursor-pointer rounded bg-green-100 p-2 text-2xl transition-colors hover:bg-green-300 dark:bg-green-600 dark:text-neutral-200 dark:hover:bg-green-700"
                    />
                    <!--                <p>The first image will be used in the corkboard.</p>-->
                </div>
            </form>
        {/if}
        {#if $boardStage === BoardStage.Placing}
            <input
                transition:fly={{ y: 100 }}
                type="submit"
                value="Place!"
                class="cb-input w-full cursor-pointer bg-lime-300 p-5 text-4xl hover:bg-lime-400"
                onclick={createPost}
            />
        {/if}
        {#if settingsPage}
            <!-- TODO: Create a settings component? -->
            <section class="flex w-full justify-around" transition:fade={{ duration: 200 }}>
                <div>
                    <h1 class="text-4xl">General</h1>
                    {@render settingsOption("Pin on reply", "pinOnReply")}
                    <br />
                    <h2 class="text-2xl">Pinned</h2>
                    <div class="flex flex-wrap gap-2">
                        {#if pins}
                            {#each pins.keys() as ids}
                                {@render pin(ids)}
                            {/each}
                        {/if}
                    </div>
                    <br />
                    <!-- <p class="text-sm text-zinc-900">Click to unpin</p> -->
                    <!-- <h2 class="text-2xl">Themes</h2>
                    <div class="flex gap-2">
                        {#each ["Green", "Blue", "Red", "Purple", "Classic"] as item}
                            {@render theme(item)}
                        {/each}
                    </div> -->
                </div>
                <div>
                    <h1 class="text-4xl">Accessibility</h1>
                    <!-- <span class="text-sm text-zinc-900">
                        You may need to refresh to see the changes.
                    </span> -->
                    {@render settingsOption("Sans Serif Font", "normalFont")}
                    <!-- {@render settingsOption(
                        "Screen reader accessible corkboard",
                        "screenReader",
                        "This will turn the corkboard into a list."
                    )} -->
                </div>
            </section>
        {/if}
    </section>
    {#if $thread}
        <!--{console.log("e", $post)}-->
        <aside class="cb-mask mb-4 grow-[2] px-4 dark:text-gray-300">
            <!--{#each data.post as reply}-->
            <!--            <p>{JSON.stringify(post, 0, 2)}</p>-->
            <div>
                <div class="flex justify-between">
                    <div class="flex w-full">
                        {#if isPinned($thread.post.postId)}
                            <button
                                data-umami-event="unpin_post"
                                onclick={() => unpinPost($thread.post.postId)}
                                class="mr-1.5 h-6 bg-emerald-700 px-2 text-white"
                            >
                                Unpin +
                            </button>
                        {:else}
                            <button
                                data-umami-event="pin_post"
                                onclick={() => pinPost($thread.post.postId)}
                                class="mr-1.5 h-6 bg-emerald-600 px-2 text-white"
                            >
                                Pin +
                            </button>
                        {/if}
                        <!-- <span class="mr-1.5 h-6 bg-neutral-700 px-2 text-white">?</span> -->
                        <span
                            class="max-sm:text-2xl"
                            style="color: {hashToColor($thread.post.creator)}"
                            >{getUsername($thread.post.creator)}</span
                        >
                    </div>
                    <div class="w-full">
                        <span class="max-sm:text-2xl"
                            >{createdDateFormatter($thread.post.created)}</span
                        >
                    </div>
                </div>
                <p class="text-4xl max-sm:text-6xl">{$thread.post.title}</p>
                <div class="inline">
                    {#each $thread.post.files as file}
                        <button
                            onclick={() => (selectedImage = getPostURLOG(file))}
                            class="block h-full"
                        >
                            <Image src={getPostURL200(file)} alt={file} />
                        </button>
                    {/each}
                </div>
                <span class="px-2.5 text-xl">{$thread.post.content}</span>
            </div>
            {#each $thread.replies as reply, i}
                {@render r(reply, i)}
            {/each}
            <hr />
            <form
                bind:this={replyForm}
                method="post"
                enctype="multipart/form-data"
                onsubmit={createReply}
            >
                <div class="mt-2 flex flex-col rounded bg-white p-0.5 dark:bg-neutral-500">
                    <textarea
                        name="content"
                        maxlength="2048"
                        placeholder="↵ to Send, Shift + ↵ for new line"
                        class="m-1 bg-white p-1 text-xl dark:bg-neutral-600 dark:text-neutral-100"
                        onkeydown={enterSubmit}
                    ></textarea>
                    <div class="flex justify-center p-1">
                        <input
                            type="file"
                            name="file"
                            placeholder="Images"
                            accept="image/jpeg, image/png, image/gif, image/webp"
                            class="rounded bg-green-50 dark:bg-neutral-500 dark:text-neutral-100"
                        />
                    </div>
                    <span class="px-1 text-right text-xs text-zinc-200">File limits are 3MB</span>
                </div>
            </form>
        </aside>
    {/if}
</main>
{#if selectedImage}
    <style>
        body {
            overflow: hidden;
            padding-right: 8px;
        }
    </style>
    <dialog
        open
        transition:fade={{ duration: 200 }}
        class="fixed inset-0 z-50 h-screen w-screen bg-black/50"
    >
        <!-- TODO: Allow users to upload alt text with images -->
        <div class="fixed inset-0 flex items-center justify-center">
            <img src={selectedImage} alt="" class="max-h-[90vh] max-w-[90vw]" />
        </div>
        <button
            onclick={() => (selectedImage = null)}
            class="fixed right-4 top-4 text-6xl text-white hover:text-neutral-300"
        >
            🗙
        </button>
    </dialog>
{/if}
{#if alertMessage}
    <style>
        body {
            overflow: hidden;
            padding-right: 8px;
        }
    </style>
    <dialog
        open
        transition:fade={{ duration: 200 }}
        class="fixed inset-0 z-50 h-screen w-screen bg-black/50"
    >
        <!-- TODO: Allow users to upload alt text with images -->
        <div class="fixed inset-0 flex items-center justify-center">
            <div class="rounded-lg bg-black p-4">
                <h1 class="text-4xl text-white">Alert</h1>
                <p class="p-8 text-xl text-red-500">{alertMessage}</p>
                <button
                    onclick={() => (alertMessage = "")}
                    class="w-full text-xl text-blue-500 underline hover:text-neutral-300"
                >
                    Okay...
                </button>
            </div>
        </div>
    </dialog>
{/if}

<style>
    #logo {
        image-rendering: pixelated;
    }

    #menu img {
        image-rendering: pixelated;
        opacity: 50%;
        background-blend-mode: color;
    }
</style>
