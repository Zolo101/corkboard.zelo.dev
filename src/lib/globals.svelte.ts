import { browser } from "$app/environment";

type Settings = {
    followOnReply: boolean;
    normalFont: boolean;
    screenReader: boolean;
};

export const settings: Settings = $state({
    followOnReply: false,
    normalFont: false,
    screenReader: false
});

if (browser) {
    const storedSettings: Settings = JSON.parse(
        localStorage?.getItem("corkboard_settings") || "{}"
    );
    for (const key in storedSettings) {
        if (key in settings) {
            settings[key as keyof Settings] = storedSettings[key as keyof Settings];
        }
    }
}
