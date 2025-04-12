<script lang="ts">
    import "@pixi/gif";
    import {
        AnimatedSprite,
        Application,
        Assets,
        BitmapText,
        ColorMatrixFilter,
        Container,
        Filter,
        Graphics,
        Sprite,
        Texture,
        TilingSprite
    } from "pixi.js";
    import { onMount } from "svelte";
    import {
        boardStage,
        creatingPostImageBlob,
        creatingPostTitleText,
        id,
        loading,
        posts,
        BoardStage,
        searchText,
        creatingPostFormData
    } from "../app";
    import loadingURL from "$lib/assets/loading.gif";
    import dotsURL from "$lib/assets/dots.png";
    import fontURL from "$lib/assets/fonts/vcr_osd_mono_regular_24_x2.fnt?url";
    import type { Post } from "../app";
    import { DropShadowFilter, OutlineFilter, PixelateFilter } from "pixi-filters";
    import { scaleImage } from "$lib/clientUtils";

    const { follows } = $props();

    const getPostURL = (id: string) =>
        `https://drzkh14a10zed.cloudfront.net/200/${id.substring(3)}`;
    const app = new Application();
    let corkDOM: HTMLDivElement;

    onMount(async () => {
        const scale = window.devicePixelRatio / 1.25;
        await app.init({
            width: 640 * scale,
            height: 480 * scale,
            backgroundAlpha: 0,
            antialias: false
        });

        corkDOM.append(app.canvas);

        const currentPost: Post | undefined = $posts.find((post) => post.postId === $id);
        const defaultHoverText = currentPost?.title || "Hover over a post to see its title!";
        await Assets.load(fontURL);

        let travelSpeed = $boardStage ? 0.25 : 1;
        const loadingGIF: AnimatedSprite = await Assets.load(loadingURL);
        loadingGIF.position.set(470, 330);
        // loadingGIF.scale.set(1)
        loading.subscribe((loading) => (loadingGIF.alpha = loading ? 0.5 : 0));

        // const boardTexture = await Assets.load(boardURL);
        // const borderTexture = await Assets.load(borderURL);
        const dotsTexture = await Assets.load(dotsURL);
        const searchAlpha = 0.1;

        const previewImage = new Sprite();
        const postContainer = new Container();
        // const board = new Sprite(boardTexture);
        const boardGraphic = new Graphics();
        const outlineWidth = 10;
        boardGraphic.roundRect(
            outlineWidth,
            outlineWidth,
            640 - outlineWidth * 2,
            480 - outlineWidth * 2,
            5 * scale
        );
        boardGraphic.stroke({ width: outlineWidth, color: 0x000000, alpha: 0.5 });
        boardGraphic.fill({
            color: 0xffffff,
            alpha: 0.2
        });

        // This is so that we can use tint
        const boardTexture = app.renderer.generateTexture(boardGraphic);
        const board = new Sprite(boardTexture);

        // const border = new Sprite(borderTexture);
        const dots = new TilingSprite({
            texture: dotsTexture,
            width: 640 - outlineWidth * 3,
            height: 480 - outlineWidth * 3,
            tileScale: { x: 0.4, y: 0.4 }
        });
        const hoverText = new BitmapText({
            text: defaultHoverText,
            style: {
                fontFamily: "VCR OSD Mono",
                fontSize: 12,
                letterSpacing: -2,
                wordWrap: true,
                wordWrapWidth: 560
            }
        });
        hoverText.position.set(20, 20);
        dots.position.set(outlineWidth);
        dots.alpha = 0.3;
        previewImage.position.set(320, 240);
        previewImage.anchor.set(0.5, 0.5);

        app.stage.addChild(board);
        app.stage.addChild(dots);
        app.stage.addChild(postContainer);
        app.stage.scale.set(scale);

        const pixelate = new PixelateFilter(2);

        const globalContrast = new ColorMatrixFilter();
        globalContrast.contrast(0.5, false);

        const contrast = new ColorMatrixFilter();
        contrast.contrast(0.5, false);

        const greyscale = new ColorMatrixFilter();
        greyscale.greyscale(0.5, false);

        const outline = new OutlineFilter({ thickness: 2, color: 0xfdb896 });
        const hoverTextOutline = new OutlineFilter({
            thickness: 2,
            color: 0x000000
        });
        const followingOutline = new OutlineFilter({
            thickness: 3,
            color: 0x00cccc,
            alpha: 0.5
        });
        const goodBoundingBox = new OutlineFilter({
            thickness: 3,
            color: 0x00ff00
        });
        const badBoundingBox = new OutlineFilter({
            thickness: 3,
            color: 0xff4000
        });
        const currentPostOutline = new OutlineFilter({
            thickness: 3,
            color: 0xffffff,
            alpha: 0.5
        });

        const dropShadow = new DropShadowFilter({
            offset: { x: 5, y: 5 },
            color: 0x000000,
            // alpha: 1,
            blur: 5,
            quality: 1
            // rotation: Math.PI / 6,
            // resolution: 1,
        });

        const boundingBoxDropShadow = new DropShadowFilter({
            offset: { x: 20, y: 20 },
            color: 0x000000,
            // alpha: 1,
            blur: 5,
            quality: 3
            // rotation: Math.PI / 6,
            // resolution: 1,
        });

        const hoverTextDropShadow = new DropShadowFilter({
            offset: { x: 1, y: 1 },
            color: 0x000000,
            // alpha: 1,
            // blur: 2,
            quality: 3
            // rotation: Math.PI / 6,
            // resolution: 1,
        });

        dots.filters = [greyscale];
        hoverText.filters = [hoverTextOutline, hoverTextDropShadow];
        loadingGIF.filters = [pixelate];
        previewImage.filters = [globalContrast, pixelate];

        board.interactive = true;
        board.addEventListener("pointermove", (event) => {
            if (event.global.y < 150) {
                hoverText.position.set(20, 510 - hoverText.height);
                hoverText.anchor.set(0, 1);
            } else {
                hoverText.position.set(20, 20);
                hoverText.anchor.set(0, 0);
            }
        });

        const postMap = new Map<Post, Sprite>();
        let selectedPostSprite: Sprite;

        // const swapSpriteWithPost = async (sprite: Sprite, firstFile: string) => {
        //     sprite.texture = await Assets.load(getPostURL(firstFile))
        //     let area = sprite.width * sprite.height
        //     let maxArea = 150 * 150
        //     if (area > maxArea) {
        //         sprite.scale.set(maxArea / area)
        //     }
        // }

        // WIP
        const selectSprite = (post: Post, postSprite: Sprite) => {
            // TODO: Remove filters from unselected sprite
            if (selectedPostSprite) {
                selectedPostSprite.filters = [contrast, pixelate];
            }
            selectedPostSprite = postSprite;
            postSprite.filters = [contrast, pixelate, outline];
            $id = post.postId.substring(5); // Remove POST#
        };

        const loadAsset = async (url: string) => {
            const maxAttempts = 5;
            const delay = 400; // ms

            // 400 delay then 800 delay then 1200...
            for (let i = 0; i < maxAttempts; i++) {
                try {
                    return await Assets.load(url);
                } catch (error) {
                    if (i === maxAttempts - 1) {
                        throw new Error(
                            `Failed to load asset after ${maxAttempts} attempts: ${url}`
                        );
                    }

                    // sleep
                    await new Promise((resolve) => setTimeout(resolve, delay * i));
                }
            }
        };

        // TODO: Rename, this does more than following...
        const addFollowingFilter = (postSprite: Sprite, post: Post) => {
            if (follows.get(post.postId)) {
                postSprite.filters = [...(postSprite.filters as Filter[]), followingOutline];
                postSprite.zIndex = Number.POSITIVE_INFINITY;
            }
        };

        const createPostSprite = async (post: Post) => {
            // const postSprite = post.files[0].at(-1) === "f" ? await Assets.load(getPostURL(post.id, post.files[0])) : new Sprite(await Assets.load(getPostURL(post.id, post.files[0])))

            // Posts are required to have at least one file
            const firstFile = post.files[0]!;
            // const postSprite = new Sprite(await Assets.load(boardURL));

            const postSprite = new Sprite(await loadAsset(getPostURL(firstFile)));

            // Most updated in front
            const updatedAt = new Date(post.updated).getTime();
            postSprite.zIndex = updatedAt;

            postMap.set(post, postSprite);
            // await swapSpriteWithPost(postSprite, firstFile)
            // const postSprite = new Image(postTexture)
            // postSprite.x = clamp(Math.random() * 640, 100, 500)
            // postSprite.y = clamp(Math.random() * 480, 100, 400)
            // console.log(post)

            postSprite.x = post.x;
            postSprite.y = post.y;
            postSprite.eventMode = "dynamic";
            // let area = postSprite.width * postSprite.height;
            // let maxArea = 200 * 200
            // let maxArea = 100 * 100;
            // let maxArea = 150 * 150
            // if (area > maxArea) {
            //     postSprite.scale.set((maxArea / area) * scale);
            // }
            const { width, height } = scaleImage(postSprite.width, postSprite.height);
            postSprite.setSize(width, height);

            // if (post.id !== $id) {
            postSprite.on("pointerdown", (event) => {
                selectSprite(post, postSprite);
            });

            postSprite.on("pointerover", (event) => {
                // Search: Check if the post is being filtered
                if (postSprite.alpha !== searchAlpha) {
                    postSprite.filters = [contrast, pixelate, currentPostOutline];
                    addFollowingFilter(postSprite, post);
                    // contrast.contrast(0.5, true);
                    hoverText.text = post.title;

                    if (corkDOM) corkDOM.style.cursor = "pointer";
                }
            });

            postSprite.on("pointerout", (event) => {
                if (selectedPostSprite !== postSprite) postSprite.filters = [contrast, pixelate];
                contrast.contrast(0.5, false);
                hoverText.text = defaultHoverText;
                addFollowingFilter(postSprite, post);

                if (corkDOM) corkDOM.style.cursor = "initial";
            });

            postSprite.filters = [contrast, pixelate];
            addFollowingFilter(postSprite, post);

            // $id = post.postId;
            // $loading = false;
            postContainer.addChild(postSprite);

            /*
            if (follows.has(post.postId)) {
                const x = await (await fetch(`/api/post?id=${post.postId.slice(5)}`)).json();
                const followMessageContainer = new Container();
                const followMessageCount = new BitmapText({
                    text: `+${x.replies.length}`,
                    style: {
                        fontFamily: "VCR OSD Mono",
                        fontSize: 6,
                        letterSpacing: -1,
                        fill: 0xffffff
                    }
                });
                const followMessageBackground = new Graphics();
                followMessageBackground.rect(0, 0, postSprite.width, followMessageCount.height + 4);
                followMessageBackground.fill({ color: 0x00cccc, alpha: 0.75 });

                followMessageContainer.addChild(followMessageBackground, followMessageCount);
                followMessageContainer.position.set(postSprite.x, postSprite.y);
                followMessageCount.position.set(5, 0);
                followMessageContainer.zIndex = postSprite.zIndex + 1;

                postContainer.addChild(followMessageContainer);
            }
            */
        };

        // console.log($posts)
        posts.subscribe((ps) => {
            // Only create for new posts
            ps.reverse()
                .filter((post) => !postMap.has(post))
                .forEach(createPostSprite);
        });

        // Add filters to current post
        // id.subscribe((v) => {
        //     if (oldId) postMap.get(oldId).filters = []
        //     postMap.get(v).filters = [globalContrast, pixelate, currentPostOutline, dropShadow]
        // })

        // app.stage.addChild(border);
        app.stage.addChild(hoverText);
        app.stage.addChild(loadingGIF);
        app.stage.addChild(previewImage);

        const dotsMovement = app.ticker.add((delta) => {
            dots.tilePosition.x -= travelSpeed * delta.deltaTime;
            dots.tilePosition.y -= travelSpeed * delta.deltaTime;
        });

        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        motion.addEventListener("change", (e) => {
            if (e.matches) {
                dotsMovement.speed = 0;
            }
        });

        boardStage.subscribe((bs) => {
            switch (bs) {
                case BoardStage.None:
                    postContainer.visible = true;
                    previewImage.visible = false;
                    hoverText.text = "Hover over a post to see its title!";
                    board.tint = "#ffffff";
                    dots.tint = "#ffffff";
                    travelSpeed = 0.25;
                    break;

                case BoardStage.Creating:
                    postContainer.visible = false;
                    previewImage.visible = true;
                    hoverText.text = "Preview:";
                    board.tint = "#e4ff9e";
                    dots.tint = "#e4ff9e";
                    travelSpeed = 1;
                    break;

                case BoardStage.Placing:
                    postContainer.visible = true;
                    previewImage.visible = true;
                    previewImage.interactive = true;

                    let selected = false;
                    previewImage.addEventListener("pointerdown", (_) => (selected = true));
                    previewImage.addEventListener("pointerup", (_) => (selected = false));
                    previewImage.addEventListener("pointermove", (e) => {
                        const bounds = previewImage.getBounds().scale(1 / scale);

                        if (selected)
                            previewImage.position.set(e.globalX / scale, e.globalY / scale);
                        const outsideBoard =
                            bounds.left < dots.x ||
                            bounds.top < dots.y ||
                            bounds.right > dots.x + dots.width ||
                            bounds.bottom > dots.y + dots.height; // Updated to include bottom check

                        // console.log(previewImage.getBounds().left, previewImage.getBounds().top, previewImage.getBounds().right, previewImage.getBounds().bottom)
                        previewImage.filters = outsideBoard
                            ? [globalContrast, pixelate, badBoundingBox, boundingBoxDropShadow]
                            : [globalContrast, pixelate, goodBoundingBox, boundingBoxDropShadow];

                        if (!outsideBoard) {
                            // console.log(bounds.left, bounds.top, bounds.left.toString(), bounds.top.toString())
                            // hoverText.position.set(previewImage.position.x, previewImage.position.y)
                            $creatingPostFormData.set("x", bounds.left.toString());
                            $creatingPostFormData.set("y", bounds.top.toString());
                        }
                        // let sprites = [...postMap.values()]
                        // sprites.map(s => {
                        // s.filters = [globalContrast, pixelate, goodBoundingBox, dropShadow]
                        // })
                    });

                    hoverText.text = "Place the post!";
                    board.tint = "#ffc09e";
                    dots.tint = "#ffc09e";
                    travelSpeed = 2;
                    break;

                case BoardStage.Placed:
                    // reset preview image changes
                    previewImage.interactive = false;
                    previewImage.texture = Texture.EMPTY;
                    previewImage.filters = [];
                    previewImage.position.set(320, 240);

                    $boardStage = BoardStage.None;

                case BoardStage.SearchingNoResults:
                    board.tint = "#ffc09e";
                    dots.tint = "#ffc09e";
                    travelSpeed = 0;
                    break;
            }
        });

        creatingPostTitleText.subscribe((text) => {
            hoverText.text = text || "Preview:";
        });

        creatingPostImageBlob.subscribe(async (file) => {
            if (file) {
                const texture = await Assets.load({
                    src: URL.createObjectURL(file),
                    format: "png",
                    loadParser: "loadTextures"
                });
                console.log(texture);
                previewImage.texture = texture;

                const { width, height } = scaleImage(previewImage.width, previewImage.height);
                previewImage.setSize(width, height);
            }
        });

        searchText.subscribe((text) => {
            // if (text) {
            let found = 0;
            let lastFoundPost: Post | undefined;
            let lastFoundSprite: Sprite | undefined;

            // TODO: Full text search using the api (like in 5beam)
            for (const [post, sprite] of postMap) {
                const match = post.title.includes(text);
                sprite.alpha = match ? 1 : searchAlpha;
                if (match) {
                    found += 1;
                    lastFoundPost = post;
                    lastFoundSprite = sprite;
                }
            }

            if (text.length === 0) {
                hoverText.text = "Hover over a post to see its title!";
                return;
            }

            if (found === 1) {
                hoverText.text = lastFoundPost!.title;
                selectedPostSprite = postMap.get(lastFoundPost!)!;
                selectSprite(lastFoundPost!, lastFoundSprite!);
            } else {
                hoverText.text = found ? `Found ${found} results` : "No results found";
            }
            // if (!one) $boardStage = BoardStage.SearchingNoResults
            // }
        });
    });
</script>

<div bind:this={corkDOM} style="-webkit-tap-highlight-color: transparent;"></div>
<!--<div class="flex bg-black/50" style="width: {640 * window.devicePixelRatio / 1.25}px; height: {480 * window.devicePixelRatio / 1.25}px">-->
<!--    <p class="m-auto text-9xl">Loading...</p>-->
<!--</div>-->
