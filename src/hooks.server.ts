import type { Handle } from "@sveltejs/kit";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { RateLimiter } from "$lib/server/rateLimit";

// Rate limit configuration
const rateLimiter = new RateLimiter({
    windowSeconds: 60, // 1 minute
    max: 30 // 30 requests per minute
});

export const handle: Handle = async ({ event, resolve }) => {
    // TODO: Use DocumentClient? https://github.com/dabit3/dynamodb-documentclient-cheat-sheet
    event.locals.db = DynamoDBDocumentClient.from(new DynamoDBClient());
    event.locals.s3 = new S3Client();

    // Skip rate limiting for static assets and API routes
    if (!event.url.pathname.startsWith("/api/")) {
        return resolve(event);
    }

    // Use IP address as rate limit key
    const ip = event.getClientAddress();
    const { allowed, remaining } = await rateLimiter.check(event.locals.db, ip);

    if (!allowed) {
        return new Response("Too Many Requests", {
            status: 429,
            headers: {
                "X-RateLimit-Remaining": remaining.toString(),
                "Retry-After": "60"
            }
        });
    }

    // Add rate limit headers to response
    const response = await resolve(event);
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    return response;
};
