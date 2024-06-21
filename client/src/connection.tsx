import type { RecieveMessage } from "../../shared/shared";
import { getLocalStorage, localstorage_current_game, type LocalstorageCurrentGame } from "./util";


export function connect(name: string, code: string, player_uuid?: string): void {
    disconnect();
    let expecting_disconnect = false;
    const wsurl = new URL(location.href);
    wsurl.pathname = "/websocket";
    wsurl.search = "?name="+encodeURIComponent(name)+"&code="+encodeURIComponent(code)+(player_uuid != null ? "&player_uuid="+encodeURIComponent(player_uuid) : "");
    const wss = new WebSocket(wsurl);
    wss.addEventListener("open", e => {
        console.log("open", e);
        // connected; waiting for commands
    });
    wss.addEventListener("error", e => {
        console.log("error", e);
        alert("websocket error. refresh.");
    });
    wss.addEventListener("close", e => {
        if(expecting_disconnect) return;
        console.log("close", e);
        // can't autoreconnect until we impl drawframe saving
        alert("websocket closed. refresh.");
        sendMessage = (msg: RecieveMessage) => {
            alert("Not connected, reload.");
        };
        disconnect = () => {};
    });
    wss.addEventListener("message", e => {
        const msg_data = e.data;
        if(typeof msg_data === "string") {
            const desrlz = JSON.parse(msg_data);
            console.log("<- ", desrlz);
            handleMessage(desrlz);
        }
    });
    sendMessage = msg => {
        console.log(" ->", msg);
        wss.send(JSON.stringify(msg));
    };
    disconnect = () => {
        expecting_disconnect = true;
        wss.close();
    };
}
function handleMessage(msg: RecieveMessage) {
    document.querySelectorAll(".data-wsevent_handler").forEach(node => {
        (node as any).__wsevent_handler?.(msg);
    });
}
export let sendMessage = (msg: RecieveMessage) => {
    alert("Not connected");
};
export let disconnect = () => {};