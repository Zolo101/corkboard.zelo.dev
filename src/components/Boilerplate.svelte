<script>
    import Corkboard from "./Corkboard.svelte";
    import { fly } from 'svelte/transition';
    import {
        boardStage,
        creatingPostImageBlob,
        creatingPostTitleText,
        pb,
        loading,
        id,
        searchText,
        BoardStage,
        creatingPostFormData
    } from "../app";

    const createPost = (e) => {
        $creatingPostFormData.set("creator", "4jfbbn1krnrsspo") // Anonymous

        const formData = $creatingPostFormData
        console.log($creatingPostFormData.get("x"), $creatingPostFormData.get("y"))
        // const call = pb.collection("corkboard_posts").create(formData)
        const call = fetch("/api/post", {
            method: "POST",
            body: formData
        })

        // log formData in json
        // console.log(JSON.stringify(Array.from(formData.entries()), 0, 2))


        $loading = true;
        call
            .then(async (result) => {
                const postId = await result.json();
                $boardStage = BoardStage.Placed
                $loading = false
                $id = postId
            })
            .catch((err) => {
                console.error(err)
                alert(`Error... DM Zelo101 with a screenshot of the error:\n\n${err.message}`)
            })

            // .then((id) => {
            //     console.log(id)
            //     $creatingPostStage = false
            // })
            // .catch((err) => {
            //     console.error(JSON.stringify(err, 0, 2))
            //     // alert("Error...")
            // })

    }

    const operateCreatingPostStage = () => {
        if ($boardStage === BoardStage.None) {
            $boardStage = BoardStage.Creating
        } else if ($boardStage === BoardStage.Creating) {
            $boardStage = BoardStage.None
        }

        // ignore when PostStage.Placing
    }
</script>

<a href="https://corkboard.zelo.dev/">
    <img src="/corkboard/logo_alpha.png" alt="corkboard logo" class="p-5 m-auto"/>
</a>
<div class="grid lg:flex max-lg:flex-col gap-5 justify-center items-start m-auto">
    <div class="lg:sticky top-0">
        <Corkboard/>
        <br>
        <div class="flex gap-2">
            <div class="flex justify-center items-center text-5xl cb-input bg-green-400 w-16 h-16 cursor-pointer hover:bg-green-500" on:click={operateCreatingPostStage}>+</div>
            <input
                    type="text"
                    name="search"
                    placeholder="Search"
                    class="flex justify-center items-center text-3xl cb-mask cb-border grow p-4 h-16"
                    on:input={s => $searchText = s.target.value.trim()}
            />
        </div>
        {#if $boardStage === BoardStage.Creating}
            <form
                    transition:fly={{y: 100}}
                    class="flex flex-col gap-1 pt-2"
                    method="post"
                    enctype="multipart/form-data"
                    on:submit|preventDefault={e => {
                        $creatingPostFormData = new FormData(e.target)
                        //console.log(e)
                        //console.log($creatingPostFormData, "W");
                        $boardStage = BoardStage.Placing
                    }}
            >
                <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        maxlength="128"
                        class="cb-border cb-mask p-5 m-1 text-4xl"
                        on:input={s => $creatingPostTitleText = s.target.value.trim()}
                        required
                />
                <textarea type="text" name="content" placeholder="Message" maxlength="4096" class="cb-border cb-mask p-5 m-1" required/>
                <input
                        type="file"
                        name="files"
                        accept="image/jpeg, image/png"
                        placeholder="Images"
                        class="cb-border cb-mask bg-green-50 p-5 m-1"
                        on:change={s => $creatingPostImageBlob = s.target.files[0]}
                        required={false}
                />
<!--                <p>The first image will be used in the corkboard.</p>-->
                <input type="submit" value="Post!" class="cb-input bg-green-200 hover:bg-green-300 cursor-pointer p-5 mx-24 text-4xl"/>
            </form>
        {/if}
        {#if $boardStage === BoardStage.Placing}
            <input
                    transition:fly={{y: 100}}
                    type="submit"
                    value="Place!"
                    class="cb-input bg-lime-300 hover:bg-lime-400 cursor-pointer text-4xl w-full p-5"
                    on:click={createPost}
            />
        {/if}
        <!--            <img src="/corkboard/board.png"/>-->
        <!--            <img src="/corkboard/dots.png"/>-->
    </div>
    <div>
        <slot/>
    </div>
</div>