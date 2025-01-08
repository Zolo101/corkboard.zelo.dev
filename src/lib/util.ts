import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export const unmarshallArray = (array: Record<string, AttributeValue>[]) => array.map((val) => unmarshall(val));