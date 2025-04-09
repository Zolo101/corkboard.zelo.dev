<script lang="ts">
    import { fly } from "svelte/transition";
    import {
        BoardStage,
        creatingReply,
        id,
        loading,
        posts,
        refresh,
        thread,
        boardStage,
        creatingPostImageBlob,
        creatingPostTitleText,
        searchText,
        creatingPostFormData
    } from "../../app";
    import { onMount } from "svelte";
    import { createdDateFormatter } from "$lib/clientUtils";
    import { pushState } from "$app/navigation";
    import Logo from "$lib/assets/logo.png";
    import CreateIcon from "$lib/assets/create_icon.png";
    import SettingsIcon from "$lib/assets/settings_icon.png";
    import DiscordIcon from "$lib/assets/discord_icon.png";
    import Corkboard from "../../components/Corkboard.svelte";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let replyForm: HTMLFormElement;

    $id = data.id;

    $posts = data.board;
    onMount(() => {
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
    });

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
        const { newPosts, newReplies }: { newPosts: string[]; newReplies: string[] } = JSON.parse(
            event.data
        );
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

    const enterSubmit = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            replyForm.requestSubmit();
        }
    };

    // TODO: Not sure if it's SubmitEvent
    const createReply = (f: SubmitEvent) => {
        f.preventDefault();
        const formData = new FormData(f.target as HTMLFormElement);
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

    let settingsPage = $state(false);
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
            $loading = false;
            $id = postId;
            await refresh();
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
</script>

<svelte:head>
    {#if $thread}
        {@const sliced = $thread.post.content.length > 200}
        {@const content = sliced
            ? $thread.post.content.slice(0, 200) + "(...)"
            : $thread.post.content}
        <title>corkboard - {$thread.post.title}</title>
        <meta name="description" {content} />
        <!--        <meta property="og:image" content="https://embed.zelo.dev/corkboard-embedgen-sharp?id={$thread.post.postId}">-->
        <meta name="twitter:card" content="summary_large_image" />
    {:else}
        <title>corkboard</title>
        <meta name="description" content="Create a post and pin it to a board!" />
    {/if}
</svelte:head>

{#snippet r(reply, index)}
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
            <a href={getPostURLOG(file)} class="block h-full">
                <img src={getPostURL200(file)} alt={file} class="m-2 inline outline outline-1" />
            </a>
        {/if}
        {#if sameAuthorAbove}
            <p class="px-2.5 text-xl max-sm:text-3xl">{reply.content}</p>
        {:else}
            <p class="px-2.5 text-xl max-sm:text-3xl">{reply.content}</p>
        {/if}
    </div>
{/snippet}

<a href="https://corkboard.zelo.dev/">
    <img id="logo" src={Logo} alt="corkboard logo" class="m-auto p-5" />
</a>
<div class="mx-5 flex justify-center gap-5 max-lg:flex-col">
    <div class="top-5 mb-5 flex grow flex-col items-center gap-2 lg:sticky">
        <Corkboard />
        <div id="menu" class="flex w-1/2 justify-center gap-3">
            <button
                class="cb-input flex h-16 min-w-16 cursor-pointer items-center justify-center bg-green-400 text-5xl hover:bg-green-500"
                onclick={operateCreatingPostStage}
                ><img src={CreateIcon} alt="Create" width="64" height="64" class="p-3" /></button
            >
            <input
                type="text"
                name="search"
                placeholder="Search"
                class="cb-mask cb-border flex h-16 grow items-center justify-center bg-white p-4 text-3xl dark:bg-neutral-600"
                oninput={(s) => ($searchText = s.target.value.trim())}
            />
            <button
                class="cb-input flex h-16 min-w-16 cursor-pointer items-center justify-center bg-neutral-400 text-5xl hover:bg-neutral-500"
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
                class="cb-input flex h-16 min-w-16 cursor-pointer items-center justify-center bg-indigo-400 text-5xl hover:bg-indigo-500"
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
                    class="cb-border cb-mask flex flex-col gap-2 bg-white px-4 py-4 dark:bg-neutral-600"
                >
                    <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        maxlength="128"
                        class="bg-white text-4xl dark:bg-neutral-600 dark:text-neutral-100"
                        oninput={(s) => ($creatingPostTitleText = s.target.value.trim())}
                        required
                    />
                    <textarea
                        name="content"
                        placeholder="Message"
                        maxlength="4096"
                        required
                        class="bg-white dark:bg-neutral-600 dark:text-neutral-100"
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
                        <input
                            type="submit"
                            value="Post!"
                            class="w-full cursor-pointer rounded bg-green-100 transition-colors hover:bg-green-300 dark:bg-green-600 dark:text-neutral-200 dark:hover:bg-green-700"
                        />
                    </div>
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
        <!--            <img src="/corkboard/board.png"/>-->
        <!--            <img src="/corkboard/dots.png"/>-->
        {#if settingsPage}
            <img src={SettingsIcon} />
        {/if}
    </div>
    {#if $thread}
        <!--{console.log("e", $post)}-->
        <div class="cb-mask grow-[2] bg-[#f2e9e9] px-4 dark:bg-[#4a4241] dark:text-gray-300">
            <!--{#each data.post as reply}-->
            <!--            <p>{JSON.stringify(post, 0, 2)}</p>-->
            <div>
                <span class="float-left max-sm:text-2xl">Anonymous</span>
                <span class="float-right max-sm:text-2xl"
                    >{createdDateFormatter($thread.post.created)}</span
                >
                <br />
                <p class="text-4xl max-sm:text-6xl">{$thread.post.title}</p>
                <div class="inline">
                    {#each $thread.post.files as file}
                        <a href={getPostURLOG(file)} class="block h-full">
                            <img
                                src={getPostURL200(file)}
                                alt={file}
                                class="inline"
                                style="image-rendering: pixelated"
                            />
                        </a>
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
                <div class="mt-2 flex flex-col bg-white p-0.5 dark:bg-neutral-600">
                    <textarea
                        name="content"
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
                            multiple
                            class="rounded bg-green-50 dark:bg-neutral-500 dark:text-neutral-100"
                        />
                    </div>
                </div>
            </form>
        </div>
    {/if}
</div>

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
