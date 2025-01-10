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
        const media = new sst.aws.Bucket("Media", {
            access: "cloudfront",
        })
        media.notify({
            notifications: [
                {
                    name: "MediaResizer",
                    function: {
                        handler: "src/functions/onupload.resizer",
                        link: [media]
                    },
                    events: ["s3:ObjectCreated:*"],
                    filterPrefix: "og/"
                }
            ],
        })

        // CloudFront CDN
        new sst.aws.Router("CDN", {
            routes: {
                "/*": {
                    bucket: media,
                    edge: {
                        viewerResponse: {
                            // For CORS during local development
                            injection: "event.response.headers['access-control-allow-origin'] = { value: '*' };"
                        }
                    }
                }
            }
        })

        // Lambda
        // new sst.aws.Function("ThumbnailGenerate", {
        //     handler: "src/lambda/ThumbnailGenerate.handler",
        //     timeout: "3 minutes",
        //     memory: "1024 MB",
        //     link: [media]
        // })

        // Corkboard Posts & Replies
        const posts = new sst.aws.Dynamo("Posts", {
            fields: {
                postId: "string",
                replyId: "string",
                // creatorId: "string",
                // files: "string[]",
                // content: "string",
                // createdAt: "string",
                // updatedAt: "string",
            },
            primaryIndex: { hashKey: "postId", rangeKey: "replyId" },
            stream: "new-image"
        })

        // Connection table for WebSocket
        const connections = new sst.aws.Dynamo("Connections", {
            fields: {
                connectionId: "string"
            },
            primaryIndex: { hashKey: "connectionId" }
        })

        // WebSocket for Realtime Post & Reply creation
        const postsWebsocket = new sst.aws.ApiGatewayWebSocket("PostWebSocket")
        postsWebsocket.route("$connect", {handler: "src/functions/websocket.connect", link: [connections]})
        postsWebsocket.route("$disconnect", {handler: "src/functions/websocket.disconnect", link: [connections]})
        posts.subscribe("PostSubscriber", {handler: "src/functions/subscribe.postHandler", link: [connections, postsWebsocket]})

        // Anonymous User Pool
        new sst.aws.CognitoUserPool("UserPool", {

        })

        // Web Push Notifications
        new sst.aws.SnsTopic("Notifications", {

        })

        // Frontend
        new sst.aws.SvelteKit("Site", {
            link: [media, posts]
        });
    },
});
