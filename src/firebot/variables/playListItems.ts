import { ReplaceVariable } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { getYoutubeListItems } from "../../integrationGoogle";
import { modules } from "../../main";
import { getList } from "../../db";

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
       // let integration = modules.integrationManager.getIntegrationDefinitionById("youtube");
        const playListItems = getList(playlistId)//await getYoutubeListItems(integration.auth["access_token"], playlistId);

        return JSON.stringify(playListItems.map(item => item.videoId)) ?? "Unknown";
    },
};
