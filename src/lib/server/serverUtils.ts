import { createHash } from "crypto";
import { Resource } from "sst";

export function hashIP(ip: string) {
    const hash = createHash("sha256");
    const salt = Resource.IPHashSalt.value;
    hash.update(ip + salt);

    return hash.digest("hex");
}
