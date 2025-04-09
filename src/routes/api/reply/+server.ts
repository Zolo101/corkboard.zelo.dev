import { error, json, type RequestHandler, text } from "@sveltejs/kit";
import { getPost, postReply } from "$lib/REST";
import { uploadFiles } from "$lib/S3";

export const POST: RequestHandler = async ({ locals: { db, s3 }, request }) => {
    // TODO: Dirty!
    const body = await request.formData();

    if (!body.has("postId")) {
        return new Response("No postId found", { status: 400 });
    }

    let FileKey: string | undefined = undefined;
    if (body.has("files")) {
        // Upload image first
        const file = body.get("files") as File;

        // Yeah, sometimes the file is empty
        if (file.size !== 0) {
            // string cheese
            [{ Key: FileKey }] = await uploadFiles(s3, [file] as File[]);

            if (FileKey === undefined) {
                return new Response("Failed to upload file", { status: 500 });
            }
        }
    }

    const postId = body.get("postId") as string;
    const replyId = await postReply(db, postId, body, FileKey);

    if (replyId) {
        // TODO: Is there a better way to return?
        // All good! Let's return the whole post so it refreshes
        return json(await getPost(db, postId));
    } else {
        return new Response("Failed to reply", { status: 500 });
    }
};
