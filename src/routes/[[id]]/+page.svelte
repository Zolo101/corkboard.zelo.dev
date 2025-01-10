<script lang="ts">
    import Boilerplate from "../../components/Boilerplate.svelte";
    import { fly } from 'svelte/transition';
    // import { load } from "./+page";
    // import { creatingReply, getReplies, id, loading, pb, post, posts, replies} from "../../app";
    import { creatingReply, id, loading, posts, refresh, thread } from "../../app";
    import { onMount } from "svelte";

    export let data;

    onMount(() => {
        console.log(data)
        $id = data.id;

        $posts = data.board;

        id.subscribe(async (v) => {
            if (v === undefined) return;
            $loading = true;
            let getPost = await fetch(`/api/post?id=${v}`);
            let result = await getPost.json();
            $thread = result;
            // $posts = result.posts;
            // $replies = result.replies;
            window.history.pushState({}, "", `/${v || ""}`);
            $loading = false;
            console.log("SELECTED ID", $id)
        })

        // Gives us updates on new posts & replies.
        const updateWebSocket = new WebSocket("wss://lnw2vlxzti.execute-api.eu-west-2.amazonaws.com/$default");
        let dead = false;
        updateWebSocket.onopen = () => {
            console.log('Connected to WebSocket API');
            dead = false;
        };
        updateWebSocket.onmessage = async (event) => {
            console.log("WEBSOCKET", event.data);
            const { newPosts, newReplies }: {newPosts: string[], newReplies: string[]} = JSON.parse(event.data);
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
            console.log('WebSocket connection closed');
            dead = true;
        };
        updateWebSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        // Run when the user clicks onto the tab
        // window.onfocus = () => {
        //     if (dead) updateWebSocket.
        // };
    })

    // TODO: Figure out type for "f"
    const createReply = (f: any) => {
        const formData = new FormData(f.target);
        formData.append("postId", $id)
        // formData.append("creator", "4jfbbn1krnrsspo")
        console.log([...formData.entries()])

        // const call = pb.collection("corkboard_replies").create(formData)
        const call = fetch("/api/reply", {
            method: "POST",
            body: formData
        })

        $loading = true;
        call
            .then(async (result) => {
                $thread = await result.json();
                // console.log("result", result)
            //     getReplies(result.post).then((resultReplies) => {
            //     $replies = resultReplies as Reply[];
                // console.log("replies", $replies)
                $creatingReply = false
                $loading = false
            //     })
            })
            .catch((err) => {
                console.error(err)
                alert(`Error... DM Zelo101 with a screenshot of the error:\n\n${err.message}`)
            })
    }

    // const getPostURL200 = (id, name) => `https://cdn.zelo.dev/api/files/h3pktm4cd0utllp/${id}/${name}?thumb=0x200`;
    // const getPostURLOG = (id, name) => `https://cdn.zelo.dev/api/files/h3pktm4cd0utllp/${id}/${name}`;
    // const getRepliesURLFit = (id, name) => `https://cdn.zelo.dev/api/files/qlp02oagyzq6sdx/${id}/${name}?thumb=320x240f`;
    // const getRepliesURLOG = (id, name) => `https://cdn.zelo.dev/api/files/qlp02oagyzq6sdx/${id}/${name}`;

    // const getPostURL200 = (id: string) => `https://d3oeaaqvfzway3.cloudfront.net/${id}?size=200`;
    const getPostURL200 = (id: string) => `https://d3oeaaqvfzway3.cloudfront.net/200/${id.substring(3)}`;
    const getPostURLOG = (id: string) => `https://d3oeaaqvfzway3.cloudfront.net/${id}`;
</script>

<svelte:head>
    {#if $thread}
        {@const sliced = $thread.post.content.length > 200}
        {@const content = sliced ? $thread.post.content.slice(0, 200) + "(...)" : $thread.post.content}
        <title>corkboard - {$thread.post.title}</title>
        <meta name="description" content={content}>
        <meta property="og:image" content="https://embed.zelo.dev/corkboard-embedgen-sharp?id={$thread.post.postId}">
        <meta name="twitter:card" content="summary_large_image">
    {:else}
        <title>corkboard</title>
        <meta name="description" content="Create a post and pin it to a board!">
    {/if}
</svelte:head>

<Boilerplate>
    {#if $thread}
        <!--{console.log("e", $post)}-->
        <div class="lg:flex flex-col gap-4 lg:min-w-[400px] lg:w-[30vw] dark:text-gray-300">
            <!--{#each data.post as reply}-->
    <!--            <p>{JSON.stringify(post, 0, 2)}</p>-->
             <div class="cb-mask p-5 bg-[#f6dbd9] dark:bg-[#4a4241]">
                 <span class="float-left max-sm:text-2xl">Anonymous</span>
                 <span class="float-right max-sm:text-2xl">{new Date($thread.post.created).toLocaleString()}</span>
                 <br>
                 <p class="text-4xl max-sm:text-6xl">{$thread.post.title}</p>
                 <!--                            <span>{post.created}</span>-->
    <!--                 <p>{post.files}</p>-->
                 <div class="inline">
                     {#each $thread.post.files as file}
                         <a href={getPostURLOG(file)} class="h-full block">
                            <img src={getPostURL200(file)} alt={file} class="inline" style="image-rendering: pixelated"/>
                         </a>
                     {/each}
                 </div>
                 <span class="max-h-2 mt-5 text-xl">{$thread.post.content}</span>
            </div>
            {#each $thread.replies as reply}
                <div class="cb-mask p-5 bg-[#f6dbd9] dark:bg-[#4a4241]">
                    <span class="float-left max-sm:text-2xl">Anonymous</span>
                    <span class="float-right max-sm:text-2xl">{new Date(reply.created).toLocaleString()}</span>
                    <br>
                    {#if reply.files.length}
                      {@const file = reply.files[0]}
                        <a href={getPostURLOG(file)} class="h-full block">
                            <img src={getPostURL200(file)} alt={file} class="inline outline outline-1 m-2"/>
                        </a>
                    {/if}
                    <p class="text-xl max-sm:text-3xl">{reply.content}</p>
                </div>
            {/each}
<!--            <p class="cb-input text-3xl text-center p-2 dark:text-black bg-green-400 hover:bg-green-500" on:click={() => $creatingReply = !$creatingReply}>Reply</p>-->
<!--            {#if $creatingReply}-->
                <form transition:fly={{y: 100}} class="flex flex-col" method="post" enctype="multipart/form-data" on:submit|preventDefault={createReply}>
                    <textarea type="text" name="content" placeholder="Message" class="cb-border cb-mask text-3xl p-5 m-1"/>
                    <div class="flex">
                        <input type="file" name="files" placeholder="Images" accept="image/jpeg, image/png, image/gif, image/webp" class="cb-border cb-mask bg-green-50 p-5 m-1"/>
                        <input type="submit" value="->" class="cb-input dark:text-black bg-green-200 hover:bg-green-300 text-3xl p-2 m-1"/>
                    </div>
                </form>
            <!--{/if}-->
            <br>
        </div>
    {/if}
</Boilerplate>