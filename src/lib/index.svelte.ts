import { writable } from "svelte/store";

export type Thread = {
    post: Post;
    replies: Reply[];
};

type Base = {
    creator: string; // Hashed IP
    postId: string;
    replyId: string;
    content: string;
    files: string[];
    created: string; // Date string
    updated: string; // Date string
};

export type Post = Base & {
    title: string;
    x: number;
    y: number;
};

export type Reply = Base;

export enum BoardStage {
    None,
    Creating,
    Placing,
    Placed, // transition
    Searching,
    SearchingNoResults
}

export const id = writable<string | undefined>("");
export const loading = writable(false);
export const searchText = writable("");
export const boardStage = writable(BoardStage.None);
export const creatingPostFormData = writable<FormData>();
export const creatingPostTitleText = writable("");
export const creatingPostDescriptionText = writable("");
export const creatingPostImageBlob = writable<File>();
export const creatingReply = writable(false);
export const thread = writable<Thread | undefined>();
export const posts = writable<Post[]>([]);
