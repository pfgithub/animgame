import {palettes, type BroadcastMsg, type RecieveMessage} from "../../shared/shared.ts";
import { drawpage } from "./drawpage.tsx";
import { wsEventHandler } from "./util.tsx";

// should we have each person make one frame or two frames?
// two frames maybe

// if we want to skip a server, we can try webrtc?
// one client is the server & if they lose connection then
// they have to refresh and everyone else has to refresh
// but no data loss!important

const rootel = document.getElementById("root")!;

function replacepage(el: HTMLElement) {
    rootel.innerHTML = "";
    rootel.appendChild(el);
}
function entergamecode() {
    // TODO autofill these with the previous values
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <form id="myform" action="javascript:;">
                <label>
                    <div>Name</div>
                    <div style="display:flex;flex-wrap:wrap;flex-direction:row">
                        <div style="flex:1"><input required type="text" name="name" style="font-size:3rem;width:100%" /></div>
                    </div>
                </label>
                <label>
                    <div>Game code</div>
                    <div style="display:flex;flex-wrap:wrap;flex-direction:row">
                        <div style="flex:1"><input required autocomplete="off" type="text" name="code" style="font-size:3rem;width:100%;text-transform:uppercase" /></div>
                        <button style="padding:0 1rem">Join</button>
                    </div>
                </label>
            </form>
        </div>
    </div></div>`;
    const formel: HTMLFormElement = rootel.querySelector("#myform")!;
    formel.addEventListener("submit", e => {
        e.preventDefault();
        const data = new FormData(e.target as any);
        const name = data.get("name") as string;
        const code = (data.get("code") as string).toUpperCase();
        console.log(name, code);

        waitpage();
        connect(name, code);
    });
}
function connect(name: string, code: string): void {
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
            handleMessage(desrlz);
        }
    });
    sendMessage = msg => {
        wss.send(JSON.stringify(msg));
    };
}
function handleMessage(msg: BroadcastMsg) {
    document.querySelectorAll(".data-wsevent_handler").forEach(node => {
        (node as any).__wsevent_handler?.(msg);
    });

    if(msg.kind === "choose_palettes_and_ready") {
        choosepalettesandready();
    }else if(msg.kind === "show_prompt_sel") {
        showpromptsel();
    }else if(msg.kind === "show_prompt_accepted") {
        showpromptaccepted(msg.prompt);
    }else if(msg.kind === "show_draw_frame") {
        replacepage(drawpage(msg.context));
    }
    console.log(msg);
}
let sendMessage = (msg: RecieveMessage) => {
    alert("Not connected");
};
function waitpage() {
    rootel.innerHTML = `wait...`;
}
function choosepalettesandready() {
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>ChoosePalettesAndReady</div>
            <div id="palettes" style="display:flex;flex-direction:column;gap:0.25rem"></div>
            <button id="readybtn" style="border-radius:1rem;border:2px solid black;padding:0.5rem 1rem;font-size:1rem"></button>
        </div>
    </div></div>`;
    const rootitm: HTMLDivElement = rootel.querySelector("#rootitm")!;
    const palettesel: HTMLDivElement = rootel.querySelector("#palettes")!;
    const readybtn: HTMLButtonElement = rootel.querySelector("#readybtn")!;
    for(const palette of palettes) {
        const palettebtn = document.createElement("button");
        palettebtn.setAttribute("style", "border-radius:1rem;display:flex;width:100%;border:none;background-color:transparent;padding:0");
        palettebtn.innerHTML = `
            <div style="flex:1;display:flex;border:2px solid gray">
                <div class="_here" style="border:2px solid white;flex:1;display:flex"></div>
            </div>
        `;
        const pbin: HTMLDivElement = palettebtn.querySelector("._here")!;
        for(let i = 0; i < palette.length; i++) {
            const colorprev = palette[i - 1] ?? "transparent";
            const color = palette[i];
            {
                const palettesquare = document.createElement("div");
                palettesquare.setAttribute("style", "height:3rem;flex:1;background-color:"+colorprev);
                palettesquare.innerHTML = `<div style="width:100%;height:100%;background-color:${color};border-radius:1rem 0 0 1rem"></div>`;
                pbin.appendChild(palettesquare);
            }
            {
                const palettesquare = document.createElement("div");
                palettesquare.setAttribute("style", "height:3rem;flex:1;background-color:"+color+";"+(i === palette.length - 1 ? "border-radius:0 1rem 1rem 0" : ""));
                pbin.appendChild(palettesquare);
            }
        }
        palettesel.appendChild(palettebtn);
    }
    let ready_state = false;
    let ready_sending = false;
    const updateReadyBtn = () => {
        if(ready_state) {
            readybtn.textContent = "✓ Ready";
            readybtn.style.backgroundColor = "green";
            readybtn.style.color = "white";
        }else{
            readybtn.textContent = "Ready";
            readybtn.style.backgroundColor = "white";
            readybtn.style.color = "black";
        }
        readybtn.disabled = ready_sending;
    }
    updateReadyBtn();
    rootitm.appendChild(wsEventHandler(ev => {
        console.log("got wsev", ev);
        if(ev.kind === "ready_ack") {
            ready_state = ev.value;
            ready_sending = false;
            updateReadyBtn();
        }
    }));
    readybtn.addEventListener("click", () => {
        sendMessage({kind: "mark_ready", value: !ready_state});
        ready_sending = true;
        updateReadyBtn();
    });
}
function showpromptsel() {
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>ShowPromptSel</div>
            <form action="javascript:;">
                <div>Provide a prompt for other people to animate</div>
                <label>
                    <div style="display:flex;flex-wrap:wrap;flex-direction:row">
                        <div style="flex:1"><input required type="text" name="prompt" style="font-size:2rem;width:100%" /></div>
                    </div>
                </label>
                <button>Submit</button>
            </form>
        </div>
    </div></div>`;
    const formel = rootel.querySelector("form")!;
    formel.addEventListener("submit", e => {
        e.preventDefault();
        const data = new FormData(e.target as any);

        sendMessage({kind: "submit_prompt", prompt: data.get("prompt")! as string});
        waitpage();
    });
}
function showpromptaccepted(prompt: string) {
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>ShowPromptAccepted</div>
        </div>
    </div></div>`;
}

entergamecode();
if(location.hash === "#demo/drawpage") {
    replacepage(drawpage({
        prompt: "The quick brown fox jumps over a lazy dog",
        frames: [],
        ask_for_frames: 2,
        start_frame_index: 0,
    }));
}