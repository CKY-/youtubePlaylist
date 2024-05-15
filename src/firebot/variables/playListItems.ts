import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { getYoutubeListItems } from "../../integrationGoogle";
import { modules } from "../../main";

export const getYoutubeListItemsVariable: ReplaceVariable = {
    definition: {
        handle: "YoutubePlayListItems",
        description: "An array of playlist items",
        possibleDataOutput: ["text"],
        examples: [
            {
                usage: 'YoutubePlayListItems[playlistId]',
                description: "An array of playlist items"
            }
        ]

    },
    evaluator: async (_, playlistId = "") => {
        let integration = modules.integrationManager.getIntegrationDefinitionById("youtube");
        const playListItems = await getYoutubeListItems(integration.auth["access_token"], playlistId);
        return JSON.stringify(playListItems) ?? "Unknown";
    },
};
