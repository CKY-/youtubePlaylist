"use strict";
import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
const EventEmitter = require("events");

// const io = require("socket.io-client");
const fs = require('fs');
// const axios = require("axios").default;
import { initLogger, logger } from "./logger";
import { FirebotParameterCategories, FirebotParams } from "@crowbartools/firebot-custom-scripts-types/types/modules/firebot-parameters";

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

//export let definition: IntegrationDefinition = {};

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
                tokenHost: "https://accounts.spotify.com",
                tokenPath: '/api/token',
                authorizePath: '/authorize?'
            },
            autoRefreshToken: false,
            scopes: `user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read`
        }
    }
}

class YoutubeIntegration extends EventEmitter {
    
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
    connect(integrationData: { settings: any; }) {
        const { settings } = integrationData;

        if (settings == null) {
            this.emit("disconnected", this.definition.id);
            return;
        }

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

        this.connected = false;

        this.emit("disconnected", this.definition.id);
    }
    async link(linkData: { auth: any; }) {
        const { auth } = linkData;
        logger.error('InSide Link', this.definition.id);
        logger.error('data: ', auth);
        logger.error('data: ', auth['access_token']);
        debugger;
        // const socketToken = await getYoutubeSocketToken(auth['access_token']);
        // if (socketToken) {
        //     this.emit("settings-update", this.definition.id, { socketToken });
        // }
    }
    unlink() {
        /*
        if (this._socket) {
            this._socket.close();
        }
        */
    }
}
export const integration = new YoutubeIntegration();
