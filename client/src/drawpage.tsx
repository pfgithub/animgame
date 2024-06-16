import { getStroke } from "perfect-freehand";
import { palettes, type ContextFrames, type Palette } from "../../shared/shared.ts";
import { addPtrEvHs, autosaveHandler, onupdateAndNow, signal, type Signal, type Vec2 } from "./util.tsx";

const IMGW = 1000;
const IMGH = 1000;

type Cfg = {
    palette: Palette,
    line_width: number,
    color: string,
    background: string,
};

type StrokeSrlz = {
    points: Vec2[],
    color_index: number,
};
type ImgSrlz = {
    undo_strokes: StrokeSrlz[],
    redo_strokes: StrokeSrlz[],
    background_color_index: number,
};

export function drawpage(context: ContextFrames): HTMLDivElement {
    // TODO: save in local storage in case you reload
    // TODO: we're going to load arbitrary lines so make sure we can
    //           render arbitrary lines safely
    //
    // : we can call srlz() on an interval for localstorage

    const rootel = document.createElement("div");

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
            <div id="promptwrapper">
                Draw:
                <h2 id="prompthere" style="margin:0"></h2>
            </div>
            <div id="buttonshere2" style="display:flex;flex-direction:row;flex-wrap:wrap;gap:0.5rem">
            </div>
            <div>
                <div id="frametabs" style="display:flex"></div>
                <div style="border: 4px solid gray;display:block">
                    <svg style="display:block;aspect-ratio:1 / 1;width:100%" id="mysvg" viewbox="0 0 ${IMGW} ${IMGH}"></svg>
                </div>
            </div>
            <div id="buttonshere" style="display:flex;flex-wrap:wrap;flex-direction:row;gap:0.5rem">
            </div>
        </div>
    </div></div>`;
    const promptwrapper: HTMLDivElement = rootel.querySelector("#promptwrapper")!;
    if(context.prompt != null) {
        const prompthere: HTMLDivElement = rootel.querySelector("#prompthere")!;
        prompthere.textContent = context.prompt;
    }else{
        promptwrapper.remove();
    }
    const frametabs: HTMLDivElement = rootel.querySelector("#frametabs")!;
    for(let i = 0; i < context.frames.length + context.ask_for_frames; i++) {
        const tabv = document.createElement("button");
        tabv.setAttribute("style", "flex:1;background-color:white;border:2px solid gray;border-radius: 8px 8px 0 0;border-bottom:none;padding:0.25rem 0.25rem");
        tabv.textContent = "Frame "+(i + context.start_frame_index + 1);
        frametabs.appendChild(tabv);
    }
    {
        const playbtn = document.createElement("button");
        playbtn.setAttribute("style", "background-color:white;border:2px solid gray;border-radius: 8px 8px 0 0;border-bottom:none;padding:0.25rem 0.75rem");
        playbtn.textContent = "Play";
        frametabs.appendChild(playbtn);
    }

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
            redo_strokes: [],
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

    return rootel;
}


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