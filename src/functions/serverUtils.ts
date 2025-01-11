import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// In order to stop @aws-sdk from being included in client, I've split the utils file into client and server.
export const unmarshallArray = (array: Record<string, AttributeValue>[]) => array.map((val) => unmarshall(val));