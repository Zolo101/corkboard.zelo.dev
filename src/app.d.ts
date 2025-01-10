// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
	namespace App {
        import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
        import type { S3Client } from "@aws-sdk/client-s3";

        // interface Error {}
		interface Locals {
            db: DynamoDBClient
            s3: S3Client
        }
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
