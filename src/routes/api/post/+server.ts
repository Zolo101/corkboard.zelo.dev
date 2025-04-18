import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getPost, postPost } from "$lib/server/REST";
import { uploadFile } from "$lib/server/S3";
import { postSchema } from "$lib/server/validation";
import { handleError } from "$lib/server/serverUtils";

export const GET: RequestHandler = async ({ locals: { db }, url }) => {
    const id = url.searchParams.get("id");
    return json(await getPost(db, id ?? "-1"));
};

export const POST: RequestHandler = async ({ locals: { db, s3 }, request, getClientAddress }) => {
    const body = await request.formData();

    try {
        // Convert FormData to object for validation
        const formData = {
            title: body.get("title"),
            content: body.get("content"),
            file: body.get("file"),
            x: body.get("x"),
            y: body.get("y")
        };

        // Validate the form data
        const validatedData = postSchema.parse(formData);

        // Upload images first
        const stringKey = (await uploadFile(s3, validatedData.file)).Key;

        if (!stringKey) {
            return error(500, "Failed to upload file");
        }

        // Used for anonymous separation
        const ip = getClientAddress();
        const postId = await postPost(db, ip, body, stringKey);

        if (postId) {
            return json(postId);
        } else {
            return error(500, "Failed to post");
        }
    } catch (e) {
        return handleError(e);
    }
};
