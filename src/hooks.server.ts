import type { Handle } from "@sveltejs/kit";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

export const handle: Handle = async ({ event, resolve }) => {
    // TODO: Use DocumentClient? https://github.com/dabit3/dynamodb-documentclient-cheat-sheet
    event.locals.db = new DynamoDBClient();
    event.locals.s3 = new S3Client();

    return resolve(event);
};
