import type { RecieveMessage } from "../../shared/shared";


export function connect(name: string, code: string): void {
    disconnect();
    const wsurl = new URL(location.href);
    wsurl.pathname = "/websocket";
    wsurl.search = "?name="+encodeURIComponent(name)+"&code="+encodeURIComponent(code);
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
        console.log("close", e);
        alert("websocket closed. refresh.");
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
    disconnect = () => wss.close();
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