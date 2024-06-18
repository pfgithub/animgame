export type GameID = string & {__is_game_id: true};
export type PlayerID = string & {__is_player_id: true};

export type Frame = {
    artist: PlayerID,
    value: string,
};
export type ContextFrames = {
    palette: number,
    prompt?: string,
    frames: Frame[],
    start_frame_index: number,
    ask_for_frames: number,
};
export type BroadcastMsg = {
    kind: "choose_palettes_and_ready",
} | {
    kind: "show_prompt_sel",
} | {
    kind: "show_prompt_accepted",
    prompt: string,
} | {
    kind: "show_draw_frame",
    context: ContextFrames,
} | {
    kind: "show_frame_accepted",
} | {
    kind: "review_reveal",
    frameset: FrameSet,
    ready: boolean,
} | {
    kind: "ready_ack",
    value: boolean,
} | {
    kind: "game_over",
};
export type RecieveMessage = {
    kind: "mark_ready",
    value: boolean,
} | {
    kind: "submit_prompt",
    prompt: string,
} | {
    kind: "submit_animation",
    frames: string[],
};

export type FrameSet = {
    palette: number,
    prompt?: string,
    images: Frame[],
};

export type Palette = string[];
export const palettes: Palette[] = [
    ["#776D5A", "#987D7C", "#A09CB0", "#A3B9C9", "#ABDAE1"],
    ["#C287E8", "#E6ADEC", "#EFB9CB", "#EECFD4", "#CFD4C5"],
    ["#1C1C1C", "#DADDD8", "#ECEBE4", "#EEF0F2", "#FAFAFF"],
    ["#56282D", "#544343", "#626D58", "#77966D", "#BDC667"],
    ["#214F4B", "#16C172", "#09E85E", "#2AFC98", "#2DE1FC"],
    ["#FE5D26", "#F2C078", "#C1DBB3", "#7EBC89", "#FAEDCA"],
    ["#353535", "#3C6E71", "#284B63", "#D9D9D9", "#FFFFFF"],
    ["#686868", "#2D5D7B", "#457EAC", "#9191E9", "#C2AFF0"],
];

export type ImgSrlz = {
    undo_strokes: StrokeSrlz[],
    redo_strokes: StrokeSrlz[],
    background_color_index: number,
};
export type StrokeSrlz = {
    points: Vec2[],
    color_index: number,
};

export type Vec2 = [number, number];