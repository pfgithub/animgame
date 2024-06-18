import { getStroke } from "perfect-freehand";
import { palettes, type ContextFrames, type ImgSrlz, type Palette, type StrokeSrlz, type Vec2 } from "../../shared/shared.ts";
import { addPtrEvHs, autosaveHandler, onupdateAndNow, signal, type Signal } from "./util.tsx";
import { sendMessage } from "./connection.tsx";

const IMGW = 1000;
const IMGH = 1000;

type Cfg = {
    line_width: number,
    color: string,
    background: string,
    frame: number,
    uncanned_frames: ImgSrlz[],
    onion_skinning: boolean,
    playing: boolean,
};

export function drawcanvas(): SVGSVGElement {
    const mysvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    mysvg.setAttribute("style", "display:block;aspect-ratio:1 / 1;width:100%");
    mysvg.setAttribute("viewBox", "0 0 "+IMGW+" "+IMGH); // "viewBox" is case-sensitive in js but not html

    return mysvg;
}

function updatePath(path: SVGPathElement, stroke: StrokeSrlz) {
    (path as any).__data_rsrlz = stroke;
    path.setAttribute("d", getSvgPathFromStroke(stroke.points));
};
export function unsrlzStroke(stroke: StrokeSrlz, palette: Palette): SVGPathElement {
    const renderv = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // renderv.setAttribute("style", "shape-rendering:crispEdges"); // I think this looks cool but it's a little misleading
    renderv.setAttribute("fill", palette[stroke.color_index]);
    updatePath(renderv, stroke);
    return renderv;
};
export function unsrlzImg(parent: SVGElement, srlz: ImgSrlz, palette: Palette): SVGPathElement[] {
    // 1. convert strokes
    const vstrokes = srlz.undo_strokes.map(stroke => unsrlzStroke(stroke, palette));
    // 2. apply all undo strokes
    for(const stroke of vstrokes) {
        parent.appendChild(stroke);
    }

    return vstrokes;
}
const rendersrlzos = (srlz: ImgSrlz) => {
    const res_group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    res_group.style.opacity = "0.5";
    
};

