import { DeleteItemCommand, DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

export const addConnection = async (db: DynamoDBClient, id: string) => {
    console.log("New Connection:", id);
    return db.send(
        new PutItemCommand({
            TableName: Resource.Connections.name,
            Item: {
                connectionId: { S: id }
            }
        })
    );
};

export const removeConnection = async (db: DynamoDBClient, id: string) => {
    console.log("Disconnected:", id);
    return db.send(
        new DeleteItemCommand({
            TableName: Resource.Connections.name,
            Key: {
                connectionId: { S: id }
            }
        })
    );
};

export const connect = async (event: any) => {
    const db = new DynamoDBClient();
    await addConnection(db, event.requestContext.connectionId);
    return { statusCode: 200 };
};

export const disconnect = async (event: any) => {
    const db = new DynamoDBClient();
    await removeConnection(db, event.requestContext.connectionId);
    return { statusCode: 200 };
};
