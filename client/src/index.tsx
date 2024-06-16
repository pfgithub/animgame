import { getStroke } from "perfect-freehand";
import {type BroadcastMsg, type RecieveMessage} from "../../shared/shared.ts";

// should we have each person make one frame or two frames?
// two frames maybe

// if we want to skip a server, we can try webrtc?
// one client is the server & if they lose connection then
// they have to refresh and everyone else has to refresh
// but no data loss!important

type Palette = string[];
const palettes: Palette[] = [
    ["#776D5A", "#987D7C", "#A09CB0", "#A3B9C9", "#ABDAE1"],
    ["#C287E8", "#E6ADEC", "#EFB9CB", "#EECFD4", "#CFD4C5"],
    ["#1C1C1C", "#DADDD8", "#ECEBE4", "#EEF0F2", "#FAFAFF"],
    ["#56282D", "#544343", "#626D58", "#77966D", "#BDC667"],
    ["#214F4B", "#16C172", "#09E85E", "#2AFC98", "#2DE1FC"],
    ["#FE5D26", "#F2C078", "#C1DBB3", "#7EBC89", "#FAEDCA"],
    ["#353535", "#3C6E71", "#284B63", "#D9D9D9", "#FFFFFF"],
    ["#686868", "#2D5D7B", "#457EAC", "#9191E9", "#C2AFF0"],
];

type Vec2 = [number, number];
const rootel = document.getElementById("root")!;
const IMGW = 1000;
const IMGH = 1000;

function addColorButton(parent: HTMLDivElement, color: string, cfg: Signal<Cfg>) {
    const newel = document.createElement("div");
    newel.style.display = "contents";
    newel.innerHTML = `<button id="btnel" style="border:2px solid gray;width:2rem;aspect-ratio:1 / 1;border-radius:9999px;background-color:${color};"></button>`;
    const btnel: HTMLButtonElement = newel.querySelector("#btnel")!;
    btnel.onclick = () => {
        cfg.value.color = color;
        cfg.update();
    }
    onupdateAndNow(cfg, () => {
        if(cfg.value.color === color) {
            btnel.style.borderColor = "white";
            btnel.style.outline = "2px solid red";
        }else{
            btnel.style.borderColor = "gray";
            btnel.style.outline = "";
        }
    });
    parent.appendChild(newel);
}
function addLinewidthButton(parent: HTMLDivElement, lw: number, cfg: Signal<Cfg>) {
    const lwv = lw * 20;
    const newel = document.createElement("div");
    newel.style.display = "contents";
    newel.innerHTML = `<button id="btnel" style="border:2px solid gray;width:2rem;aspect-ratio:1 / 1;border-radius:9999px;background-color:white;">${""+lw}</button>`;
    const btnel: HTMLButtonElement = newel.querySelector("#btnel")!;
    btnel.onclick = () => {
        cfg.value.line_width = lwv;
        cfg.update();
    }
    onupdateAndNow(cfg, () => {
        if(cfg.value.line_width === lwv) {
            btnel.style.borderColor = "white";
            btnel.style.outline = "2px solid red";
        }else{
            btnel.style.borderColor = "gray";
            btnel.style.outline = "";
        }
    });
    parent.appendChild(newel);
}
function addOtherButton(parent: HTMLDivElement, label: string, cb: () => void) {
    const newel = document.createElement("div");
    newel.style.display = "contents";
    newel.innerHTML = `<button id="btnel" style="border:2px solid gray;height:2rem;padding:0 0.5rem;border-radius:9999px;background-color:white;">${label}</button>`;
    const btnel: HTMLButtonElement = newel.querySelector("#btnel")!;
    btnel.onclick = () => {
        cb();
    }
    parent.appendChild(newel);
}

