import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getPost, postReply } from "$lib/server/REST";
import { uploadFile } from "$lib/server/S3";
import { replySchema } from "$lib/server/validation";
import { handleError } from "$lib/server/serverUtils";

export const POST: RequestHandler = async ({ locals: { db, s3 }, request, getClientAddress }) => {
    const body = await request.formData();

    try {
        // Convert FormData to object for validation
        const formData = {
            postId: body.get("postId"),
            content: body.get("content"),
            file: body.get("file")
        };

        // Validate the form data
        const validatedData = replySchema.parse(formData);

        let FileKey: string | undefined = undefined;
        if (validatedData.file) {
            const { Key } = await uploadFile(s3, validatedData.file);

            if (Key === undefined) {
                return error(500, "Failed to upload file");
            }

            FileKey = Key;
        }

        // Used for anonymous separation
        const ip = getClientAddress();
        const replyId = await postReply(db, ip, validatedData.postId, body, FileKey);

        if (replyId) {
            return json(await getPost(db, validatedData.postId));
        } else {
            return error(500, "Failed to reply");
        }
    } catch (e) {
        return handleError(e);
    }
};
