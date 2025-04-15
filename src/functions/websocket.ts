import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

export const addConnection = async (db: DynamoDBDocumentClient, id: string) => {
    console.log("New Connection:", id);
    return db.send(
        new PutCommand({
            TableName: Resource.Connections.name,
            Item: {
                connectionId: id
            }
        })
    );
};

export const removeConnection = async (db: DynamoDBDocumentClient, id: string) => {
    console.log("Disconnected:", id);
    return db.send(
        new DeleteCommand({
            TableName: Resource.Connections.name,
            Key: {
                connectionId: id
            }
        })
    );
};

export const connect = async (event: any) => {
    const db = DynamoDBDocumentClient.from(new DynamoDBClient());
    await addConnection(db, event.requestContext.connectionId);
    return { statusCode: 200 };
};

export const disconnect = async (event: any) => {
    const db = new DynamoDBClient();
    await removeConnection(db, event.requestContext.connectionId);
    return { statusCode: 200 };
};
