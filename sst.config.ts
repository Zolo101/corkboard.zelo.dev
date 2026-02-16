/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
    app(input) {
        return {
            name: "corkboard",
            removal: input?.stage === "production" ? "retain" : "remove",
            protect: ["production"].includes(input?.stage),
            home: "aws",
            providers: { cloudflare: "6.10.0" }
        };
    },
    async run() {
        // Media S3 Bucket
        const media = new sst.aws.Bucket("Media", {
            access: "cloudfront"
        });
        media.notify({
            notifications: [
                {
                    name: "MediaResizer",
                    function: {
                        handler: "src/functions/onupload.resizer",
                        link: [media],
                        nodejs: {
                            install: ["sharp"]
                        }
                    },
                    events: ["s3:ObjectCreated:*"],
                    filterPrefix: "og/"
                }
            ]
        });
        // CloudFront CDN
        new sst.aws.Router("CDN", {
            routes: {
                "/*": {
                    bucket: media,
                    edge: {
                        viewerResponse: {
                            // For CORS during local development
                            injection:
                                "event.response.headers['access-control-allow-origin'] = { value: '*' };"
                        }
                    }
                }
            }
        });
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
                postType: "string" // "post" or "reply"
                // creatorId: "string",
                // files: "string[]",
                // content: "string",
                // createdAt: "string",
                // updatedAt: "string",
            },
            primaryIndex: { hashKey: "postId", rangeKey: "replyId" },
            globalIndexes: {
                postTypeIndex: {
                    hashKey: "postType",
                    rangeKey: "postId"
                }
            },
            stream: "new-image"
        });
        // Connection table for WebSocket
        const connections = new sst.aws.Dynamo("Connections", {
            fields: {
                connectionId: "string"
            },
            primaryIndex: { hashKey: "connectionId" }
        });
        // Rate limiting table
        const rateLimits = new sst.aws.Dynamo("RateLimits", {
            fields: {
                key: "string",
                timestamp: "number"
                // count: "number"
            },
            primaryIndex: { hashKey: "key", rangeKey: "timestamp" },
            ttl: "timestamp"
        });
        // WebSocket for Realtime Post & Reply creation
        const postsWebsocket = new sst.aws.ApiGatewayWebSocket("PostWebSocket");
        postsWebsocket.route("$connect", {
            // runtime: "go",
            handler: "src/functions/websocket.connect",
            link: [connections]
        });
        postsWebsocket.route("$disconnect", {
            // runtime: "go",
            handler: "src/functions/websocket.disconnect",
            link: [connections]
        });
        posts.subscribe("PostSubscriber", {
            handler: "src/functions/subscribe.postHandler",
            link: [connections, postsWebsocket]
        });
        // I think I'm going to just go with IP
        const IPHashSalt = new sst.Secret("IPHashSalt");
        // Frontend
        new sst.aws.SvelteKit("Site", {
            domain: {
                name: "corkboard.zelo.dev",
                dns: sst.cloudflare.dns()
            },
            link: [rateLimits, media, posts, IPHashSalt],
            permissions: [
                {
                    actions: ["rekognition:DetectModerationLabels"],
                    resources: ["*"]
                }
            ]
        });
    }
});
