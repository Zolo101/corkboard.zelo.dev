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
