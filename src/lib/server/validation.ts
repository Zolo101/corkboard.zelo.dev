import { z } from "zod";

// Common file validation
const fileSchema = z
    .instanceof(File)
    .refine((file) => file.size > 0, "File cannot be empty")
    .refine(
        (file) => file.size <= 3 * 1024 * 1024, // 3MB
        "File size must be less than 3MB"
    )
    .refine((file) => file.type.startsWith("image/"), "Only image files are allowed");

// Post validation schema
export const postSchema = z.object({
    title: z.string().min(1, "Title is required").max(64, "Title must be less than 64 characters"),
    content: z
        .string()
        .min(1, "Content is required")
        .max(2048, "Content must be less than 2048 characters"),
    file: fileSchema,
    x: z.string().transform(Number),
    y: z.string().transform(Number)
});

// Reply validation schema
export const replySchema = z.object({
    postId: z.string().min(1, "Post ID is required"),
    content: z
        .string()
        .min(1, "Content is required")
        .max(2048, "Content must be less than 2048 characters"),
    file: fileSchema.optional()
});
