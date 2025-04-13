import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getPost, postPost } from "$lib/server/REST";
import { uploadFiles } from "$lib/server/S3";

export const GET: RequestHandler = async ({ locals: { db }, url }) => {
    const id = url.searchParams.get("id");
    return json(await getPost(db, id ?? "-1"));
};

export const POST: RequestHandler = async ({ locals: { db, s3 }, request, getClientAddress }) => {
    // TODO: Dirty!
    const body = await request.formData();
    if (body.has("files")) {
        // Upload images first
        const formFiles = body.get("files")!;
        const files = Array.isArray(formFiles) ? formFiles : [formFiles];

        // string cheese
        const stringKeys = await uploadFiles(s3, files as File[])
            .then((results) => results.map((result) => result.Key))
            .catch((error) => {
                console.error(error);
                return [];
            });

        if (stringKeys.length === 0) {
            return error(500, "Failed to upload files");
        }

        // Used for anonymous seperation
        const ip = getClientAddress();
        const postId = await postPost(db, ip, body, stringKeys as string[]);

        if (postId) {
            return json(postId);
        } else {
            return error(500, "Failed to post");
        }
    } else {
        return error(400, "No files found");
    }
};
