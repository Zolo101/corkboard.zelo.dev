<script lang="ts">
    import Boilerplate from "../../components/Boilerplate.svelte";
    import { fly } from 'svelte/transition';
    import { creatingReply, getReplies, id, loading, pb, post, posts, replies} from "../../app";
    import { onMount } from "svelte";
    import { load } from "./+page";
    import type { Reply } from "../../app";
    export let data;

    onMount(() => {
        $id = data.id;

        id.subscribe(async (v) => {
            $loading = true;
            let result = await load({params: {id: v}})
            $post = result.post;
            $posts = result.posts;
            $replies = result.replies;
            window.history.pushState({}, "", `/${v || ""}`);
            $loading = false;
            console.log("NEW ID", $id)
        })
    })

    const createReply = (f) => {
        const formData = new FormData(f.target);
        formData.append("post", $id)
        formData.append("creator", "4jfbbn1krnrsspo")
        console.log(formData)

        const call = pb.collection("corkboard_replies").create(formData)
        $loading = true;
        call
            .then((result) => {
                // console.log("result", result)
                getReplies(result.post).then((resultReplies) => {
                    $replies = resultReplies as Reply[];
                    // console.log("replies", $replies)
                    $creatingReply = false
                    $loading = false
                })
            })
            .catch((err) => {
                console.error(err)
                alert(`Error... DM Zelo101 with a screenshot of the error:\n\n${err.message}`)
            })
    }

    const getPostURL200 = (id, name) => `https://cdn.zelo.dev/api/files/h3pktm4cd0utllp/${id}/${name}?thumb=0x200`;
    const getPostURLOG = (id, name) => `https://cdn.zelo.dev/api/files/h3pktm4cd0utllp/${id}/${name}`;
    const getRepliesURLFit = (id, name) => `https://cdn.zelo.dev/api/files/qlp02oagyzq6sdx/${id}/${name}?thumb=320x240f`;
    const getRepliesURLOG = (id, name) => `https://cdn.zelo.dev/api/files/qlp02oagyzq6sdx/${id}/${name}`;
</script>

<svelte:head>
    {#if $post}
        <title>corkboard - {$post.title}</title>
        <meta name="description" content={$post.content.slice(0, 100)}>
        <meta property="og:image" content="./image/{$post.id}">
        <meta name="twitter:card" content="summary_large_image">
    {:else}
        <title>corkboard</title>
        <meta name="description" content="Create a post and pin it to a board!">
    {/if}
</svelte:head>

<Boilerplate>
    {#if $post}
        <!--{console.log("e", $post)}-->
        <div class="lg:flex flex-col gap-4 lg:min-w-[400px] lg:w-[30vw]">
            <!--{#each data.post as reply}-->
    <!--            <p>{JSON.stringify(post, 0, 2)}</p>-->
             <div class="cb-mask p-5 bg-[#f6dbd9]">
                 <span class="float-left">Anonymous</span>
                 <span class="float-right">{new Date($post.created).toLocaleString()}</span>
                 <br>
                 <p class="text-4xl">{$post.title}</p>
                 <!--                            <span>{post.created}</span>-->
    <!--                 <p>{post.files}</p>-->
                 <div class="inline">
                     {#each $post.files as file}
                         <a href={getPostURLOG($post.id, file)} class="h-full block">
                            <img src={getPostURL200($post.id, file)} alt={file} class="inline" style="image-rendering: pixelated"/>
                         </a>
                     {/each}
                 </div>
                 <span class="max-h-2 mt-5 text-xl">{$post.content}</span>
            </div>
            {#each $replies as reply}
                <div class="cb-mask p-5 bg-[#f6dbd9]">
                    <span class="float-left">Anonymous</span>
                    <span class="float-right">{new Date(reply.created).toLocaleString()}</span>
                    <br>
                    {#if reply.file}
                        <a href={getRepliesURLOG(reply.id, reply.file)} class="h-full block">
                            <img src={getRepliesURLFit(reply.id, reply.file)} alt={reply.file} class="inline outline outline-1 m-2"/>
                        </a>
                    {/if}
                    <p class="text-xl">{reply.content}</p>
                </div>
            {/each}
            <p class="cb-input text-3xl text-center p-2 bg-green-400 hover:bg-green-500" on:click={() => $creatingReply = !$creatingReply}>Reply</p>
            {#if $creatingReply}
                <form transition:fly={{y: 100}} class="flex flex-col" method="post" enctype="multipart/form-data" on:submit|preventDefault={createReply}>
                    <textarea type="text" name="content" placeholder="Message" class="cb-border cb-mask p-5 m-1"/>
                    <input type="file" name="file" placeholder="Images" accept="image/jpeg, image/png, image/gif, image/webp" class="cb-border cb-mask bg-green-50 p-5 m-1"/>
                    <input type="submit" value="Submit" class="cb-input bg-green-200 hover:bg-green-300 p-5 m-1"/>
                </form>
            {/if}
            <br>
        </div>
    {/if}
</Boilerplate>