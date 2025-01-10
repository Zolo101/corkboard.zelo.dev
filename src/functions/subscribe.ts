import {
    ApiGatewayManagementApiClient,
    GetConnectionCommand,
    PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { unmarshallArray } from "$lib/util";
import { removeConnection } from "./websocket";

// no broadcast method :(
const getAllConnections = async (db: DynamoDBClient) => {
    const { Items } = await db.send(new ScanCommand({
        TableName: Resource.Connections.name
    }));

    return unmarshallArray(Items ?? []);
}

export const postHandler = async (event: any) => {
    const client = new ApiGatewayManagementApiClient({
        endpoint: Resource.PostWebSocket.managementEndpoint
    });
    const db = new DynamoDBClient();

    const { Records } = event;
    const newPosts: string[] = [];
    const newReplies: string[] = [];
    for (const newThing of Records) {
        // Find partition id of new posts & replies
        if (newThing.eventName === "INSERT") {
            const {replyId, postId} = unmarshall(newThing.dynamodb.Keys);
            if (replyId === postId) {
                newPosts.push(postId);
            } else {
                newReplies.push(postId);
            }
        }
    }

    const connections = await getAllConnections(db);
    const postCalls = connections.map(async (connection) => {
        try {
            console.log(connection)
            await client.send(new PostToConnectionCommand({
                ConnectionId: connection.connectionId,
                Data: JSON.stringify({
                    newPosts,
                    newReplies
                })
            }));
        } catch (error: any) {
            if (error.$metadata.httpStatusCode === 410) {
                // 410 -- Gone :(
                await removeConnection(db, connection.connectionId);
            } else {
                console.error(error);
            }
        }
    });

    // console.log("\n\nNew stuff", JSON.stringify(event, null, 2));
    // TODO: Error handling
    await Promise.all(postCalls);
}
