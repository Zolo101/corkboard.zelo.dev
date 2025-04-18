import type { PageServerLoad } from "../../../.svelte-kit/types/src/routes/[[id]]/$types";
import { getBoard, getPost } from "$lib/server/REST";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals: { db }, params }) => {
    const board = await getBoard(db);
    if (params.id) {
        const post = await getPost(db, params.id);
        if (post === null) {
            throw error(404, "Post not found");
        }

        return {
            board,
            post: post,
            id: params.id
        };
    } else {
        return {
            board
        };
    }
};
