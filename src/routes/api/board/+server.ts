import { json, type RequestHandler } from "@sveltejs/kit";
import { getBoard } from "$lib/server/REST";

export const GET: RequestHandler = async ({ locals: { db } }) => {
    return json(await getBoard(db));
};
