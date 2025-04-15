import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    max: number; // Maximum number of requests allowed in the window
}

export class RateLimiter {
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    async check(
        db: DynamoDBDocumentClient,
        key: string
    ): Promise<{ allowed: boolean; remaining: number }> {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Query for requests in the current window
        const queryCommand = new QueryCommand({
            TableName: Resource.RateLimits.name,
            KeyConditionExpression: "#key = :key AND #timestamp > :windowStart",
            ExpressionAttributeNames: {
                "#key": "key",
                "#timestamp": "timestamp"
            },
            ExpressionAttributeValues: {
                ":key": key,
                ":windowStart": windowStart
            }
        });

        const { Items } = await db.send(queryCommand);
        if (!Items) {
            return { allowed: true, remaining: this.config.max };
        }

        // Count total requests in the window
        const count = Items.reduce((sum, item) => sum + (item.count || 0), 0);
        const remaining = Math.max(0, this.config.max - count);

        if (count >= this.config.max) {
            return { allowed: false, remaining };
        }

        // Record the new request
        const putCommand = new PutCommand({
            TableName: Resource.RateLimits.name,
            Item: {
                key,
                timestamp: now,
                count: 1
            }
        });

        await db.send(putCommand);

        return { allowed: true, remaining };
    }
}
