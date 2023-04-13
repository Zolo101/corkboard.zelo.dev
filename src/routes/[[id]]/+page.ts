import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { getPost, getPosts, getReplies } from "../../app";

export const load = (async ({ params }) => {
    const posts = await getPosts();
    console.log("LOADING", params.id)
    if (params.id) {
        try {
            return {
                posts,
                post: await getPost(params.id),
                replies: await getReplies(params.id),
                id: params.id
            }
        } catch (e) {
            throw error(404, "Not found");
        }
    } else {
        return {
            posts,
            id: undefined
        }
    }
}) satisfies PageLoad;