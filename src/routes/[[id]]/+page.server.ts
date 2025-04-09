import type { PageServerLoad } from "../../../.svelte-kit/types/src/routes/[[id]]/$types";
import { getBoard, getPost } from "../../lib/REST";

export const load: PageServerLoad = async ({ locals: { db }, params }) => {
    const board = await getBoard(db);
    if (params.id) {
        return {
            board,
            post: await getPost(db, params.id),
            id: params.id
        };
    } else {
        return {
            board
        };
    }
};
