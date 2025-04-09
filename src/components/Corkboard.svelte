<script lang="ts">
    import "@pixi/gif";
    import {
        AnimatedSprite,
        Application,
        Assets,
        BitmapText,
        ColorMatrixFilter,
        Container,
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
    import boardURL from "$lib/assets/board.png";
    import borderURL from "$lib/assets/border.png";
    import dotsURL from "$lib/assets/dots.png";
    import fontURL from "$lib/assets/fonts/vcr_osd_mono_regular_24_x2.fnt?url";
    import type { Post } from "../app";
    import { DropShadowFilter, OutlineFilter, PixelateFilter } from "pixi-filters";

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

        const boardTexture = await Assets.load(boardURL);
        const borderTexture = await Assets.load(borderURL);
        const dotsTexture = await Assets.load(dotsURL);

        const previewImage = new Sprite();
        const postContainer = new Container();
        const board = new Sprite(boardTexture);
        const border = new Sprite(borderTexture);
        const dots = new TilingSprite({
            texture: dotsTexture,
            width: 610 * 2,
            height: 470 * 2
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
        hoverText.position.set(40, 20);
        dots.position.set(20, 5);
        dots.scale.set(0.5);
        dots.alpha = 0.75;
        previewImage.position.set(320, 240);
        previewImage.anchor.set(0.5, 0.5);

        app.stage.addChild(board);
        app.stage.addChild(dots);
        app.stage.addChild(postContainer);
        app.stage.scale.set(scale);

        const pixelate = new PixelateFilter(2);

        const globalContrast = new ColorMatrixFilter();
        globalContrast.contrast(0.5, false);

        const outline = new OutlineFilter({ thickness: 2, color: 0xfdb896 });
        const hoverTextOutline = new OutlineFilter({
            thickness: 2,
            color: 0x000000
        });
        const goodBoundingBox = new OutlineFilter({
            thickness: 4,
            color: 0x00ff00,
            quality: 1
        });
        const badBoundingBox = new OutlineFilter({
            thickness: 4,
            color: 0xff4000,
            quality: 1
        });
        const currentPostOutline = new OutlineFilter({
            thickness: 4,
            color: 0xffffff,
            quality: 1,
            alpha: 0.25
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
            quality: 1
            // rotation: Math.PI / 6,
            // resolution: 1,
        });

        const hoverTextDropShadow = new DropShadowFilter({
            offset: { x: 1, y: 1 },
            color: 0x000000,
            // alpha: 1,
            // blur: 2,
            quality: 1
            // rotation: Math.PI / 6,
            // resolution: 1,
        });

        hoverText.filters = [hoverTextOutline, hoverTextDropShadow];
        loadingGIF.filters = [pixelate];
        previewImage.filters = [globalContrast, pixelate];

        board.interactive = true;
        board.addEventListener("pointermove", (event) => {
            if (event.global.y < 150) {
                hoverText.position.set(30, 510 - hoverText.height);
                hoverText.anchor.set(0, 1);
            } else {
                hoverText.position.set(40, 20);
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

        const createPostSprite = async (post: Post) => {
            // const postSprite = post.files[0].at(-1) === "f" ? await Assets.load(getPostURL(post.id, post.files[0])) : new Sprite(await Assets.load(getPostURL(post.id, post.files[0])))

            // Posts are required to have at least one file
            const firstFile = post.files[0]!;
            // const postSprite = new Sprite(await Assets.load(boardURL));
            const postSprite = new Sprite(await Assets.load(getPostURL(firstFile)));
            postMap.set(post, postSprite);
            // await swapSpriteWithPost(postSprite, firstFile)
            // const postSprite = new Image(postTexture)
            // postSprite.x = clamp(Math.random() * 640, 100, 500)
            // postSprite.y = clamp(Math.random() * 480, 100, 400)
            // console.log(post)

            postSprite.x = post.x;
            postSprite.y = post.y;
            postSprite.eventMode = "dynamic";
            let area = postSprite.width * postSprite.height;
            // let maxArea = 200 * 200
            let maxArea = 100 * 100;
            // let maxArea = 150 * 150
            if (area > maxArea) {
                postSprite.scale.set(maxArea / area);
            }

            const contrast = new ColorMatrixFilter();
            contrast.contrast(0.5, false);

            // if (post.id !== $id) {
            postSprite.on("pointerdown", (event) => {
                if (selectedPostSprite) {
                    selectedPostSprite.filters = [contrast, pixelate];
                }
                selectedPostSprite = postSprite;
                postSprite.filters = [contrast, pixelate, outline];
                $id = post.postId.substring(5); // Remove POST#
            });

            postSprite.on("pointerover", (event) => {
                postSprite.filters = [contrast, pixelate, currentPostOutline];
                contrast.contrast(0.5, true);
                hoverText.text = post.title;

                corkDOM.style.cursor = "pointer";
            });

            postSprite.on("pointerout", (event) => {
                if (selectedPostSprite !== postSprite) postSprite.filters = [contrast, pixelate];
                contrast.contrast(0.5, false);
                hoverText.text = defaultHoverText;

                corkDOM.style.cursor = "initial";
            });

            postSprite.filters = [contrast, pixelate];

            postContainer.addChild(postSprite);
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

        app.stage.addChild(border);
        app.stage.addChild(hoverText);
        app.stage.addChild(loadingGIF);
        app.stage.addChild(previewImage);

        app.ticker.add((delta) => {
            dots.tilePosition.x -= travelSpeed * delta.deltaTime;
            dots.tilePosition.y -= travelSpeed * delta.deltaTime;
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
                        const bounds = previewImage.getBounds();

                        if (selected) previewImage.position.set(e.data.global.x, e.data.global.y);
                        const outsideBoard =
                            bounds.left < 20 ||
                            bounds.top < 18 ||
                            bounds.right > 613 ||
                            bounds.bottom > 463;

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

                // 177x100f
                let scaleX = 177 / texture.width;
                let scaleY = 100 / texture.height;
                previewImage.scale.set(Math.min(scaleX, scaleY));
            }
        });

        searchText.subscribe((text) => {
            if (text.length === 0) {
                hoverText.text = "Hover over a post to see its title!";
                return;
            }

            // if (text) {
            let found = 0;
            let lastFoundPost;

            // TODO: Full text search using the api (like in 5beam)
            for (const [post, sprite] of postMap) {
                const match = post.title.includes(text);
                sprite.alpha = match ? 1 : 0.2;
                if (match) {
                    found += 1;
                    lastFoundPost = post;
                }
            }

            if (found === 1) {
                hoverText.text = lastFoundPost.title;
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
