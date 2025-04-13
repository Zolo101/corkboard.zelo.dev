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
        searchText,
        creatingPostFormData
    } from "../../lib/index.svelte";
    import type { Post, Reply } from "$lib/index.svelte";
    import { onMount } from "svelte";
    import { createdDateFormatter } from "$lib/client/clientUtils";
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
                $thread = await (await fetch(`/api/post?id=${v}`)).json();
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

        const refresh = async () => posts.set(await (await fetch(`/api/board`)).json());

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

        follows = new SvelteMap(
            Object.entries(JSON.parse(localStorage.getItem("follows") || "{}"))
        );

        $effect(() => {
            localStorage.setItem("follows", JSON.stringify(Object.fromEntries(follows)));
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
        // formData.append("creator", "4jfbbn1krnrsspo")
        console.log([...formData.entries()]);

        const call = fetch("/api/reply", {
            method: "POST",
            body: formData
        });

        $loading = true;
        call.then(async (result) => {
            replyForm.reset();
            $thread = await result.json();
            $creatingReply = false;
            $loading = false;
        }).catch((err) => {
            console.error(err);
            alert(`Error... DM Zelo101 with a screenshot of the error:\n\n${err.message}`);
        });
    };

    const createPost = () => {
        $creatingPostFormData.set("creator", "4jfbbn1krnrsspo"); // Anonymous

        const formData = $creatingPostFormData;
        console.log($creatingPostFormData.get("x"), $creatingPostFormData.get("y"));
        const call = fetch("/api/post", {
            method: "POST",
            body: formData
        });

        $loading = true;
        call.then(async (result) => {
            const postId = await result.json();
            $boardStage = BoardStage.Placed;

            // removing these two because the resizer does not resize in time for the image to be shown
            // so instead im doing this at the createPostSprite function in Corkboard.svelte
            $loading = false;
            $id = postId;

            // await refresh();
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

    let follows = $state(new SvelteMap<string, number>());

    const followPost = (postId: string) => {
        follows.set(postId, Date.now());
    };

    const isFollowing = (postId: string) => {
        return follows.has(postId);
    };

    const unfollowPost = (postId: string) => {
        follows.delete(postId);
    };
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
    <!--{@const sameAuthorAbove = $thread.replies[index - 1]}-->
    {@const sameAuthorAbove = true}
    <!-- TODO: This has a problem of if replies are in 1 minute intervals it'll never show the time-->
    {@const similarTimeAsAbove = true}
    <div>
        {#if !sameAuthorAbove}
            <span class="float-left text-sm max-sm:text-xs">Anonymous</span>
        {/if}
        {#if similarTimeAsAbove}
            <span class="float-right text-xs opacity-25 max-sm:text-xs"
                >{createdDateFormatter(reply.created)}</span
            >
        {:else}
            <span class="float-right text-sm max-sm:text-xs"
                >{createdDateFormatter(reply.created)}</span
            >
        {/if}
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

{#snippet follow(postId: string)}
    <!-- TODO: This will fail if posts gets deleted while followed -->
    {@const post = $posts.find((p) => p.postId === postId)}
    <button class="ring-2 ring-black" onclick={() => ($id = postId.slice(5))}>
        <img
            src={getPostURL200(post!.files[0])}
            alt={post!.title}
            title={post!.title}
            class="h-16 w-16"
            width="64"
            height="64"
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
        <Corkboard {follows} />
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
                class="cb-mask cb-border flex h-16 grow items-center justify-center rounded bg-white p-4 text-3xl ring-2 ring-neutral-800 dark:bg-neutral-700 dark:text-gray-300"
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
                        maxlength="128"
                        class="rounded bg-white px-2 py-1 text-4xl dark:bg-neutral-700 dark:text-neutral-100"
                        oninput={(s) => ($creatingPostTitleText = s.target.value.trim())}
                        required
                    />
                    <textarea
                        name="content"
                        placeholder="Message"
                        maxlength="4096"
                        required
                        class="rounded bg-white px-2 py-1 dark:bg-neutral-700 dark:text-neutral-100"
                    ></textarea>
                    <div class="flex justify-center gap-4">
                        <input
                            type="file"
                            name="files"
                            accept="image/jpeg, image/png"
                            placeholder="Images"
                            class="rounded bg-green-50 dark:bg-neutral-500 dark:text-neutral-100"
                            onchange={(s) => ($creatingPostImageBlob = s.target.files[0])}
                            required={false}
                        />
                    </div>
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
        {#if !settingsPage}
            <!-- TODO: Create a settings component? -->
            <section class="flex w-full justify-around" transition:fade={{ duration: 200 }}>
                <div>
                    <h1 class="text-4xl">General</h1>
                    {@render settingsOption("Follow on reply", "followOnReply")}
                    <br />
                    <h2 class="text-2xl">Following</h2>
                    <div class="flex gap-2">
                        {#if follows}
                            {#each follows.keys() as ids}
                                {@render follow(ids)}
                            {/each}
                        {/if}
                    </div>
                    <br />
                    <!-- <p class="text-sm text-zinc-900">Click to unfollow</p> -->
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
                        {#if isFollowing($thread.post.postId)}
                            <button
                                onclick={() => unfollowPost($thread.post.postId)}
                                class="mr-1.5 h-6 bg-emerald-700 px-2 text-white"
                            >
                                Unfollow +
                            </button>
                        {:else}
                            <button
                                onclick={() => followPost($thread.post.postId)}
                                class="mr-1.5 h-6 bg-emerald-600 px-2 text-white"
                            >
                                Follow +
                            </button>
                        {/if}
                        <span class="mr-1.5 h-6 bg-neutral-700 px-2 text-white">?</span>
                        <span class="max-sm:text-2xl">Anonymous</span>
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
                        maxlength="4096"
                        placeholder="↵ to Send, Shift + ↵ for new line"
                        class="m-1 bg-white p-1 text-xl dark:bg-neutral-600 dark:text-neutral-100"
                        onkeydown={enterSubmit}
                    ></textarea>
                    <div class="flex justify-center p-1">
                        <input
                            type="file"
                            name="files"
                            placeholder="Images"
                            accept="image/jpeg, image/png, image/gif, image/webp"
                            class="rounded bg-green-50 dark:bg-neutral-500 dark:text-neutral-100"
                        />
                    </div>
                </div>
            </form>
        </aside>
    {/if}
</main>
{#if selectedImage}
    <style>
        body {
            overflow: hidden;
        }
    </style>
    <dialog open class="fixed inset-0 z-50 h-screen w-screen bg-black/50">
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
