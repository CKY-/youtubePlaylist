import { Firebot, ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { genDef, genIntegration, integration, secret, setScriptModules } from "./integrationGoogle";
import { initLogger, logger } from "./logger";
import { setupFrontendListeners } from "./firebot/communicator";
import { getYoutubeListItemsVariable } from "./firebot/variables/playListItems";
import { addYoutubeListItemEffect } from "./firebot/effects/addPlaylistItem";

interface Params {
  clientId: string;
  clientSecret: string;
}

const script: Firebot.CustomScript<Params> = {
  getScriptManifest: () => {
    return {
      name: "youtube Playlist",
      description: "youtubePlaylist you must specify localhost as the redirect URI",
      author: "CKY",
      version: "1.0",
      firebotVersion: "5",
    };
  },
  getDefaultParameters: () => {
    return {
      clientId: {
        type: "string",
        default: "",
        description: "clientId",
        secondaryDescription: "Enter a client id here",
      },
      clientSecret: {
        type: "string",
        default: "",
        description: "clientSecret",
        secondaryDescription: "Enter a client secret here",
      },
    };
  },
  parametersUpdated(params: Params) {
      parameters = params;
  },
  run: async (runRequest) => { 
    initLogger(runRequest.modules.logger);
    logger.info(runRequest.parameters.clientId);
    logger.info(runRequest.parameters.clientSecret);
    parameters = runRequest.parameters;
    modules = runRequest.modules;
    const {
      effectManager,
      frontendCommunicator,
      replaceVariableManager,
      integrationManager
    } = modules;
    secret.id = runRequest.parameters.clientId;
    secret.secret = runRequest.parameters.clientSecret;
    setScriptModules(modules);
    let definition = genDef();
    genIntegration();

    setupFrontendListeners(frontendCommunicator);
    integrationManager.registerIntegration({ definition, integration });
    
    replaceVariableManager.registerReplaceVariable(getYoutubeListItemsVariable);
    effectManager.registerEffect(addYoutubeListItemEffect);
  },
  stop: () => {
    integration.disconnect();
  }
};
export let parameters: Params = null
export let modules: ScriptModules = null;
export default script;
