<script>
    import Corkboard from "./Corkboard.svelte";
    import Logo from "$lib/assets/logo.png";
    import SettingsIcon from "$lib/assets/settings_icon.png";
    import DiscordIcon from "$lib/assets/discord_icon.png";
    import CreateIcon from "$lib/assets/create_icon.png";
    import { fly } from 'svelte/transition';
    import {
        boardStage,
        creatingPostImageBlob,
        creatingPostTitleText,
        loading,
        id,
        searchText,
        BoardStage,
        creatingPostFormData, refresh
    } from "../app";

    let settingsPage = $state(false);
    const createPost = () => {
        $creatingPostFormData.set("creator", "4jfbbn1krnrsspo") // Anonymous

        const formData = $creatingPostFormData
        console.log($creatingPostFormData.get("x"), $creatingPostFormData.get("y"))
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
                await refresh();
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
    <img src={Logo} alt="corkboard logo" class="p-5 m-auto"/>
</a>
<div class="grid lg:flex max-lg:flex-col gap-5 justify-center items-start m-auto">
    <div class="flex flex-col gap-2 lg:sticky top-5">
        <Corkboard/>
        <div id="menu" class="flex gap-3">
            <button class="flex justify-center items-center text-5xl cb-input w-16 h-16 cursor-pointer bg-green-400 hover:bg-green-500" onclick={operateCreatingPostStage}><img src={CreateIcon} alt="Create" class="p-3"/></button>
            <input
                    type="text"
                    name="search"
                    placeholder="Search"
                    class="flex justify-center items-center text-3xl cb-mask cb-border grow p-4 h-16 bg-white dark:bg-neutral-600"
                    oninput={s => $searchText = s.target.value.trim()}
            />
            <button class="flex justify-center items-center text-5xl cb-input w-16 h-16 cursor-pointer bg-neutral-400 hover:bg-neutral-500" onclick={() => settingsPage = !settingsPage}><img src={SettingsIcon} alt="Settings" class="p-3"/></button>
            <a href="https://discord.gg/YVuuF9KB5j" class="flex justify-center items-center text-5xl cb-input w-16 h-16 cursor-pointer bg-indigo-400 hover:bg-indigo-500"><img src={DiscordIcon} alt="Discord Link" class="p-2"/></a>
        </div>
        {#if $boardStage === BoardStage.Creating}
            <form
                    transition:fly={{y: 100}}
                    class="flex flex-col gap-2 pt-2"
                    method="post"
                    enctype="multipart/form-data"
                    onsubmit={e => {
                        e.preventDefault()
                        $creatingPostFormData = new FormData(e.target)
                        //console.log(e)
                        //console.log($creatingPostFormData, "W");
                        $boardStage = BoardStage.Placing
                    }}
            >
                <div class="flex flex-col cb-border cb-mask px-4 py-4 gap-2 bg-white dark:bg-neutral-600">
                    <input
                            type="text"
                            name="title"
                            placeholder="Title"
                            maxlength="128"
                            class="text-4xl bg-white dark:bg-neutral-600 dark:text-neutral-100"
                            oninput={s => $creatingPostTitleText = s.target.value.trim()}
                            required
                    />
                    <textarea name="content" placeholder="Message" maxlength="4096" required class="bg-white dark:bg-neutral-600 dark:text-neutral-100"></textarea>
                    <div class="flex gap-4 justify-center">
                        <input
                                type="file"
                                name="files"
                                accept="image/jpeg, image/png"
                                placeholder="Images"
                                class="bg-green-50 dark:bg-neutral-500 dark:text-neutral-100 rounded"
                                onchange={s => $creatingPostImageBlob = s.target.files[0]}
                                required={false}
                        />
                        <input type="submit" value="Post!" class="w-full bg-green-100 hover:bg-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:text-neutral-200 cursor-pointer rounded transition-colors"/>
                    </div>
    <!--                <p>The first image will be used in the corkboard.</p>-->
                </div>
            </form>
        {/if}
        {#if $boardStage === BoardStage.Placing}
            <input
                    transition:fly={{y: 100}}
                    type="submit"
                    value="Place!"
                    class="cb-input bg-lime-300 hover:bg-lime-400 cursor-pointer text-4xl w-full p-5"
                    onclick={createPost}
            />
        {/if}
        <!--            <img src="/corkboard/board.png"/>-->
        <!--            <img src="/corkboard/dots.png"/>-->
        {#if settingsPage}
            <img src={SettingsIcon}/>
        {/if}
    </div>
    <div>
        <slot/>
    </div>
</div>

<style>
    img {
        image-rendering: pixelated;
    }

    #menu img {
        opacity: 50%;
        background-blend-mode: color;
    }
</style>