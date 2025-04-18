import { z } from "zod";

// Common file validation
const fileSchema = z
    .instanceof(File)
    .refine((file) => file.size > 0, "File cannot be empty")
    .refine(
        (file) => file.size <= 3 * 1024 * 1024, // 3MB
        "File size must be less than 3MB"
    )
    .refine(
        (file) => file.type.startsWith("image/png") || file.type.startsWith("image/jpeg"),
        "Only PNG & JPEG are allowed"
    );

// Post validation schema
export const postSchema = z.object({
    title: z.string().min(1, "Title is required").max(64, "Title must be less than 64 characters"),
    content: z
        .string()
        .trim()
        .min(1, "Content is required")
        .max(2048, "Content must be less than 2048 characters"),
    file: fileSchema,
    x: z
        .string()
        .transform(Number)
        .pipe(z.number().min(0, "Outside board").max(640, "Outside board")),
    y: z
        .string()
        .transform(Number)
        .pipe(z.number().min(0, "Outside board").max(480, "Outside board"))
});

// Reply validation schema
export const replySchema = z.object({
    postId: z.string().min(1, "Post ID is required"),
    content: z
        .string()
        .trim()
        .min(1, "Content is required")
        .max(2048, "Content must be less than 2048 characters"),
    file: fileSchema.nullable()
});
