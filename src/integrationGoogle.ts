import { Firebot, ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
const EventEmitter = require("events");
import { FirebotParameterCategories, FirebotParams } from "@crowbartools/firebot-custom-scripts-types/types/modules/firebot-parameters";
import { AvailableItemsVariable } from "./types";
import { GoogleApis, google } from "googleapis";
// const io = require("socket.io-client");
const fs = require('fs');
const axios = require("axios").default;
import { initLogger, logger } from "./logger";
import { parameters } from "./main";
let integrationManager: ScriptModules["integrationManager"];

let gClient: any;
let items: string[] = [];
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
// const slEventHandler = require("./events/streamlabs-event-handler");
// const slEffectsLoader = require("./effects/streamlabs-effect-loader");
interface client {
    id: string;
    secret: string;
};

export let secret: client = {
    id: "",
    secret: "",
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
                /* 
                    https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly&
                    access_type=offline&redirect_uri=http%3A%2F%2Flocalhost%2Foauth2callback&response_type=code&client_id=CLIENT_ID
                */
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

export async function getYoutubeListItems(accessToken: any, playlistId: any): Promise<string[]> {
    let pageToken: string;
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
            response.data.items.forEach((item: { status: { privacyStatus: string; }; contentDetails: { videoId: string; }; }) => {
                if (item.status.privacyStatus = "public") {
                    items.push(item.contentDetails.videoId)
                }
            });
            pageToken = response.data.nextPageToken;

        } catch (error) {
            logger.error("Failed to get list for youtube", error.message);
            return null;
        }
    }
    while (pageToken);
    
    logger.error("youtubeREPLY: ", items)
    return items
};

export async function addYoutubeListItem(accessToken: any, playlistId: any, itemId: any): Promise<{
    itemId: string,
    playlistId: string
}>  {
    try {
        const response = await axios.post('https://www.googleapis.com/youtube/v3/playlistItems?', {
            "snippet": {
                "playlistId": playlistId,
                "resourceId": {
                    "kind":"youtube#video",
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

    } catch (error) {
        logger.error("Failed to get list for youtube", error.message);
    }
    return null;
};
/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist(auth: any): Promise<any> {
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
        }, {
            params: {
                'part': 'snippet'
            },
            headers: {
                'Authorization': 'Bearer ' + auth.refresh_token,
                'Content-Type': 'application/json'
            }
        })
        logger.error("youtubeREPLY: ", response.data)
        return response.data;
    } catch (error) {
        logger.error("Failed to get list for youtube", error.message);
        return null
    }
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getChannel() {
    var service = google.youtube('v3');
    console.log(google.auth)
    service.playlistItems.list({
        auth: google.auth,
        // @ts-ignore
        part: 'contentDetails,id,snippet,status',
        playlistId: 'PLyg0JJEOdlaj-T-B_nRJBWa6XkVh3Lysg'
    }, function (err: string, response: { data: { items: any; }; }) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0) {
            console.log('No channel found.' + response.data);
        } else {
            console.log(`This channel\'s ID is ${channels[0].id}. Its title is '${channels[0].snippet.title}', and \n`, response.data)
        }
    });
}

async function loop(token:any): Promise<any>{
    setTimeout(() => {
        loop(token)
        console.log("Delayed for 1 second.");
      ///  return await loadSavedCredentialsIfExist(integrationData.auth);
    }, token.expires_in); 
}

class YoutubeIntegration extends EventEmitter {
    auth: any;
    connected: boolean;
    definition: IntegrationDefinition
    constructor() {
        super();
        this.connected = false;
        this.definition = genDef()
        // this._socket = null;
    }

    init() {
        // slEventHandler.registerEvents();
        // slEffectsLoader.registerEffects();
    }

    async connect(integrationData: any) {
        //const { auth } = integrationData;
        
        if ( integrationData.auth == null ) {
            this.emit("disconnected", this.definition.id);
            return;
        } 
    
        let auth = loop(integrationData.auth)
        if (auth) {
            this.emit("settings-update", this.definition.id, { auth });
        }

        getChannel();
        // if (settings == null) {
        //     this.emit("disconnected", this.definition.id);
        //     return;
        // }

        // this._socket = io(
        //     `https://sockets.streamlabs.com?token=${settings.socketToken}`,
        //     {
        //         transports: ["websocket"]
        //     }
        // );

        // this._socket.on("event", (eventData: any) => {
        //      slEventHandler.processYoutubeEvent(eventData);
        // });
        this.emit("connected", this.definition.id);
        this.connected = true;
    }

    disconnect() {
        /*
        if (this._socket) {
            this._socket.close();
        } 
        */
        gClient = null; 
        this.connected = false;

        this.emit("disconnected", this.definition.id);
    }

    async link(linkData: { auth: any; }) {
        const { auth } = linkData;
        this.auth = auth;
        
        logger.error('InSide Link', this.definition.id);
        logger.error('data: ', auth);

        // let dateNow = Math.floor(Date.now() / 1000 + auth.expires_in);
        // if (dateNow) {
        //     this.emit("settings-update", this.definition.id, { dateNow });
        // }
        //  var oauth2Client = new OAuth2(parameters.clientId, parameters.clientSecret, "http://localhost:7472");
        gClient = await loadSavedCredentialsIfExist(auth);
        const itemsList = await getYoutubeListItems(auth['access_token'], "PLyg0JJEOdlaibF4jV6JzMKQ0FcYXee0oj");
        logger.error('data: ', itemsList);
    }

    unlink() {
        /*
        if (this._socket) {
            this._socket.close();
        }
        */
    }
    
    // Doing this here because of a bug in Firebot where it isn't refreshing automatically
    async refreshToken(): Promise<string> {
        try {
            const auth = integrationManager.getIntegrationDefinitionById("tiltify")?.auth;
            // @ts-ignore
            const authProvider = integrationDefinition.authProviderDetails;

            if (auth != null) {
                const url = `${authProvider.auth.tokenHost}${authProvider.auth.tokenPath}?client_id=${authProvider.client.id}&client_secret=${authProvider.client.secret}&grant_type=refresh_token&refresh_token=${auth.refresh_token}&scope=${authProvider.scopes}`;
                const response = await axios.post(url);

                if (response.status === 200) {
                    const int = integrationManager.getIntegrationById("tiltify");
                    // @ts-ignore
                    integrationManager.saveIntegrationAuth(int, response.data);

                    return response.data.access_token;
                }
            }
        } catch (error) {
            logger.error("Unable to refresh Tiltify token");
            logger.debug(error);
        }

        return;
    }
}
export const integration = new YoutubeIntegration();
