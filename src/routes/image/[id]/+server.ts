import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import sharp from "sharp";
import { getPost } from "../../../app";

export const GET = (async ({ url }) => {
    const id = url.pathname.split("/")[2]
    console.log("GENERATING IMAGE", id)
    const post = await getPost(id);
    const URLImage: any = (await grabImageStreamFromURL(`https://cdn.zelo.dev/api/files/h3pktm4cd0utllp/${id}/${post.files[0]}`))!;
    try {
        const text = {
            text: `<span foreground="white">${post.title}</span>`,
            font: 'sans',
            rgba: true,
            dpi: 300
        }


        const image = await sharp(URLImage)
            .resize(854, 480)
            .composite([
                // {input: "static/corkboard/dots_alpha.png", tile: true, blend: "darken"},
                {input: "static/corkboard/vignette.png"},
                {input: {create: {width: 279, height: 100, channels: 4, background: "rgba(0,0,0,0.75)"}}, top: 410, left: 575},
                {input: "static/corkboard/logo_small.png", left: 585, top: 420},
                // {input: {text: text}, left: 14, top: 380},
            ])
            .webp()
            .toBuffer();

        return new Response(image, {
            headers: {
                "Content-Type": "image/webp"
            }
        });
    } catch (e) {
        console.error(e)
        throw error(404, "Not found");
    }
}) satisfies RequestHandler;

const grabImageStreamFromURL = async (url: string) => {
    const response = await fetch(url);
    return response.arrayBuffer();
}