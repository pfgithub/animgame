import {palettes, type BroadcastMsg, type Frame, type RecieveMessage} from "../../shared/shared.ts";
import { connect, sendMessage } from "./connection.tsx";
import { drawpage } from "./drawpage.tsx";
import { replacepage, rootel, wsEventHandler } from "./util.tsx";

// should we have each person make one frame or two frames?
// two frames maybe

// if we want to skip a server, we can try webrtc?
// one client is the server & if they lose connection then
// they have to refresh and everyone else has to refresh
// but no data loss!important

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
function handleMessage(msg: BroadcastMsg) {
    if(msg.kind === "choose_palettes_and_ready") {
        choosepalettesandready();
    }else if(msg.kind === "show_prompt_sel") {
        showpromptsel();
    }else if(msg.kind === "show_prompt_accepted") {
        showpromptaccepted(msg.prompt);
    }else if(msg.kind === "show_draw_frame") {
        replacepage(drawpage(msg.context));
    }else if(msg.kind === "show_frame_accepted") {
        showdrawsent();
    }else if(msg.kind === "review_reveal") {
        showreviewreveal(msg.animation, msg.ready);
    }
    console.log(msg);
}
document.body.appendChild(wsEventHandler(handleMessage));
function waitpage() {
    rootel.innerHTML = `wait...`;
}
function showguessprompt(image: string, prompts: string[]) {
    // draw:
    // - the image @ the top
    // - Guess the prompt:
    // - list of prompts in a style like the palette buttons
}
function showfullanimation(frames: string[]) {
    // show:
    // - the animation, looping
    // - "Next" button that is like the "Ready" button, everyone
    //   has to press it
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
function showdrawsent() {
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>ShowDrawAccepted</div>
        </div>
    </div></div>`;
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
            <div>ShowPromptSent</div>
        </div>
    </div></div>`;
}
function showreviewreveal(animation: Frame[], ready: boolean) {
    // it would be really nice to break out drawpage so the svg
    // component is seperate so we can use it here
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>ShowReview</div>
        </div>
    </div></div>`;
}

entergamecode();
const demo_frames: Frame[] = [
    {
        value: "{\"undo_strokes\":[{\"points\":[[322,283],[328,264],[341,243],[363,219],[396,195],[437,179],[480,172],[524,170],[571,181],[611,203],[645,231],[671,265],[691,306],[705,352],[713,403],[717,458],[717,513],[709,567],[697,609],[677,644],[654,666],[627,682],[601,692],[572,699],[536,703],[500,705],[464,699],[429,685],[401,671],[378,655],[358,640],[343,623],[329,601],[320,579],[312,556],[307,535],[302,513],[300,490],[299,467],[299,445],[298,425],[298,407],[299,388],[303,370],[311,352],[319,335],[326,322],[331,312],[336,299],[338,288],[339,279],[339,276],[341,274],[343,272],[345,271],[348,271],[351,271],[353,273],[355,275],[356,278],[356,281],[355,283],[354,286],[351,287],[349,288],[346,288],[343,287],[341,285],[339,283],[339,280],[339,277],[340,275],[342,273],[344,271],[347,271],[350,271],[353,272],[355,274],[356,277],[356,280],[356,280],[355,294],[352,304],[344,319],[338,329],[331,341],[324,357],[316,373],[312,389],[311,407],[311,425],[311,445],[311,467],[312,489],[314,510],[319,532],[324,552],[331,574],[340,594],[352,615],[366,630],[384,644],[407,660],[434,673],[466,687],[500,692],[534,690],[569,687],[596,680],[621,671],[645,657],[666,637],[685,606],[696,565],[704,513],[704,459],[701,405],[693,356],[680,312],[661,273],[637,241],[605,214],[568,193],[524,183],[482,184],[441,191],[404,205],[373,228],[353,250],[342,269],[336,287],[335,289],[334,290],[333,291],[331,292],[330,292],[328,292],[326,292],[325,291],[323,290],[322,288],[322,287],[322,285],[322,283]],\"color_index\":1}],\"redo_strokes\":[],\"background_color_index\":2}",
        artist: "una" as any,
    },
    {
        value: "{\"undo_strokes\":[{\"points\":[[454,673],[441,673],[430,673],[420,674],[408,672],[393,668],[374,660],[357,650],[337,637],[321,624],[306,613],[294,601],[282,586],[273,567],[263,537],[255,511],[248,484],[242,461],[237,438],[233,419],[232,402],[231,385],[230,370],[234,353],[242,334],[251,315],[263,294],[276,277],[287,264],[298,253],[318,240],[336,229],[358,219],[379,211],[398,207],[415,203],[434,202],[452,201],[471,201],[488,202],[506,205],[520,208],[534,212],[547,217],[558,221],[571,227],[581,233],[590,239],[598,247],[605,255],[612,265],[618,275],[624,288],[628,298],[633,310],[636,323],[638,336],[641,347],[642,358],[642,369],[642,381],[642,396],[641,411],[639,425],[637,441],[633,460],[629,479],[625,498],[621,515],[618,531],[613,549],[608,564],[603,577],[596,589],[588,600],[578,609],[570,616],[560,625],[546,634],[533,641],[520,646],[505,651],[487,655],[471,656],[456,656],[453,656],[450,654],[448,652],[446,649],[446,646],[447,643],[448,640],[451,638],[454,637],[457,637],[460,637],[463,639],[465,642],[466,645],[466,648],[465,651],[463,654],[460,655],[457,656],[454,656],[451,655],[448,653],[447,650],[446,647],[446,644],[448,641],[450,639],[453,637],[456,636],[456,636],[471,637],[484,636],[499,634],[515,629],[525,626],[536,620],[549,611],[558,604],[567,596],[575,589],[582,581],[589,571],[594,559],[599,544],[604,529],[607,512],[610,495],[614,476],[617,458],[620,439],[621,423],[623,409],[624,396],[624,381],[624,370],[623,350],[620,339],[618,328],[615,317],[611,305],[607,295],[603,285],[597,275],[585,259],[573,247],[564,242],[552,236],[541,231],[530,226],[517,222],[503,219],[487,216],[471,215],[453,215],[435,215],[418,217],[401,219],[383,223],[363,231],[343,240],[325,251],[308,263],[298,273],[287,285],[275,301],[263,321],[255,340],[248,356],[245,370],[245,385],[245,401],[246,417],[249,435],[254,458],[261,481],[268,507],[275,533],[285,561],[294,577],[304,591],[315,602],[329,613],[345,625],[364,636],[381,645],[398,651],[410,655],[420,656],[430,656],[441,656],[454,657],[456,657],[457,658],[459,659],[460,660],[461,662],[462,664],[462,666],[461,668],[460,669],[459,671],[457,672],[456,673],[454,673]],\"color_index\":2}],\"redo_strokes\":[{\"points\":[[267,3],[267,7],[266,12],[262,15],[257,16],[252,14],[249,11],[248,6],[249,2],[251,-1],[256,-3],[261,-3],[265,-0]],\"color_index\":2}],\"background_color_index\":1}",
        artist: "una" as any,
    }
];
if(location.hash === "#demo/drawpage") {
    replacepage(drawpage({
        palette: 6,
        // prompt: "The quick brown fox jumps over a lazy dog",
        frames: demo_frames,
        ask_for_frames: 2,
        start_frame_index: 4,
    }));
}else if(location.hash === "#demo/showreviewreveal") {
    showreviewreveal(demo_frames, false);
}