export function drawpage(context: ContextFrames): HTMLDivElement {
    // TODO: save in local storage in case you reload
    // TODO: we're going to load arbitrary lines so make sure we can
    //           render arbitrary lines safely
    //
    // : we can call srlz() on an interval for localstorage

    const rootel = document.createElement("div");

    const palette: Palette = palettes[context.palette]!;
    let cfg = signal<Cfg>({
        line_width: 20,
        color: "",
        background: "",
        frame: context.frames.length,
        uncanned_frames: [],
        onion_skinning: true,
        playing: false,
    });
    const readonly = () => cfg.value.frame < context.frames.length || cfg.value.playing;
    let linesv: SVGPathElement[] = [];
    let linesr: SVGPathElement[] = [];
    {
        cfg.value.color = palette[0];
        const lastcannedframe = context.frames[context.frames.length - 1]?.value;
        cfg.value.background = palette[
            lastcannedframe != null ? (JSON.parse(lastcannedframe) as ImgSrlz).background_color_index :
            palette.length - 1
        ];
    }

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
                <div id="svgcontainer" style="border: 4px solid gray;display:block"></div>
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
        promptwrapper.textContent = "Continue the animation:";
    }
    const frametabs: HTMLDivElement = rootel.querySelector("#frametabs")!;
    const total_frame_count = context.frames.length + context.ask_for_frames;
    for(let i = 0; i < total_frame_count; i++) {
        const _i = i;

        const tabv = document.createElement("button");
        tabv.setAttribute("style", "flex:1;background-color:white;border:2px solid;border-radius: 10px 10px 0 0;border-bottom:none;padding:0");
        tabv.innerHTML = `<div class="editme" style="height:100%;box-sizing:border-box;border: 2px solid;border-radius:8px 8px 0 0;border-bottom:none;padding:0.25rem 0.25rem"></div>`;
        const tabsub: HTMLDivElement = tabv.querySelector(".editme")!;
        tabsub.textContent = ""+(i + context.start_frame_index + 1);
        frametabs.appendChild(tabv);
        const tabi = i;
        onupdateAndNow(cfg, () => {
            if(_i === cfg.value.frame) {
                tabv.style.borderColor = "red";
                tabsub.style.borderColor = "transparent";
            }else{
                tabv.style.borderColor = "transparent";
                tabsub.style.borderColor = "gray";
            }
        });
        tabv.addEventListener("click", () => {
            loadframe(_i);
        });
        onupdateAndNow(cfg, () => tabv.disabled = cfg.value.playing);
    }
    const save = () => {
        const curr_frame = cfg.value.frame;
        if(curr_frame >= context.frames.length) {
            cfg.value.uncanned_frames[curr_frame - context.frames.length] = srlz();
        }
    };
    const loadframe = (i: number) => {
        // save
        save();

        // clear
        mysvg.innerHTML = "";

        // load
        if(cfg.value.onion_skinning) loadframe_internal(i - 1, true);
        loadframe_internal(i, false);
    };
    const loadframe_internal = (i: number, onionskin: boolean) => {
        if(i < 0) return;
        cfg.value.frame = i;
        const cannedframe = context.frames[i]?.value;
        const framev: ImgSrlz = (cannedframe != null ? JSON.parse(cannedframe) : null) ?? cfg.value.uncanned_frames[i - context.frames.length] ?? ({
            undo_strokes: [],
            redo_strokes: [],
            background_color_index: palette.indexOf(cfg.value.background),
        } satisfies ImgSrlz);
        if(onionskin) rendersrlzos(framev); else rendersrlz(framev);
        cfg.update();
    }
    {
        const playbtn = document.createElement("button");
        playbtn.setAttribute("style", "background-color:white;border:2px solid gray;border-radius: 8px 8px 0 0;border-bottom:none;padding:0.25rem 0.75rem;margin:2px 0.25rem 0 0.25rem");
        playbtn.textContent = "Play";
        onupdateAndNow(cfg, () => playbtn.disabled = cfg.value.playing);
        playbtn.addEventListener("mousedown", async () => {
            if(cfg.value.playing) return;
            cfg.value.playing = true;
            const prev_os = cfg.value.onion_skinning;
            const prev_f = cfg.value.frame;
            cfg.value.onion_skinning = false;

            for(let i = 0; i < total_frame_count; i++) {
                loadframe(i);
                await new Promise(r => setTimeout(r, 200));
            }

            cfg.value.playing = false;
            cfg.value.onion_skinning = prev_os;
            loadframe(prev_f);
        });
        frametabs.appendChild(playbtn);
    }

    const rootitm: HTMLDivElement = rootel.querySelector("#rootitm")!;
    rootitm.appendChild(autosaveHandler(() => {
        // localStorage.setItem("animgame-saved-drawing", JSON.stringify(srlz()));
        // console.log("saved");
    }));
    const svgcontainer: SVGElement = rootel.querySelector("#svgcontainer")!;
    const mysvg: SVGSVGElement = drawcanvas();
    svgcontainer.appendChild(mysvg);
    onupdateAndNow(cfg, () => {
        mysvg.style.backgroundColor = cfg.value.background;
    });
    const topbuttons: HTMLDivElement = rootel.querySelector("#buttonshere2")!;
    const mybuttons: HTMLDivElement = rootel.querySelector("#buttonshere")!;
    const dset = (d: (v: boolean) => void) => onupdateAndNow(cfg, () => d(readonly()));
    addLinewidthButton(topbuttons, 1, cfg, dset);
    addLinewidthButton(topbuttons, 2, cfg, dset);
    addLinewidthButton(topbuttons, 3, cfg, dset);
    addLinewidthButton(topbuttons, 4, cfg, dset);
    const tb0 = document.createElement("div");
    tb0.setAttribute("style", "flex:1");
    topbuttons.appendChild(tb0);
    addOtherButton(topbuttons, "undo", () => {
        const popv = linesv.pop();
        if(!popv) return;
        linesr.push(popv);
        popv.remove();
    }, dset);
    addOtherButton(topbuttons, "redo", () => {
        const popv = linesr.pop();
        if(!popv) return;
        linesv.push(popv);
        mysvg.appendChild(popv);
    }, dset);
    for(const color of palette) {
        addColorButton(mybuttons, color, cfg, dset);
    }
    addOtherButton(mybuttons, "set bg", () => {
        cfg.value.background = cfg.value.color;
        cfg.update();
    }, dset);
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
    }, dset);
    addOtherButton(mybuttons, "submit", () => {
        save();
        const uncanned_frames = cfg.value.uncanned_frames;
        for(let i = 0; i < context.ask_for_frames; i++) {
            const f = uncanned_frames[i];
            if(f == null || f.undo_strokes.length === 0) {
                alert("You didn't draw anything for frame "+(context.start_frame_index+context.frames.length+i+1));
                loadframe(context.frames.length + i);
                return;
            }
        }

        if(!confirm("Really submit your animation?")) return;

        // it's saved, send it off
        sendMessage({
            kind: "submit_animation",
            frames: cfg.value.uncanned_frames.map(ucf => JSON.stringify(ucf)),
        });
    }, d => onupdateAndNow(cfg, () => d(cfg.value.playing)));
    const srlz = () => {
        const srlzres: ImgSrlz = {
            undo_strokes: [],
            redo_strokes: [],
            background_color_index: palette.indexOf(cfg.value.background),
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
    // window.__srlz = () => JSON.stringify(srlz());
    const rendersrlzos = (srlz: ImgSrlz) => {
        const res_group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        res_group.style.opacity = "0.5";

        unsrlzImg(res_group, srlz, palette);

        // 3. append group
        mysvg.appendChild(res_group);
    };
    const rendersrlz = (srlz: ImgSrlz) => {
        // 1. update undo/redo lists
        linesv = unsrlzImg(mysvg, srlz, palette);
        linesr = srlz.redo_strokes.map(stroke => unsrlzStroke(stroke, palette));

        // 2. set background color
        cfg.value.background = palette[srlz.background_color_index];
        cfg.update();
    };

    // it seems to be a firefox-only bug
    // drawing with two fingers (if you set touch-action to none)
    // is only updating one and then the other. despite there being two
    // capture listeners? the second one should handle the pointer id we
    // want?
    // and when you pinch in to zoom it's sending cancels but we're missing
    // one
    mysvg.style.touchAction = "pinch-zoom";
    mysvg.addEventListener("pointerdown", (e: PointerEvent) => {
        if(readonly()) return;
        e.preventDefault();
        e.stopPropagation();

        const ptrid = e.pointerId;
        const stroke_color = cfg.value.color;
        const line_width = cfg.value.line_width;
        const renderv = unsrlzStroke({
            color_index: palette.indexOf(stroke_color),
            points: [],
        }, palette);
        mysvg.appendChild(renderv);

        const updaterender = (size: Vec2) => {
            let stroke: Vec2[] = getStroke(perfectPoints, {
                size: size[0] / 1000 * line_width,
                thinning: (80 - line_width) / 160,
            }) as Vec2[];
            stroke = stroke.map((pt): Vec2 => [
                Math.min(1020, Math.max(-20, Math.round(pt[0] / size[0] * IMGW))),
                Math.min(1020, Math.max(-20, Math.round(pt[1] / size[1] * IMGH))),
            ]);
            updatePath(renderv, {
                points: stroke,
                color_index: palette.indexOf(stroke_color),
            });
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

    loadframe(cfg.value.frame);
    cfg.update();

    return rootel;
}


function addColorButton(parent: HTMLDivElement, color: string, cfg: Signal<Cfg>, dset?: Dset) {
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
    dset?.(d => btnel.disabled = d);
}
function addLinewidthButton(parent: HTMLDivElement, lw: number, cfg: Signal<Cfg>, dset?: Dset) {
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
    dset?.(d => btnel.disabled = d);
}
type Dset = (cb: (d: boolean) => void) => void;
function addOtherButton(parent: HTMLDivElement, label: string, cb: () => void, dset?: Dset) {
    const newel = document.createElement("div");
    newel.style.display = "contents";
    newel.innerHTML = `<button id="btnel" style="border:2px solid gray;height:2rem;padding:0 0.5rem;border-radius:9999px;background-color:white;">${label}</button>`;
    const btnel: HTMLButtonElement = newel.querySelector("#btnel")!;
    btnel.onclick = () => {
        cb();
    }
    parent.appendChild(newel);
    dset?.(d => btnel.disabled = d);
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