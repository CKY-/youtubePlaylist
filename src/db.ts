
import { modules } from "./main";
import { YoutubePlaylistItem } from "./types";

export function getList(playListId: string): YoutubePlaylistItem[] {
    let path = modules.path.join(SCRIPTS_DIR, 'google_playlist', `${playListId}.json`);
    return JSON.parse(modules.fs.readFileSync(path).toString());
}

export function saveList(playListId: string, list: object) {
    let path = modules.path.join(SCRIPTS_DIR, 'google_playlist', `${playListId}.json`)
    const dir = modules.path.join(SCRIPTS_DIR, 'google_playlist');
    if (!modules.fs.existsSync(dir)) {
        modules.fs.mkdirSync(dir, { recursive: true })
    }
    modules.fs.writeFileSync(path, JSON.stringify(list, null, 4), { encoding: 'utf8', flag: 'w' })
}

export function addItem(playListId: string, item: YoutubePlaylistItem) {
    let list = getList(playListId)
    list.push(item);
    saveList(playListId, list)
}

export function deleteItem(playListId: string, item: string) {
    let list = getList(playListId)
    const idx = list.findIndex(listItem => listItem.videoId === item);
    if (idx >= 0) {
        list.splice(idx, 1);
    }
    saveList(playListId, list)
}