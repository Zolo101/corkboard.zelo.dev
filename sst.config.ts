/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
          name: "corkboard",
          removal: input?.stage === "production" ? "retain" : "remove",
          protect: ["production"].includes(input?.stage),
          home: "aws",
        };
    },
    async run() {
        // Media S3 Bucket
        const media = new sst.aws.Bucket("CorkboardMedia", {
          access: "public"
        })

        // CloudFront CDN
        new sst.aws.Router("CorkboardRouter", {
            routes: {
                "/media/*": {
                    bucket: media
                }
            }
        })

        // Frontend
        new sst.aws.SvelteKit("Corkboard", {
            link: [media]
        });

        // Lambda
        new sst.aws.Function("Corkboard_ThumbnailGenerate", {
            handler: "src/lambda/ThumbnailGenerate.handler",
            timeout: "3 minutes",
            memory: "1024 MB",
            link: [media]
        })

        // Corkboard Posts & Replies
        new sst.aws.Dynamo("CorkboardMessages", {

        })

        // Anonymous User Pool
        new sst.aws.CognitoUserPool("CorkboardUserPool", {

        })

        // Web Push Notifications
        new sst.aws.SnsTopic("CorkboardNotifications", {

        })
    },
});
