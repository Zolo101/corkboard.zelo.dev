import {
    type DynamoDBClient,
    PutItemCommand,
    QueryCommand,
    ScanCommand
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { TwitterSnowflake } from "@sapphire/snowflake";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { Post, Thread } from "$lib/index.svelte";
import { hashIP } from "./serverUtils";

export const getPost = async (db: DynamoDBClient, postId: string): Promise<Thread | null> => {
    // const { Item } = await db.send(new GetItemCommand({
    //     TableName: Resource.Posts.name,
    //     Key: { postId: { S: postId } }
    // }));

    // TODO: Get replies as well
    const { Items } = await db.send(
        new QueryCommand({
            TableName: Resource.Posts.name,
            KeyConditionExpression: "postId = :postId",
            ExpressionAttributeValues: {
                ":postId": { S: "POST#" + postId }
            }
        })
    );

    // Found nothing...
    if (Items?.length === 0) {
        return null;
    }

    const result = (Items ?? []).map((item) => unmarshall(item));

    // find the post
    // const post = take(result as (Post | Reply)[], (item) => item.postId === item.replyId);

    // TODO: The .filter is annoying but I doubt it's that slow... right?
    return {
        post: result.find((item) => item.postId === item.replyId),
        replies: result.filter((item) => item.postId !== item.replyId)
    };
};

export const postPost = async (db: DynamoDBClient, ip: string, body: any, files: string[]) => {
    // console.log(body)
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
    const postId = TwitterSnowflake.generate().toString();

    return db
        .send(
            new PutItemCommand({
                TableName: Resource.Posts.name,
                Item: marshall({
                    creator: hashIP(ip),
                    postId: "POST#" + postId,
                    replyId: "POST#" + postId,
                    title: body.get("title"),
                    content: body.get("content"),
                    files: files,
                    x: body.get("x"),
                    y: body.get("y"),
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                })
            })
        )
        .then(() => postId)
        .catch((error) => {
            console.error(error);
            return null;
        });
};

export const postReply = async (
    db: DynamoDBClient,
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
            new PutItemCommand({
                TableName: Resource.Posts.name,
                Item: marshall({
                    creator: hashIP(ip),
                    postId: "POST#" + postId,
                    replyId: "REPLY#" + replyId,
                    content: body.get("content"),
                    // Empty file array if fileKey is falsy (null)
                    files: fileKey ? [fileKey] : [],
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                })
            })
        )
        .then(() => postId)
        .catch((error) => {
            console.error(error);
            return null;
        });
};

export const getBoard = async (db: DynamoDBClient) => {
    const { Items } = await db.send(
        new ScanCommand({
            TableName: Resource.Posts.name
        })
    );

    // does not work
    // const { Items } = await db.send(new QueryCommand({
    //     TableName: Resource.Posts.name,
    //     KeyConditionExpression: "begins_with(replyId, :post)",
    //     ExpressionAttributeValues: {
    //         ":post": {S: "POST#"}
    //     }
    // }));

    // unmarshall gets rid of the ugly S, N, etc.
    // TODO: Is there a way to NOT filter this?? :sob:
    return Items!
        .map((item) => unmarshall(item))
        .filter((item) => item.replyId.startsWith("POST#")) as Post[];
};
