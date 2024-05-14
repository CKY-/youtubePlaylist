import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { getYoutubeListItems } from "../integrationGoogle";

export function setupFrontendListeners(
    frontendCommunicator: ScriptModules["frontendCommunicator"]
) {
    frontendCommunicator.onAsync<never, string[]>(
        "youtube-get-available-items",
        getYoutubeListItems
    );
}