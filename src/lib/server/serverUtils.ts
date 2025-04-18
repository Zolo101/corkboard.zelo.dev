import { error } from "@sveltejs/kit";
import { createHash } from "crypto";
import { Resource } from "sst";
import { ZodError } from "zod";

export function hashIP(ip: string) {
    const hash = createHash("sha256");
    const salt = Resource.IPHashSalt.value;
    hash.update(ip + salt);

    return hash.digest("hex");
}

export function handleError(e: unknown) {
    if (e instanceof ZodError) {
        const [{ message }] = e.errors;
        return error(400, message);
    }
    // S3 error
    if (e instanceof Error) {
        return error(400, e.message);
    }
    return error(500, "An unexpected error occurred");
}
