import { getStroke } from "perfect-freehand";

// should we have each person make one frame or two frames?
// two frames maybe

// if we want to skip a server, we can try webrtc?
// one client is the server & if they lose connection then
// they have to refresh and everyone else has to refresh
// but no data loss!important

type Palette = string[];
const palettes: Palette[] = [
    ["#776D5A", "#987D7C", "#A09CB0", "#A3B9C9", "#ABDAE1"],
    ["#CFD4C5", "#EECFD4", "#EFB9CB", "#E6ADEC", "#C287E8"],
    ["#1C1C1C", "#DADDD8", "#ECEBE4", "#EEF0F2", "#FAFAFF"],
    ["#BDC667", "#77966D", "#626D58", "#544343", "#56282D"],
    ["#2DE1FC", "#2AFC98", "#09E85E", "#16C172", "#214F4B"],
    ["#FE5D26", "#F2C078", "#FAEDCA", "#C1DBB3", "#7EBC89"],
    ["#353535", "#3C6E71", "#284B63", "#D9D9D9", "#FFFFFF"],
    ["#686868", "#C2AFF0", "#9191E9", "#457EAC", "#2D5D7B"],
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
    redo_strokes: StrokeSrlz[],
};
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

    rootel.innerHTML = `<div style="width:max(20rem,min(100vw, calc(100vh - 10rem)));margin:0 auto;background-color:white"><div style="padding:2rem">
        <div style="display:flex;flex-direction:column;gap:1rem">
            <div id="buttonshere2" style="display:flex;flex-direction:row;flex-wrap:wrap;;gap:0.5rem">
            </div>
            <div><div style="border: 4px solid gray;display:block">
                <svg style="display:block;aspect-ratio:1 / 1;width:100%" id="mysvg" viewbox="0 0 ${IMGW} ${IMGH}"></svg>
            </div></div>
            <div id="buttonshere" style="display:flex;flex-wrap:wrap;flex-direction:row;gap:0.5rem">
            </div>
        </div>
    </div></div>`;
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
            redo_strokes: [],
        };
        const as = (a: StrokeSrlz[], b: SVGPathElement[]) => {
            for(const stroke of b) {
                const data = ((stroke as any).__data_rsrlz as StrokeSrlz | undefined);
                if(!data) continue;
                a.push(data);
            }
        };
        as(srlzres.undo_strokes, linesv);
        as(srlzres.redo_strokes, linesr);

        return srlzres;
    }
    mysvg.addEventListener("pointerdown", (e: PointerEvent) => {
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
            perfectPoints.push([...pt, e.pressure]);

            updaterender([svgelsz.width, svgelsz.height]);
        };

        const onpointermove = (e: PointerEvent) => {
            if(e.pointerId !== ptrid) return;
            e.preventDefault();
            e.stopPropagation();

            addpoint(e);
        };
        const onpointerup = (e: PointerEvent) => {
            if(e.pointerId !== ptrid) return;
            e.preventDefault();
            e.stopPropagation();

            addpoint(e);
            clear();
            linesv.push(renderv);
        };
        const onpointercancel = (e: PointerEvent) => {
            if(e.pointerId !== ptrid) return;
            e.preventDefault();
            e.stopPropagation();

            renderv.remove();
            clear();
        };
        document.addEventListener("pointerup", onpointerup, { capture: true });
        document.addEventListener("pointercancel", onpointercancel, { capture: true });
        document.addEventListener("pointermove", onpointermove, { capture: true });
        const clear = () => {
            document.removeEventListener("pointerup", onpointerup, { capture: true });
            document.removeEventListener("pointercancel", onpointercancel, { capture: true });
            document.removeEventListener("pointermove", onpointermove, { capture: true });
        };
        addpoint(e);
    });

    cfg.update();
}

drawpage();


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