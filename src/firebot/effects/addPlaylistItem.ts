"use strict";
import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { addYoutubeListItem } from "../../integrationGoogle";
import { modules } from "../../main";
import { getList } from "../../db";
/**
* The Trigger Hotkey Effect
*/
export const addYoutubeListItemEffect: Firebot.EffectType<{
    itemId: string,
    playlistId: string,
    allow_duplicates: boolean
}> = {
    /**
    * The definition of the Effect
    */
    definition: {
        id: "youtube:add-item",
        name: "youtube add item",
        description: "adds an item to the supplied playlist",
        icon: "fad fa-keyboard",
        categories: ["common"],
    },

    /**
    * The HTML template for the Options view (ie options when effect is added to something such as a button.
    * You can alternatively supply a url to a html file via optionTemplateUrl
    */
    optionsTemplate: `
        <eos-container header="Play List" pad-top="true">
            <p class="muted">This is the playlist you want to add the song to</p>
            <input ng-model="effect.playlistId" type="text" class="form-control" id="chat-text-setting" placeholder="Enter Playlist" replace-variables/>
        </eos-container>

        <eos-container header="Song Id" pad-top="true">
            <p class="muted">this is the song you want to add</p>
            <input ng-model="effect.itemId" type="text" class="form-control" id="chat-text-setting" placeholder="Enter Song ID" menu-position="under" replace-variables/>
        </eos-container>
        <eos-container header="Allow Duplicates" pad-top="true">
            <label class="control-fb control--checkbox"> Allow Duplicates <tooltip text="'allow duplicate tracks to be added'"></tooltip>
                <input type="checkbox" ng-model="effect.allow_duplicates">
                <div class="control__indicator"></div>
            </label>
        </eos-container>
    `,
    /**
    * The controller for the front end Options
    * Port over from effectHelperService.js
    */
    optionsController: ($scope: any, backendCommunicator: any, $q: any) => {

    },

    /**
    * When the effect is triggered by something
    * Used to validate fields in the option template.
    */
    optionsValidator: effect => {
        const errors = [];
        if (effect.playlistId == null || effect.playlistId === "") {
            errors.push("Please add a playlist.");
        }
        if (effect.itemId == null || effect.itemId === "") {
            errors.push("Please add a song.");
        }
        return errors;
    },

    /**
    * When the effect is triggered by something
    */
    onTriggerEvent: async event => {
        let itemid: string = "";
        if (URL.canParse(event.effect.itemId)) {
            const url = new URL(event.effect.itemId)
            itemid = url.searchParams.get("v");
        } else {
            itemid = event.effect.itemId;
        }
        let integration = modules.integrationManager.getIntegrationDefinitionById("youtube");
        if (!event.effect.allow_duplicates) {
            let list = getList(event.effect.playlistId);
            if (list.findIndex(item => item.videoId === itemid) >= 0) {
                return true;
            }
        }
        await addYoutubeListItem(integration.auth["access_token"], event.effect.playlistId, event.effect.itemId);
        return true;
    }
};
