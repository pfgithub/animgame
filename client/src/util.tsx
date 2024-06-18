import type { BroadcastMsg } from "../../shared/shared";

export type Signal<T> = {value: T, update: () => void};
export function signal<T>(v: T): Signal<T> {
    return {value: v, update: () => {}};
}

export function onupdateAndNow<T>(signal: Signal<T>, cb: () => void) {
    const pu = signal.update;
    signal.update = () => {
        pu();
        cb();
    };
    cb();
}

export function autosaveHandler(cb: () => void): HTMLDivElement {
    const el = document.createElement("div");
    el.setAttribute("class", "data-autosave_handler");
    (el as any).__autosave_handler = cb;
    return el;
}
export function wsEventHandler(cb: (ev: BroadcastMsg) => void): HTMLDivElement {
    const el = document.createElement("div");
    el.setAttribute("class", "data-wsevent_handler");
    (el as any).__wsevent_handler = cb;
    return el;
}


type PtrEvHs = {
    onpointermove: (e: PointerEvent) => void,
    onpointerup: (e: PointerEvent) => void,
    onpointercancel: () => void,
};
const ptridh = new Map<number, PtrEvHs>();

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
export function addPtrEvHs(tid: number, ptrevhs: PtrEvHs): void {
    const pv = ptridh.get(tid);
    if(pv != null) {
        pv.onpointercancel();
    }
    ptridh.set(tid, ptrevhs);
}

setInterval(() => {
    document.querySelectorAll(".data-autosave_handler").forEach(node => {
        (node as any).__autosave_handler?.();
    });
}, 1000);


export const rootel = document.getElementById("root")!;
export function replacepage(el: HTMLElement) {
    rootel.innerHTML = "";
    rootel.appendChild(el);
}