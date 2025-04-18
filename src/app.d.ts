// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { S3Client } from "@aws-sdk/client-s3";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            db: DynamoDBDocumentClient;
            s3: S3Client;
        }
        // interface PageData {}
        // interface Platform {}
    }
}

// export {};
