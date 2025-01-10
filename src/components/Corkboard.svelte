<script lang="ts">
    import "@pixi/gif"
    import {
        AnimatedSprite,
        Application,
        Assets, BaseImageResource, BitmapFont,
        BitmapText,
        ColorMatrixFilter, Container, Graphics, loadTextures, Rectangle,
        Sprite, Texture,
        TilingSprite,
    } from "pixi.js"
    import {onMount} from "svelte";
    import { PixelateFilter } from "@pixi/filter-pixelate";
    import { OutlineFilter } from "@pixi/filter-outline";
    import { DropShadowFilter } from "@pixi/filter-drop-shadow";
    import {
        boardStage,
        creatingPostImageBlob,
        creatingPostTitleText,
        id,
        loading,
        posts,
        BoardStage, searchText, creatingPostFormData
    } from "../app";
    import type { Post } from "../app";
    // const getPostURL = (id, name) => `https://cdn.zelo.dev/api/files/h3pktm4cd0utllp/${id}/${name}?thumb=177x100f`;
    const getPostURL = (id: string) => `https://d3oeaaqvfzway3.cloudfront.net/200/${id.substring(3)}`;

    const clamp = (num: number, min: number, max: number) => Math.max(Math.min(num, max), min)

    onMount(async () => {
        const app = new Application({
            width: 640,
            height: 480,
            backgroundAlpha: 0,
            antialias: false,

        })

        const corkDOM = document.querySelector<HTMLDivElement>("#corkboard")!;
        corkDOM.append(app.view);

        const currentPost: Post | undefined = $posts.find(post => post.postId === $id)
        const defaultHoverText = currentPost?.title || "Hover over a post to see its title!"

        const vcr = await Assets.load("/corkboard/vcr_osd_mono_regular_24_x2.fnt")

        let travelSpeed = $boardStage ? 0.25 : 1
        const loadingGIF: AnimatedSprite = await Assets.load("/corkboard/loading.gif")
        loadingGIF.position.set(470, 330)
        // loadingGIF.scale.set(1)
        loading.subscribe(loading => loadingGIF.alpha = loading ? 0.5 : 0)

        const boardTexture = await Assets.load("/corkboard/board.png")
        const borderTexture = await Assets.load("/corkboard/border.png")
        const dotsTexture = await Assets.load("/corkboard/dots.png")
        // const frontground = new Graphics()
        // frontground.beginFill(0x000000, 0.5)
        // frontground.drawRect(0, 0, 640, 480)
        // frontground.endFill()


        const previewImage = new Sprite()
        const postContainer = new Container()
        const board = new Sprite(boardTexture)
        const border = new Sprite(borderTexture)
        const dots = new TilingSprite(dotsTexture, 610 * 2, 470 * 2)
        // const hoverfont = BitmapFont.from("vcr_osd_mono_regular_24_x2")
        const hovertext = new BitmapText(defaultHoverText, {
            fontName: "VCR OSD Mono",
            fontSize: 12,
            letterSpacing: -2,
            maxWidth: 560
        })
        hovertext.position.set(40, 20)
        dots.position.set(20, 5)
        dots.scale.set(0.5)
        dots.alpha = 0.75
        previewImage.position.set(320, 240)
        previewImage.anchor.set(0.5, 0.5)

        app.stage.addChild(board)
        app.stage.addChild(dots)
        app.stage.addChild(postContainer)

        const pixelate = new PixelateFilter(2);

        const globalContrast = new ColorMatrixFilter();
        globalContrast.contrast(0.5, false);

        const outline = new OutlineFilter(2, 0xfdb896);
        const goodBoundingBox = new OutlineFilter(4, 0x00ff00, 1);
        const badBoundingBox = new OutlineFilter(4, 0xff4000, 1);
        const currentPostOutline = new OutlineFilter(16, 0xffffff, 0.5, 0.25);

        const dropshadow = new DropShadowFilter({
            // offset: 5,
            color: 0x000000,
            // alpha: 1,
            blur: 5,
            quality: 1,
            // rotation: Math.PI / 6,
            // resolution: 1,
        })

        const boundingBoxDropShadow = new DropShadowFilter({
            offset: {x: 20, y: 20},
            color: 0x000000,
            // alpha: 1,
            blur: 5,
            quality: 1,
            // rotation: Math.PI / 6,
            // resolution: 1,
        })

        const hovertextdropshadow = new DropShadowFilter({
            offset: {x: 1, y: 1},
            color: 0x000000,
            // alpha: 1,
            blur: 2,
            quality: 1,
            // rotation: Math.PI / 6,
            // resolution: 1,
        })

        hovertext.filters = [hovertextdropshadow]
        loadingGIF.filters = [pixelate]
        previewImage.filters = [globalContrast, pixelate]

        board.interactive = true;
        board.addEventListener("pointermove", (event) => {
            if (event.global.y < 150) {
                hovertext.position.set(30, 510 - hovertext.height)
                hovertext.anchor.set(0, 1)
            } else {
                hovertext.position.set(40, 20)
                hovertext.anchor.set(0, 0)
            }
        })

        const postMap = new Map<Post, Sprite>()
        let oldId: string;

        const createPostSprite = async (post: Post) => {
            // const postSprite = post.files[0].at(-1) === "f" ? await Assets.load(getPostURL(post.id, post.files[0])) : new Sprite(await Assets.load(getPostURL(post.id, post.files[0])))

            // Posts are required to have at least one file
            const firstFile = post.files[0]!;
            const postSprite = new Sprite(await Assets.load(getPostURL(firstFile)));
            postMap.set(post, postSprite)
            // const postSprite = new Image(postTexture)
            // postSprite.x = clamp(Math.random() * 640, 100, 500)
            // postSprite.y = clamp(Math.random() * 480, 100, 400)
            // console.log(post)

            postSprite.x = post.x
            postSprite.y = post.y
            postSprite.eventMode = "dynamic";
            let area = postSprite.width * postSprite.height
            // let maxArea = 200 * 200
            // let maxArea = 100 * 100
            let maxArea = 150 * 150
            if (area > maxArea) {
                postSprite.scale.set(maxArea / area)
            }

            const contrast = new ColorMatrixFilter();
            contrast.contrast(0.5, false);

            // if (post.id !== $id) {
            postSprite.on("pointerdown", (event) => {
                oldId = $id;
                $id = post.postId.substring(5); // Remove POST#
            })

            postSprite.on("pointerover", (event) => {
                if (oldId === post.postId) postSprite.filters = [contrast, pixelate, outline, dropshadow]
                contrast.contrast(0.5, true);
                hovertext.text = post.title

                corkDOM.style.cursor = "pointer";
            })

            postSprite.on("pointerout", (event) => {
                if (oldId === post.postId) postSprite.filters = [contrast, pixelate]
                contrast.contrast(0.5, false);
                hovertext.text = defaultHoverText

                corkDOM.style.cursor = "initial";
            })
            // }


            postSprite.filters = [contrast, pixelate]

            postContainer.addChild(postSprite)
        }

        // console.log($posts)
        posts.subscribe((ps) => {
            // Only create for new posts
            ps
                .reverse()
                .filter(post => !postMap.has(post))
                .forEach(createPostSprite)
        })

        // Add filters to current post
        // id.subscribe((v) => {
        //     if (oldId) postMap.get(oldId).filters = []
        //     postMap.get(v).filters = [globalContrast, pixelate, currentPostOutline, dropshadow]
        // })

        app.stage.addChild(border)
        app.stage.addChild(hovertext)
        app.stage.addChild(loadingGIF)
        app.stage.addChild(previewImage)

        app.ticker.add((delta) => {
            dots.tilePosition.x -= travelSpeed * delta;
            dots.tilePosition.y -= travelSpeed * delta;
        })

        boardStage.subscribe((bs) => {
            switch (bs) {
                case BoardStage.None:
                    postContainer.visible = true
                    previewImage.visible = false
                    hovertext.text = "Hover over a post to see its title!"
                    board.tint = "#ffffff"
                    dots.tint =  "#ffffff"
                    travelSpeed = 0.25
                    break;

                case BoardStage.Creating:
                    postContainer.visible = false
                    previewImage.visible = true
                    hovertext.text = "Preview:"
                    board.tint = "#e4ff9e"
                    dots.tint = "#e4ff9e"
                    travelSpeed = 1
                    break;

                case BoardStage.Placing:
                    postContainer.visible = true
                    previewImage.visible = true
                    previewImage.interactive = true

                    let selected = false;
                    previewImage.addEventListener("pointerdown", _ => selected = true)
                    previewImage.addEventListener("pointerup", _ => selected = false)
                    previewImage.addEventListener("pointermove", (e) => {
                        const bounds = previewImage.getBounds();

                        if (selected) previewImage.position.set(e.data.global.x, e.data.global.y)
                        const outsideBoard =
                            bounds.left < 20   ||
                            bounds.top < 18    ||
                            bounds.right > 613 ||
                            bounds.bottom > 463

                        // console.log(previewImage.getBounds().left, previewImage.getBounds().top, previewImage.getBounds().right, previewImage.getBounds().bottom)
                        previewImage.filters = outsideBoard ? [globalContrast, pixelate, badBoundingBox, boundingBoxDropShadow] : [globalContrast, pixelate, goodBoundingBox, boundingBoxDropShadow]

                        if (!outsideBoard) {
                            // console.log(bounds.left, bounds.top, bounds.left.toString(), bounds.top.toString())
                            // hovertext.position.set(previewImage.position.x, previewImage.position.y)
                            $creatingPostFormData.set("x", bounds.left.toString())
                            $creatingPostFormData.set("y", bounds.top.toString())
                        }
                        // let sprites = [...postMap.values()]
                        // sprites.map(s => {
                            // s.filters = [globalContrast, pixelate, goodBoundingBox, dropshadow]
                        // })
                    })

                    hovertext.text = "Place the post!"
                    board.tint = "#ffc09e"
                    dots.tint = "#ffc09e"
                    travelSpeed = 2
                    break;

                case BoardStage.Placed:
                    // reset preview image changes
                    previewImage.interactive = false
                    previewImage.texture = Texture.EMPTY
                    previewImage.filters = []
                    previewImage.position.set(320, 240)

                    $boardStage = BoardStage.None

                case BoardStage.SearchingNoResults:
                    board.tint = "#ffc09e"
                    dots.tint = "#ffc09e"
                    travelSpeed = 0
                    break;
            }
        })

        creatingPostTitleText.subscribe((text) => {
            hovertext.text = text || "Preview:"
        })

        creatingPostImageBlob.subscribe(async (file) => {
            if (file) {
                const texture = await Texture.fromURL(URL.createObjectURL(file))
                previewImage.texture = texture;

                // 177x100f
                let scaleX = 177 / texture.width
                let scaleY = 100 / texture.height
                previewImage.scale.set(Math.min(scaleX, scaleY))
            }
        })

        searchText.subscribe((text) => {
            if (text.length === 0) {
                hovertext.text = "Hover over a post to see its title!"
                return
            }

            // if (text) {
                let found = 0
                let lastFoundPost;

                // TODO: Full text search using the api (like in 5beam)
                for (const [post, sprite] of postMap) {
                    const match = post.title.includes(text)
                    sprite.alpha = match ? 1 : 0.2
                    if (match) {
                        found += 1
                        lastFoundPost = post
                    }
                }

                if (found === 1) {
                    hovertext.text = lastFoundPost.title;
                } else {
                    hovertext.text = found ? `Found ${found} results` : "No results found"
                }
                // if (!one) $boardStage = BoardStage.SearchingNoResults
            // }
        })
    })
</script>

<div id="corkboard" style="-webkit-tap-highlight-color: transparent;"></div>