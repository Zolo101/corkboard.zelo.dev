import type { S3Client } from "@aws-sdk/client-s3";
import { Resource } from "sst";
import { Upload } from "@aws-sdk/lib-storage";
import { TwitterSnowflake } from "@sapphire/snowflake";
import { RekognitionClient, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

const Rekognition = new RekognitionClient();

const analyzeImage = async (file: File) => {
    const buffer = await file.arrayBuffer();

    const moderation = await Rekognition.send(
        new DetectModerationLabelsCommand({
            Image: { Bytes: new Uint8Array(buffer) },
            MinConfidence: 60
        })
    );

    return moderation.ModerationLabels;
};

const makeConfig = (file: File) => {
    return {
        Bucket: Resource.Media.name,
        Key: `og/${TwitterSnowflake.generate().toString()}-${file.name}`,
        Body: file,
        ContentType: file.type
    };
};

const NSFW = ["Explicit", "Graphic Violence", "Death and Emaciation", "Hate Symbols"];

export const uploadFiles = async (s3: S3Client, files: File[]) => {
    // TODO: Batch this once we have multiple file post
    return Promise.all(
        files.map(async (file) => {
            // Only analyze image files
            if (file.type.startsWith("image/")) {
                const analysis = await analyzeImage(file);

                // This should never happen??
                if (!analysis) {
                    throw new Error("Unable to moderate image");
                }

                if (analysis.some((label) => NSFW.includes(label.Name!))) {
                    throw new Error(
                        "This image was moderated, please try again with a different image."
                    );
                }
            }

            return new Upload({
                client: s3,
                params: makeConfig(file)
            }).done();
        })
    );
};
