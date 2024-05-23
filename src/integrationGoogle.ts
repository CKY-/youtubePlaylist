import {
    ScriptModules
} from "@crowbartools/firebot-custom-scripts-types";
const EventEmitter = require("events");
import { FirebotParameterCategories, FirebotParams } from "@crowbartools/firebot-custom-scripts-types/types/modules/firebot-parameters";
import { AvailableItemsVariable, YoutubePlaylistItem } from "./types";
const axios = require("axios").default;
import { logger } from "./logger";
import { modules, parameters } from "./main";
import { addItem, saveList } from "./db";
let quota:number=0;
let items: YoutubePlaylistItem[] = [];
export type IntegrationDefinition<
    Params extends FirebotParams = FirebotParams
> = {
    id: string;
    name: string;
    description: string;
    connectionToggle?: boolean;
    configurable?: boolean;
    settingCategories: FirebotParameterCategories<Params>;
} & (
        | {
            linkType: "id";
            idDetails: {
                steps: string;
            };
        }
        | {
            linkType: "auth";
            authProviderDetails: {
                id: string;
                name: string;
                redirectUriHost?: string;
                client: {
                    id: string;
                    secret: string;
                };
                auth: {
                    type?: string
                    tokenHost: string;
                    tokenPath: string;
                    authorizePath: string;
                    authorizeHost?: string;
                };
                autoRefreshToken?: boolean;
                scopes: string;
            };
        }
        | { linkType: "other" | "none" }
    );
interface client {
    id: string;
    secret: string;
};

export let secret: client = {
    id: "",
    secret: "",
}

let scriptModules: ScriptModules;
export function setScriptModules(modules: ScriptModules) {
    scriptModules = modules
}

export function genDef(): IntegrationDefinition {
    return {
        id: "youtube",
        name: "youtube",
        description: "load and update playlist information",
        connectionToggle: true,
        linkType: "auth",
        settingCategories: {
        },
        authProviderDetails: {
            id: "youtube",
            name: "youtube",
            redirectUriHost: "localhost",
            client: secret,
            auth: {
                type: 'code',
                authorizeHost: 'https://accounts.google.com',
                tokenHost: "https://oauth2.googleapis.com",
                tokenPath: '/token',
                authorizePath: '/o/oauth2/v2/auth'
            },
            autoRefreshToken: true,
            scopes: 'https://www.googleapis.com/auth/youtube'
        }
    }
}

export function genIntegration() {
    integration = new YoutubeIntegration();
}

export async function getYoutubeListItems(accessToken: any, playlistId: any): Promise<YoutubePlaylistItem[]> {
    items = [];
    let pageToken: string;

    if (await youtubeIsConnected(accessToken) !== true) {
        accessToken = await integration.refreshToken();
    }

    do {
        try {
            const response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems?",
                {
                    params: {
                        "access_token": accessToken,
                        "part": 'contentDetails, status',
                        "playlistId": playlistId,
                        "maxResults": 50,
                        "pageToken": pageToken
                    }
                });
            logger.error(response.data);
            response.data.items.forEach((item: { id: string, status: { privacyStatus: string; }; contentDetails: { videoId: string; }; }) => {
                if (item.status.privacyStatus = "public") {
                    items.push({
                        videoId: item.contentDetails.videoId,
                        playlistItemId: item.id
                    })
                } else {
                    deleteYoutubeListItem(accessToken, item.id)
                }
            });
            pageToken = response.data.nextPageToken;
            quota++;
            
        } catch (error) {
            logger.error("Failed to get list for youtube", error.message);
            logger.error("Failed to get list from youtube", error.code);
            return null;
        }
    }
    while (pageToken);
    logger.error("youtubeREPLY: ", items)
    saveList(playlistId, items)
    chatFeedAlert(`Google quota used ${quota}`)
    return items
};

export async function addYoutubeListItem(accessToken: any, playlistId: any, itemId: any): Promise<{
    itemId: string,
    playlistId: string
}> {

    if (await youtubeIsConnected(accessToken) !== true) {
        accessToken = await integration.refreshToken();
    }

    try {
        const response = await axios.post('https://www.googleapis.com/youtube/v3/playlistItems?', {
            "snippet": {
                "playlistId": playlistId,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": itemId
                }
            }
        }, {
            params: {
                'part': 'snippet'
            },
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
        })
        logger.error("youtubeREPLY: ", response.data)
        quota = quota + 50;
        chatFeedAlert(`Google quota used ${quota}`)
        addItem(playlistId, {
            videoId: response.data.snippet.resourceId.videoId,
            playlistItemId: response.data.id
        })
    } catch (error) {
        logger.error("Failed to get list from youtube", error.message);
        logger.error("Failed to get list from youtube", error.code);
    }
    return null;
};

