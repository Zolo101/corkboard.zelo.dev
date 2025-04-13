export const createdDateFormatter = (createdString: string) => {
    // Today at 12:04 PM
    // Yesterday at 12:04 PM
    // 12/31/2021 at 12:04 PM

    const now = new Date();
    const created = new Date(createdString);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = created.toDateString() === now.toDateString();
    const isYesterday = created.toDateString() === yesterday.toDateString();

    const time = created.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });

    if (isToday) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;

    return `${created.toLocaleDateString()} at ${time}`;
};

export const scaleImage = (width: number, height: number) => {
    const imageArea = width * height;
    const maxArea = 10000; // 100 x 100
    const scaleFactor = Math.sqrt(maxArea / imageArea);
    let newWidth = Math.round(width * scaleFactor);
    let newHeight = Math.round(height * scaleFactor);

    newWidth = Math.min(newWidth, 100);
    newHeight = Math.min(newHeight, 100);
    return { width: newWidth, height: newHeight };
};

// TODO: I don't like this (because of the regex :P)
export const hashToColor = (ipHash: string | undefined) => {
    if (!ipHash) return "#ffffff";

    const colorHex = ipHash.substring(0, 6);

    // Ensure it's a valid hex color by checking each pair of digits
    const validHex = colorHex
        .split("")
        .map((char) => {
            // If the character is not a valid hex digit, replace it with '0'
            return /[0-9A-Fa-f]/.test(char) ? char : "f";
        })
        .join("");

    return `#${validHex}`;
};
