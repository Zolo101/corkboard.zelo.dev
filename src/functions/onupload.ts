import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Resource } from "sst";
import sharp from "sharp";
import { Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";

// file is StreamingBlobPayloadOutputTypes
// const resizeAndUpload = async (s3: S3Client, body: any, type: string, size: number, key: string) =>{
//     const transformer = sharp().resize(size);
//     const buffer = Readable.from(body)
//         .pipe(transformer)
//
//     return new Upload({
//         client: s3,
//         params: {
//             Bucket: Resource.Media.name,
//             Key: `${size}/${key}`,
//             Body: buffer,
//             ContentType: type
//         }
//     });
// }

// Remove the "og/" prefix
const pureKey = (key: string) => key.substring(3);

export const resizer = async (event: any) => {
    const S3 = new S3Client();
    // If we don't decode, some keys will be invalid (for example brackets in file names)
    const key = decodeURI(event.Records[0].s3.object.key);
    console.log("Resizing", key);

    const { Body, ContentType } = await S3.send(
        new GetObjectCommand({
            Bucket: Resource.Media.name,
            Key: key
        })
    );

    if (!Body) {
        // Image not found (should never happen)
        return { statusCode: 404 };
    }

    const size = 200;

    try {
        const transformer = sharp().resize(size);
        const buffer = await Readable.from(Body as any) // Body is NodeJsRuntimeStreamingBlobPayloadOutputTypes
            .pipe(transformer)
            .toBuffer();

        await new Upload({
            client: S3,
            params: {
                Bucket: Resource.Media.name,
                Key: `${size}/${pureKey(key)}`,
                Body: buffer,
                ContentType
            }
        }).done();
        // await resizeAndUpload(S3, Body, ContentType!, 200, key);
    } catch (error) {
        console.error(error);
        return { statusCode: 500 };
    }

    return { statusCode: 200 };
};