type Cfg = {
    palette: Palette,
    line_width: number,
    color: string,
    background: string,
};
type Signal<T> = {value: T, update: () => void};
function signal<T>(v: T): Signal<T> {
    return {value: v, update: () => {}};
}
function onupdateAndNow<T>(signal: Signal<T>, cb: () => void) {
    const pu = signal.update;
    signal.update = () => {
        pu();
        cb();
    };
    cb();
}
type StrokeSrlz = {
    points: Vec2[],
    color_index: number,
};
type ImgSrlz = {
    undo_strokes: StrokeSrlz[],
    // redo_strokes: StrokeSrlz[],
    background_color_index: number,
};
function autosaveHandler(cb: () => void): HTMLDivElement {
    const el = document.createElement("div");
    el.setAttribute("class", "data-autosave_handler");
    (el as any).__autosave_handler = cb;
    return el;
}
function wsEventHandler(cb: (ev: BroadcastMsg) => void): HTMLDivElement {
    const el = document.createElement("div");
    el.setAttribute("class", "data-wsevent_handler");
    (el as any).__wsevent_handler = cb;
    return el;
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
    }
    console.log(msg);
}
let sendMessage = (msg: RecieveMessage) => {};
function waitpage() {
    rootel.innerHTML = ``;
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
function drawpage() {
    // TODO: save in local storage in case you reload
    // TODO: we're going to load arbitrary lines so make sure we can
    //           render arbitrary lines safely
    //
    // : we can call srlz() on an interval for localstorage

    let cfg = signal<Cfg>({
        palette: palettes[6]!,
        line_width: 20,
        color: "",
        background: "",
    });
    const linesv: SVGPathElement[] = [];
    const linesr: SVGPathElement[] = [];
    cfg.value.color = cfg.value.palette[0],
    cfg.value.background = cfg.value.palette[cfg.value.palette.length - 1],

    rootel.innerHTML = `<div id="rootitm" style="width:max(20rem,min(100vw, calc(100vh - 10rem)));margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div id="buttonshere2" style="display:flex;flex-direction:row;flex-wrap:wrap;gap:0.5rem">
            </div>
            <div><div style="border: 4px solid gray;display:block">
                <svg style="display:block;aspect-ratio:1 / 1;width:100%" id="mysvg" viewbox="0 0 ${IMGW} ${IMGH}"></svg>
            </div></div>
            <div id="buttonshere" style="display:flex;flex-wrap:wrap;flex-direction:row;gap:0.5rem">
            </div>
        </div>
    </div></div>`;
    const rootitm: HTMLDivElement = rootel.querySelector("#rootitm")!;
    rootitm.appendChild(autosaveHandler(() => {
        localStorage.setItem("animgame-saved-drawing", JSON.stringify(srlz()));
        console.log("saved");
    }));
    const mysvg: SVGElement = rootel.querySelector("#mysvg")!;
    onupdateAndNow(cfg, () => {
        mysvg.style.backgroundColor = cfg.value.background;
    });
    const topbuttons: HTMLDivElement = rootel.querySelector("#buttonshere2")!;
    const mybuttons: HTMLDivElement = rootel.querySelector("#buttonshere")!;
    addLinewidthButton(topbuttons, 1, cfg);
    addLinewidthButton(topbuttons, 2, cfg);
    addLinewidthButton(topbuttons, 3, cfg);
    addLinewidthButton(topbuttons, 4, cfg);
    const tb0 = document.createElement("div");
    tb0.setAttribute("style", "flex:1");
    topbuttons.appendChild(tb0);
    addOtherButton(topbuttons, "undo", () => {
        const popv = linesv.pop();
        if(!popv) return;
        linesr.push(popv);
        popv.remove();
    });
    addOtherButton(topbuttons, "redo", () => {
        const popv = linesr.pop();
        if(!popv) return;
        linesv.push(popv);
        mysvg.appendChild(popv);
    });
    for(const color of cfg.value.palette) {
        addColorButton(mybuttons, color, cfg);
    }
    addOtherButton(mybuttons, "set bg", () => {
        cfg.value.background = cfg.value.color;
        cfg.update();
    });
    const tb1 = document.createElement("div");
    tb1.setAttribute("style", "flex:1");
    mybuttons.appendChild(tb1);
    addOtherButton(mybuttons, "clear", () => {
        if(!confirm("CLEAR? really??")) return;
        while(linesv.length > 0) {
            const itm = linesv.shift()!;
            itm.remove();
            linesr.push(itm);
        }
    });
    addOtherButton(mybuttons, "submit", () => {
        if(!confirm("Really submit your drawing?")) return;
        const srlzres = srlz();
        console.log(srlzres);
    });
    const srlz = () => {
        const srlzres: ImgSrlz = {
            undo_strokes: [],
            // redo_strokes: [],
            background_color_index: cfg.value.palette.indexOf(cfg.value.background),
        };
        const as = (a: StrokeSrlz[], b: SVGPathElement[]) => {
            for(const stroke of b) {
                const data = ((stroke as any).__data_rsrlz as StrokeSrlz | undefined);
                if(!data) continue;
                a.push(data);
            }
        };
        as(srlzres.undo_strokes, linesv);
        // as(srlzres.redo_strokes, linesr);

        return srlzres;
    }

    // it seems to be a firefox-only bug
    // drawing with two fingers (if you set touch-action to none)
    // is only updating one and then the other. despite there being two
    // capture listeners? the second one should handle the pointer id we
    // want?
    // and when you pinch in to zoom it's sending cancels but we're missing
    // one
    mysvg.style.touchAction = "pinch-zoom";
    mysvg.addEventListener("pointerdown", (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const ptrid = e.pointerId;
        const stroke_color = cfg.value.color;
        const line_width = cfg.value.line_width;
        const renderv = document.createElementNS("http://www.w3.org/2000/svg", "path");
        mysvg.appendChild(renderv);
        renderv.setAttribute("fill", stroke_color);

        const updaterender = (size: Vec2) => {
            let stroke: Vec2[] = getStroke(perfectPoints, {
                size: size[0] / 1000 * line_width,
                thinning: (80 - line_width) / 160,
            }) as Vec2[];
            stroke = stroke.map((pt): Vec2 => [pt[0] / size[0] * IMGW, pt[1] / size[1] * IMGH]);
            const strokev: StrokeSrlz = {
                points: stroke,
                color_index: cfg.value.palette.indexOf(stroke_color),
            };
            (renderv as any).__data_rsrlz = strokev;
            renderv.setAttribute("d", getSvgPathFromStroke(stroke));
        };

        const perfectPoints: [...Vec2, number][] = [];
        const addpoint = (e: PointerEvent) => {
            const svgelsz = mysvg.getBoundingClientRect();
            const pt: Vec2 = [e.clientX - svgelsz.x, e.clientY - svgelsz.y];
            perfectPoints.push([...pt, e.pressure ?? undefined]);

            updaterender([svgelsz.width, svgelsz.height]);
        };

        addPtrEvHs(e.pointerId, {
            onpointermove(e) {
                addpoint(e);
            },
            onpointerup(e) {
                addpoint(e);
                linesv.push(renderv);
            },
            onpointercancel() {
                renderv.remove();
            },
        });

        addpoint(e);
    });

    cfg.update();
}


type PtrEvHs = {
    onpointermove: (e: PointerEvent) => void,
    onpointerup: (e: PointerEvent) => void,
    onpointercancel: () => void,
};
const ptridh = new Map<number, PtrEvHs>();

function addPtrEvHs(tid: number, ptrevhs: PtrEvHs): void {
    const pv = ptridh.get(tid);
    if(pv != null) {
        pv.onpointercancel();
    }
    ptridh.set(tid, ptrevhs);
}

const onpointermove = (e: PointerEvent) => {
    const val = ptridh.get(e.pointerId);
    if(val != null) {
        e.preventDefault();
        e.stopPropagation();
        val.onpointermove(e);
    }
};
const onpointerup = (e: PointerEvent) => {
    const val = ptridh.get(e.pointerId);
    if(val != null) {
        e.preventDefault();
        e.stopPropagation();
        val.onpointerup(e);
        ptridh.delete(e.pointerId);
    }
};
const onpointercancel = (e: PointerEvent) => {
    const val = ptridh.get(e.pointerId);
    if(val != null) {
        e.preventDefault();
        e.stopPropagation();
        val.onpointerup(e);
        ptridh.delete(e.pointerId);
    }
};
document.addEventListener("pointerup", onpointerup, { capture: true });
document.addEventListener("pointercancel", onpointercancel, { capture: true });
document.addEventListener("pointermove", onpointermove, { capture: true });
setInterval(() => {
    document.querySelectorAll(".data-autosave_handler").forEach(node => {
        (node as any).__autosave_handler?.();
    });
}, 1000);

// drawpage();
entergamecode();


function getSvgPathFromStroke(points: Vec2[], closed = true) {
    const len = points.length

    if (len < 4) {
        return ``
    }

    let a = points[0]
    let b = points[1]
    const c = points[2]

    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
        2
    )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
        b[1],
        c[1]
    ).toFixed(2)} T`

    for (let i = 2, max = len - 1; i < max; i++) {
        a = points[i]
        b = points[i + 1]
        result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
            2
        )} `
    }

    if (closed) {
        result += 'Z'
    }

    return result
}
const average = (a: number, b: number) => (a + b) / 2;