import { writable } from "svelte/store";
import PocketBase from "pocketbase";

export type Thread = {
    post: Post,
    replies: Reply[]
}

export type Post = {
    postId: string
    replyId: string // same as id
    // creator: string
    files: string[]
    title: string
    content: string
    x: number
    y: number
}

export type PostOld = {
    id: string
    creator: string
    files: string[]
    title: string
    content: string
    totalReplies: number
    created: Date
    updated: Date
    x: number
    y: number
}

export type Reply = {
    postId: string
    replyId: string
    creator: string
    file: string
    content: string
    // created: Date
    // updated: Date
}

export enum BoardStage {
    None,
    Creating,
    Placing,
    Placed, // transition
    Searching,
    SearchingNoResults,
}

export const pb = new PocketBase("https://cdn.zelo.dev")
export const id = writable("");
export const loading = writable(false);
export const searchText = writable("");
export const boardStage = writable(BoardStage.None);
export const creatingPostFormData = writable<FormData>();
export const creatingPostTitleText = writable("");
export const creatingPostImageBlob = writable<File>();
export const creatingReply = writable(false);
export const thread =  writable<Thread>();
export const posts =  writable<Post[]>([]);
// export const replies =  writable<Reply[]>([]);
//
// export const getPost = (async (id: string): Promise<Post> => pb
//     .collection("corkboard_posts")
//     .getOne(id))
//
// export const getReplies = (async (id: string): Promise<Reply[]> =>  pb
//     .collection("corkboard_replies")
//     .getFullList(-1, {filter: `post = "${id}"`}))
//
// export const getPosts = (async (): Promise<Post[]> => pb
//     .collection("corkboard_homepage")
//     .getFullList(-1, {sort: "-created"}))