export async function deleteYoutubeListItem(accessToken: any, playlistItemId: string): Promise<{
    itemId: string,
    playlistId: string
}> {

    if (await youtubeIsConnected(accessToken) !== true) {
        accessToken = await integration.refreshToken();
    }

    try {
        const response = await axios.delete('https://www.googleapis.com/youtube/v3/playlistItems?', {
            params: {
                'id': playlistItemId
            },
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
        })
        logger.error("youtubeREPLY: Item Deleted")
        quota = quota+50;
        chatFeedAlert(`Google quota used ${quota}`)
    } catch (error) {
        logger.error("Failed to get list from youtube", error.message);
        logger.error("Failed to get list from youtube", error.code);
    }
    return null;
};
export async function youtubeGetPlayLists(accessToken: any): Promise<{
    itemId: string,
    playlistId: string
}> {
    try {
        if (await youtubeIsConnected(accessToken) !== true) {
            accessToken = await integration.refreshToken();
        }
        const headers = { 'Authorization': 'Bearer ' + accessToken }; // auth header with bearer token
        let response = await (await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,id&mine=true', { headers })).json();

        logger.error("youtubeREPLY: ", response)
        quota++;
        chatFeedAlert(`Google quota used ${quota}`)
        return response
    } catch (error) {
        logger.error("Failed to get playlists from youtube", error.message);
        logger.error("Failed to get playlists from youtube", error.code);
        return null
    }
};

export async function youtubeIsConnected(accessToken: any): Promise<boolean> {
    const headers = { 'Authorization': 'Bearer ' + accessToken }; // auth header with bearer token
    let res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,id&mine=true', { headers });
    quota++;
    chatFeedAlert(`Google quota used ${quota}`)
    return res.ok;
};

export async function chatFeedAlert(message: string) {
    if (parameters.alertMessage) {
        const data = await modules.effectRunner.processEffects({
            trigger: {
                type: "custom_script",
                metadata: {
                    username: "script"
                }
            },
            // effects: [
            //     { "id": "e6bac140-1894-11ef-a992-091f0a9405f6", "type": "firebot:chat-feed-alert", "active": true, message }
            // ]
            effects: {
                id: Date.now(),
                list: [
                    { "id": "e6bac140-1894-11ef-a992-091f0a9405f6", "type": "firebot:chat-feed-alert", "active": true, message }
                ]
            }
        });

        //data.outputs
        //data.success
        //data.stopEffectExecution

        //{ "id": "e6bac140-1894-11ef-a992-091f0a9405f6", "type": "firebot:chat-feed-alert", "active": true, "message": "sadasda" }
    }
}

class YoutubeIntegration extends EventEmitter {
    auth: any;
    connected: boolean;
    definition: IntegrationDefinition

    constructor() {
        super();
        this.connected = false;
        this.definition = genDef()
        this.integrationManager = scriptModules.integrationManager
    }

    init() { }

    async connect(integrationData: any) {
        const { auth } = integrationData;
        this.auth = auth;
        let token = auth?.access_token

        if (await youtubeIsConnected(token) !== true) {
            token = await this.refreshToken();
        }

        if (token == null || token === "") {
            this.emit("disconnected", this.definition.id);
            return;
        }

        this.emit("connected", this.definition.id);
        this.connected = true;
        const itemsList = await getYoutubeListItems(token, parameters.playListId);
        logger.error('data: ', itemsList);
    }

    disconnect() {
        this.connected = false;
        this.emit("disconnected", this.definition.id);
    }

    async link(linkData: { auth: any; }) {
        const { auth } = linkData;
        this.auth = auth;

        logger.error('InSide Link', this.definition.id);
        logger.error('data: ', auth);

        let token = auth?.access_token
        if (await youtubeIsConnected(token) !== true) {
            token = await this.refreshToken();
        }
    }

    unlink() { }

    // Doing this here because of a bug in Firebot where it isn't refreshing automatically
    async refreshToken(): Promise<string> {
        try {
            const auth = this.auth;
            // @ts-ignore
            const authProvider = this.definition.authProviderDetails;

            if (auth != null) {
                const url = `${authProvider.auth.tokenHost}${authProvider.auth.tokenPath}?client_id=${authProvider.client.id}&client_secret=${authProvider.client.secret}&grant_type=refresh_token&refresh_token=${auth.refresh_token}`;
                const response = await axios.post(url);

                if (response.status === 200) {
                    const int = this.integrationManager.getIntegrationById("youtube");
                    logger.debug(int.integration.auth.refresh_token)
                    // @ts-ignore
                    response.data["refresh_token"] = int.integration.auth.refresh_token
                    this.integrationManager.saveIntegrationAuth(int, response.data);
                    return response.data.access_token;
                }
            }
        } catch (error) {
            logger.error("Unable to refresh youTube token");
            logger.error("Unable to refresh youTube token", error.message);
            logger.error("Unable to refresh youTube token", error.code);
        }
        return;
    }
}

export let integration: YoutubeIntegration;