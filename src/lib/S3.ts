import type { S3Client } from "@aws-sdk/client-s3"
import { Resource } from "sst";
import { Upload } from "@aws-sdk/lib-storage";
import { TwitterSnowflake } from "@sapphire/snowflake";

const makeConfig = (file: File) => {
    return {
        Bucket: Resource.Media.name,
        Key: `og/${TwitterSnowflake.generate().toString()}-${file.name}`,
        Body: file,
        ContentType: file.type,
    }
}

export const uploadFiles = (s3: S3Client, files: File[]) => {
    // TODO: Batch this
    return Promise.all(files.map(async (file) => {
        return new Upload({
            client: s3,
            params: makeConfig(file),
        }).done();
    }))
}