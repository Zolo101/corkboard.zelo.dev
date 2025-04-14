import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getPost, postReply } from "$lib/server/REST";
import { uploadFiles } from "$lib/server/S3";

export const POST: RequestHandler = async ({ locals: { db, s3 }, request, getClientAddress }) => {
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
            try {
                [{ Key: FileKey }] = await uploadFiles(s3, [file] as File[]);
            } catch (e: unknown) {
                if (e instanceof Error && e.message.includes("Content Moderated")) {
                    return error(
                        403,
                        "This image was moderated, please try again with a different image."
                    );
                }
            }

            if (FileKey === undefined) {
                return new Response("Failed to upload file", { status: 500 });
            }
        }
    }

    // Used for anonymous seperation
    const ip = getClientAddress();
    const postId = body.get("postId") as string;
    const replyId = await postReply(db, ip, postId, body, FileKey);

    if (replyId) {
        // TODO: Is there a better way to return?
        // All good! Let's return the whole post so it refreshes
        return json(await getPost(db, postId));
    } else {
        return new Response("Failed to reply", { status: 500 });
    }
};
