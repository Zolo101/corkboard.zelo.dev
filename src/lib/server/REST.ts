import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { TwitterSnowflake } from "@sapphire/snowflake";
import type { Post, Reply, Thread } from "$lib/index.svelte";
import { hashIP } from "./serverUtils";

export const getPost = async (
    db: DynamoDBDocumentClient,
    postId: string
): Promise<Thread | null> => {
    const { Items } = await db.send(
        new QueryCommand({
            TableName: Resource.Posts.name,
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: {
                ":postId": "POST#" + postId
            }
        })
    );

    // Found nothing...
    if (Items?.length === 0) {
        return null;
    }

    const [post, ...replies] = Items!;
    return {
        post: post as Post,
        replies: replies as Reply[]
    };
};

export const postPost = async (
    db: DynamoDBDocumentClient,
    ip: string,
    body: any,
    files: string[]
) => {
    // console.log(body)
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
    const postId = TwitterSnowflake.generate().toString();

    return db
        .send(
            new PutCommand({
                TableName: Resource.Posts.name,
                Item: {
                    creator: hashIP(ip),
                    postId: "POST#" + postId,
                    replyId: "POST#" + postId,
                    postType: "post",
                    title: body.get("title"),
                    content: body.get("content"),
                    files: files,
                    x: body.get("x"),
                    y: body.get("y"),
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                }
            })
        )
        .then(() => postId)
        .catch((error) => {
            console.error(error);
            return null;
        });
};

export const postReply = async (
    db: DynamoDBDocumentClient,
    ip: string,
    postId: string,
    body: any,
    fileKey?: string
) => {
    // console.log(body)
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
    const replyId = TwitterSnowflake.generate().toString();

    // Create a new reply
    return db
        .send(
            new PutCommand({
                TableName: Resource.Posts.name,
                Item: {
                    creator: hashIP(ip),
                    postId: "POST#" + postId,
                    replyId: "REPLY#" + replyId,
                    postType: "reply",
                    content: body.get("content"),
                    // Empty file array if fileKey is falsy (null)
                    files: fileKey ? [fileKey] : [],
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                }
            })
        )
        .then(() => postId)
        .catch((error) => {
            console.error(error);
            return null;
        });
};

// export const getBoard = async (db: DynamoDBClient) => {
//     const scanCommand = new ScanCommand({
//         TableName: Resource.Posts.name
//     });
//     const scanResponse = await db.send(scanCommand);
//     const items = scanResponse.Items!;

//     // Process each item
//     for (const item of items) {
//         const unmarshalledItem = unmarshall(item);
//         const postId = unmarshalledItem.postId;
//         const replyId = unmarshalledItem.replyId;

//         // Determine item type based on postId and replyId patterns
//         let itemType = "reply";
//         if (postId === replyId) {
//             itemType = "post";
//         }

//         // Update the item to add the itemType attribute
//         const updateParams = {
//             TableName: Resource.Posts.name,
//             Key: {
//                 postId: { S: postId },
//                 replyId: { S: replyId }
//             },
//             UpdateExpression: "SET postType = :postType",
//             ExpressionAttributeValues: {
//                 ":postType": { S: itemType }
//             }
//         };

//         const updateCommand = new UpdateItemCommand(updateParams);
//         await db.send(updateCommand);
//         console.log(`Updated item ${postId}:${replyId} with itemType: ${itemType}`);
//     }
// };

export const getBoard = async (db: DynamoDBDocumentClient) => {
    // old way
    // const { Items } = await db.send(
    //     new ScanCommand({
    //         TableName: Resource.Posts.name
    //     })
    // );

    const { Items } = await db.send(
        new QueryCommand({
            TableName: Resource.Posts.name,
            IndexName: "postTypeIndex",
            KeyConditionExpression: "postType = :postType",
            ExpressionAttributeValues: {
                ":postType": "post"
            }
        })
    );
    return Items;
};
