import {palettes, shuffle, type BroadcastMsg, type Frame, type FrameSet, type ImgSrlz} from "../../shared/shared.ts";
import { connect, disconnect, sendMessage } from "./connection.tsx";
import { drawcanvas, drawpage, unsrlzImg } from "./drawpage.tsx";
import { removeLocalStorage, getLocalStorage, localstorage_current_game, localstorage_name, replacepage, rootel, setLocalStorage, wsEventHandler, type LocalstorageCurrentGame, signal, onupdateAndNow } from "./util.tsx";

// should we have each person make one frame or two frames?
// two frames maybe

// if we want to skip a server, we can try webrtc?
// one client is the server & if they lose connection then
// they have to refresh and everyone else has to refresh
// but no data loss!important

function entergamecode() {
    // TODO autofill these with the previous values
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div id="maindiv" style="display:flex;flex-direction:column;gap:1rem">
            <form id="myform" action="javascript:;">
                <label>
                    <div>Name</div>
                    <div style="display:flex;flex-wrap:wrap;flex-direction:row">
                        <div style="flex:1"><input id="nameinput" required type="text" name="name" style="font-size:3rem;width:100%" /></div>
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
            <details>
                <summary>Create lobby</summary>
                <div style="display:flex;flex-direction:column">
                    <button id="AnimGameBtn">
                        <div>AnimGame</div>
                        <div>Make a bunch of little animations with your friends</div>
                    </button>
                    <button id="DrawGridBtn">
                        <div>DrawGrid</div>
                        <div>Compete to see who's drawings are guessed the fastest</div>
                    </button>
                </div>
            </details>
            <div>
                Past Games: [TODO]
            </div>
        </div>
    </div></div>`;

    const animgame_btn: HTMLButtonElement = rootel.querySelector("#AnimGameBtn")!;
    animgame_btn.onclick = () => {
        alert("TODO");
    };
    const drawgrid_btn: HTMLButtonElement = rootel.querySelector("#DrawGridBtn")!;
    drawgrid_btn.onclick = () => {
        alert("TODO");
    };

    const maindiv: HTMLDivElement = rootel.querySelector("#maindiv")!;
    const nameinput: HTMLInputElement = rootel.querySelector("#nameinput")!;
    nameinput.value = getLocalStorage(localstorage_name) ?? "";
    const current_game = getLocalStorage(localstorage_current_game);
    if(current_game != null) {
        const cginfo = JSON.parse(current_game) as LocalstorageCurrentGame;
        const reconnectinfo = document.createElement("div");
        reconnectinfo.innerHTML = `<div style="background-color:#ffe294">
            <div>You're in a game.</div>
            <div><button id="reconbtn">Reconnect</button></div>
        </div>`;
        maindiv.insertBefore(reconnectinfo, maindiv.firstChild);
        const reconbtn: HTMLButtonElement = reconnectinfo.querySelector("#reconbtn")!;
        reconbtn.onclick = () => {
            connect(cginfo.player_id, cginfo.game_id);
        };
    }

    const formel: HTMLFormElement = rootel.querySelector("#myform")!;
    formel.addEventListener("submit", e => {
        e.preventDefault();
        const data = new FormData(e.target as any);
        const name = data.get("name") as string;
        const code = data.get("code") as string;
        console.log(name, code);

        removeLocalStorage(localstorage_current_game);
        setLocalStorage(localstorage_name, name);
        waitpage();
        connect(name, code);
    });
}
function handleMessage(msg: BroadcastMsg) {
    if(msg.kind === "game_info") {
        setLocalStorage(localstorage_current_game, JSON.stringify({
            game_id: msg.game_id,
            player_id: msg.player_id,
        } satisfies LocalstorageCurrentGame));
    }else if(msg.kind === "error") {
        alert("Error: "+msg.message);
    }else if(msg.kind === "choose_palettes_and_ready") {
        choosepalettesandready(msg.taken_palettes);
    }else if(msg.kind === "show_prompt_sel") {
        showpromptsel();
    }else if(msg.kind === "show_prompt_accepted") {
        showpromptaccepted(msg.prompt);
    }else if(msg.kind === "show_draw_frame") {
        replacepage(drawpage(msg.context));
    }else if(msg.kind === "show_frame_accepted") {
        showdrawsent();
    }else if(msg.kind === "review_reveal") {
        showreviewreveal(msg.frameset, msg.ready);
    }else if(msg.kind === "choose_prompt") {
        showchooseprompt(msg.choices, msg.choice);
    }else if(msg.kind === "grid_and_guess") {
        showgridandguess(msg.images, msg.guessed, msg.given_up);
    }else if(msg.kind === "fullscreen_message") {
        if(msg.game_over) {
            disconnect();
            gameover();
        }
        rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
            <div style="display:flex;flex-direction:column;gap:1rem">
                <div>Game end.</div>
                <div id="updateme" style="white-space:pre-wrap"></div>
                <button id="homebtn">Home</button>
            </div>
        </div></div>`;
        rootel.querySelector("#updateme")!.textContent = msg.text;
        const homebtnel: HTMLButtonElement = rootel.querySelector("#homebtn")!;
        if(msg.game_over) {
            homebtnel.onclick = () => entergamecode();
        }else{
            homebtnel.remove();
        }
    }else if(msg.kind === "game_over") {
        gameover();
        entergamecode();
    }
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
function choosepalettesandready(in_taken_palettes: number[]) {
    let your_palette = -1;
    const taken_palettes = signal(in_taken_palettes);
    rootel.innerHTML = `<div id="mainel" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div id="readycontainer" style="display:flex;flex-direction:column;gap:1rem">
            <div>ChoosePalettesAndReady</div>
            <div id="palettes" class="choosepalettesandready--onecolwhenthin" style="display:grid;gap:0.25rem"></div>
        </div>
    </div></div>`;
    const mainel: HTMLDivElement = rootel.querySelector("#mainel")!;
    mainel.appendChild(wsEventHandler(ev => {
        if(ev.kind === "update_taken_palettes") {
            taken_palettes.value = ev.taken;
            taken_palettes.update();
        }else if(ev.kind === "confirm_your_taken_palette") {
            your_palette = ev.palette;
            taken_palettes.update();
        }
    }))
    const palettesel: HTMLDivElement = rootel.querySelector("#palettes")!;
    const readycontainer: HTMLButtonElement = rootel.querySelector("#readycontainer")!;
    readycontainer.insertBefore(makereadybtn("Ready", false), readycontainer.firstChild);
    const shufpal = [...palettes.entries()];
    shuffle(shufpal);
    for(const [i, palette] of shufpal) {
        const palettebtn = document.createElement("button");
        palettebtn.setAttribute("style", "display:flex;width:100%;border:none;background-color:transparent;padding:0");
        palettebtn.innerHTML = `
            <div class="_proot" style="border-radius:1rem;flex:1;display:flex;border:2px solid gray">
                <div class="_here" style="border-radius:calc(1rem - 2px);border:2px solid white;flex:1;display:flex"></div>
            </div>
        `;
        palettebtn.onclick = () => {
            sendMessage({kind: "choose_palette", palette: i});
        };
        const proot: HTMLDivElement = palettebtn.querySelector("._proot")!;
        const pbin: HTMLDivElement = palettebtn.querySelector("._here")!;
        onupdateAndNow(taken_palettes, () => {
            const v = taken_palettes.value.includes(i);
            const m = i === your_palette;
            palettebtn.disabled = v;
            palettebtn.style.opacity = "1.0";
            pbin.style.opacity = v ? "0.2" : "1.0";
            proot.style.borderColor = v || m ? "transparent" : "gray";
            pbin.style.borderColor = v && !m ? "gray" : "transparent";
            proot.style.outline = m ? "2px solid red" : "";
        });
        for(let i = 0; i < palette.length; i++) {
            const colorprev = palette[i - 1] ?? "transparent";
            const color = palette[i];
            {
                const palettesquare = document.createElement("div");
                palettesquare.setAttribute("style", "height:3rem;flex:1;background-color:"+colorprev);
                palettesquare.innerHTML = `<div style="width:100%;height:100%;background-color:${color};border-radius:calc(1rem - 4px) 0 0 calc(1rem - 4px)"></div>`;
                pbin.appendChild(palettesquare);
            }
            {
                const palettesquare = document.createElement("div");
                palettesquare.setAttribute("style", "height:3rem;flex:1;background-color:"+color+";"+(i === palette.length - 1 ? "border-radius:0 calc(1rem - 4px) calc(1rem - 4px) 0" : ""));
                pbin.appendChild(palettesquare);
            }
        }
        palettesel.appendChild(palettebtn);
    }
}
function showdrawsent() {
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>ShowDrawAccepted</div>
        </div>
    </div></div>`;
}
function gameover() {
    disconnect();
    removeLocalStorage(localstorage_current_game);
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
function makereadybtn(label: string, ready_state: boolean): HTMLButtonElement {
    let ready_sending = false;
    const readybtn = document.createElement("button");
    const rtnode = document.createTextNode("");
    readybtn.appendChild(rtnode);
    readybtn.setAttribute("style", "border-radius:1rem;border:2px solid black;padding:0.5rem 1rem;font-size:1rem");
    const updateReadyBtn = () => {
        if(ready_state) {
            rtnode.nodeValue = "✓ " + label;
            readybtn.style.backgroundColor = "green";
            readybtn.style.color = "white";
        }else{
            rtnode.nodeValue = "" + label;
            readybtn.style.backgroundColor = "white";
            readybtn.style.color = "black";
        }
        readybtn.disabled = ready_sending;
    }
    updateReadyBtn();
    readybtn.appendChild(wsEventHandler(ev => {
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
    return readybtn;
}
function showreviewreveal(frameset: FrameSet, ready: boolean) {
    /*
    {
    temp1.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy("data:image/svg+xml;base64,"+btoa(temp1.outerHTML))
    }
    */
    const palette = palettes[frameset.palette];
    // it would be really nice to break out drawpage so the svg
    // component is seperate so we can use it here
    rootel.innerHTML = `<div id="rootitm" style="width:max(20rem,min(100vw, calc(100vh - 10rem)));margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div>Prompt:
                <h2 id="prompthere" style="margin:0"></h2>
            </div>
            <div id="svgcontainer" style="border: 4px solid gray;display:block"></div>
            <div id="nextcontainer" style="display:flex;justify-content:end"></div>
        </div>
    </div></div>`;
    const nextcontainer: HTMLButtonElement = rootel.querySelector("#nextcontainer")!;
    nextcontainer.appendChild(makereadybtn("Next", ready));

    const prompthere: HTMLHeadingElement = rootel.querySelector("#prompthere")!;
    prompthere.textContent = ""+frameset.prompt;
    const svgcontainer: HTMLDivElement = rootel.querySelector("#svgcontainer")!;
    const mysvg = drawcanvas();

    // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animate
    // animate x pos, calcMode = discrete

    const root_group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mysvg.appendChild(root_group);
    const offsets: number[] = [];
    let offset = 0;
    for(const frame of frameset.images) {
        const frame_value: ImgSrlz = JSON.parse(frame.value);
        const frame_group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        frame_group.setAttribute("transform", `translate(${-offset}, 0)`);
        offsets.push(offset);
        root_group.appendChild(frame_group);
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("width", "1000");
        rect.setAttribute("height", "1000");
        rect.setAttribute("fill", palette[frame_value.background_color_index]);
        frame_group.appendChild(rect);
        unsrlzImg(frame_group, frame_value, palette);
        offset += 1100;
    }
    const animation = document.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
    animation.setAttribute("attributeName", "transform");
    animation.setAttribute("attributeType", "XML");
    animation.setAttribute("type", "translate");
    animation.setAttribute("values", offsets.map(of => `${of},0`).join(";"));
    animation.setAttribute("dur", (frameset.images.length * 200)+"ms");
    animation.setAttribute("repeatCount", "indefinite");
    animation.setAttribute("calcMode", "discrete");
    root_group.appendChild(animation);

    mysvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgstr = "data:image/svg+xml,"+encodeURIComponent(mysvg.outerHTML);
    const svgimg = document.createElement("img");
    svgimg.src = svgstr;
    svgimg.setAttribute("style", "display:block;aspect-ratio:1 / 1;width:100%");
    svgcontainer.appendChild(svgimg);
}
function showchooseprompt(choices: string[], choice_initial?: string) {
    const current_choice = signal(choice_initial);
    rootel.innerHTML = `<div id="rootitm" style="max-width:40rem;margin:0 auto;background-color:white"><div style="padding:2rem">
        <div id="addbtns" style="display:flex;flex-direction:column;gap:1rem">
            <div>ShowChoosePrompt</div>
        </div>
    </div></div>`;
    const addbtns: HTMLDivElement = rootel.querySelector("#addbtns")!;
    for(const choice of choices) {
        const btnel = document.createElement("button");
        btnel.textContent = choice;
        onupdateAndNow(current_choice, () => {
            const sel = current_choice.value === choice;
            btnel.style.outline = sel ? "2px solid red" : "";
        });
        btnel.onclick = () => {
            sendMessage({kind: "choose_prompt", choice});
        };
        addbtns.appendChild(btnel);
    }
    addbtns.appendChild(wsEventHandler(ev => {
        if(ev.kind === "choose_prompt_ack") {
            current_choice.value = ev.choice;
            current_choice.update();
        }
    }));
}
function maxSquareSize(num_images: number, w: number, h: number) {
    let res = 0;
    for(let rows = 1; rows <= num_images; rows++) {
        const columns = Math.ceil(num_images / rows);
        const square_size = Math.min(w / columns, h / rows);

        if(square_size > res) res = square_size;
    }
    return res;
}
function showgridandguess(images: {id: string, palette: number, value: string}[], in_correct: string[], ready: boolean) {
    shuffle(images);
    const correct = signal(in_correct);
    // let's make this one a fullscreen ui
    // image grid left, text chat right

    // the grid has a size in pixels
    // : say 25x40
    // we know the number of images we would like to display
    // : say 6
    // we need to select the largest square size possible to be
    // able to display all six images
    // - 1 => min(w, h)
    // - 2 => min(w / 2, h / 2)
    rootel.innerHTML = `<div id="rootitm" style="width:100vw;height:100vh;margin:0 auto;background-color:white"><div style="padding:1rem;box-sizing:border-box;height:100%">
        <div style="height:100%;display:flex;flex-direction:row;gap:1rem">
            <div id="gridzone" style="display:flex;flex-wrap:wrap;align-content:center;justify-content:center;flex:1;overflow:hidden;height:100%"></div>
            <div style="width:min(20rem,30vw);height:100%;overflow-y:scroll;overflow-x:hidden">
                <form id="chatform" action="javascript:;" style="display:flex">
                    <input id="guessinput" name="guess" style="flex:1;width:0"></input>
                    <button>Guess</button>
                </form>
                <div id="giveupbtnhere"></div>
                <div id="msgshere"></div>
            </div>
        </div>
    </div></div>`;
    const rootitm: HTMLDivElement = rootel.querySelector("#rootitm")!;
    const msgshere: HTMLDivElement = rootel.querySelector("#msgshere")!;
    const gridzone: HTMLDivElement = rootel.querySelector("#gridzone")!;
    const giveupbtnhere: HTMLDivElement = rootel.querySelector("#giveupbtnhere")!;
    giveupbtnhere.appendChild(makereadybtn("Give up", ready));
    const form = rootel.querySelector("form")!;
    const guessinput: HTMLInputElement = rootel.querySelector("#guessinput")!;
    const onresize = () => {
        const gzsize = gridzone?.getBoundingClientRect();
        const max_size = maxSquareSize(images.length, gzsize.width, gzsize.height);
        gridzone.style.setProperty("--width", Math.floor(max_size)+"px");
    };
    new ResizeObserver(onresize).observe(gridzone);
    onresize();

    for(const image of images) {
        const palette = palettes[image.palette];
        const mysvg = drawcanvas();
        mysvg.setAttribute("style", "width:var(--width);height:var(--width)");
        const frame_value: ImgSrlz = JSON.parse(image.value);
        mysvg.style.backgroundColor = palette[frame_value.background_color_index];
        unsrlzImg(mysvg, frame_value, palette);
        gridzone.appendChild(mysvg);
        onupdateAndNow(correct, () => {
            const incl = correct.value.includes(image.id);
            mysvg.classList.toggle("showgridandguess--correct", incl);
        })
    }
    rootitm.appendChild(wsEventHandler(msg => {
        if(msg.kind === "grid_correct_guess") {
            correct.value.push(msg.image);
            correct.update();
        }
    }));

    form.addEventListener("submit", e => {
        e.preventDefault();
        const data = new FormData(e.target as any);
        const guess = data.get("guess") as string;
        sendMessage({kind: "chat_message", message: guess});
        guessinput.value = "";
    });

    rootitm.appendChild(wsEventHandler(msg => {
        if(msg.kind === "chat_message") {
            const cmdiv = document.createElement("div");
            cmdiv.textContent = msg.value;
            msgshere.insertBefore(cmdiv, msgshere.firstChild);
        }
    }));
}

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
declare global {
    var filecont: unknown;
}
if(typeof filecont !== "undefined") {
    alert("TODO filecont");
}else if(location.hash === "#demo/choosepalettesandready") {
    choosepalettesandready([1, 6, 4]);
}else if(location.hash === "#demo/drawpage") {
    replacepage(drawpage({
        palette: 6,
        // prompt: "The quick brown fox jumps over a lazy dog",
        frames: demo_frames,
        ask_for_frames: 2,
        start_frame_index: 4,
    }));
}else if(location.hash === "#demo/showreviewreveal") {
    showreviewreveal({
        palette: 6,
        images: [...demo_frames, ...demo_frames],
        prompt: "A quick brown fox jumps over a lazy dog",
    }, false);
}else if(location.hash === "#demo/showgridandguess") {
    showgridandguess([...demo_frames, ...demo_frames].map((m, i) => ({
        id: ""+i,
        palette: 6,
        value: m.value,
    })), ["2"], false);
}else{
    entergamecode();
}