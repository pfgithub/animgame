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
    request_uuid?: string, // TODO: for saving in-progress draw
    redraw_every_frame: "REDRAW" | "COPY",
};
export type BroadcastMsg = {
    kind: "choose_palettes_and_ready",
    taken_palettes: number[],
    game_code: string,
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
} | {
    kind: "game_info",
    game_id: GameID,
    player_id: PlayerID,
} | {
    kind: "error",
    message: string,
} | {
    kind: "update_taken_palettes",
    taken: number[],
} | {
    kind: "confirm_your_taken_palette",
    palette: number,
} | {
    kind: "choose_prompt",
    choices: string[],
    choice?: string,
} | {
    kind: "choose_prompt_ack",
    choice: string,
} | {
    kind: "grid_and_guess",
    images: {id: string, palette: number, value: string}[],
    guessed: string[],
    given_up: boolean,
} | {
    kind: "chat_message",
    value: string,
    color: string,
} | {
    kind: "grid_correct_guess",
    image: string,
} | {
    kind: "fullscreen_message",
    text: string,
    game_over: boolean,
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
} | {
    kind: "choose_palette",
    palette: number,
} | {
    kind: "choose_prompt",
    choice: string,
} | {
    kind: "chat_message",
    message: string,
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
    ["#504B3A","#646F58","#7D8570","#AFBE8F","#DDE392"],
    ["#FFAEBC","#A0E7E5","#B4F8C8","#FBE7C6"],
    ["#3d550c","#59981a","#81b622","#ecf87f"],
    ["#f51720","#fa26a0","#f8d210","#2ff3e0"],
    ["#fcb5ac","#b99095","#3d5b59","#b5e5cf"],
    ["#05445e","#189ab4","#75e6da","#d4f1f4"],
    ["#280003","#C2847A","#848586","#BAA898","#EEE0CB"],
    ["#50302F","#B4585C","#C17F70","#B09087","#AEAB69"],
    ["#201716","#8C0D14","#BB4C17","#7E785D","#F9E8C7"],
    ["#0C7BB7","#3DA0A9","#59CDB9","#E26E52","#E9D5AB"],
];

export type ImgSrlz = {
    // plan:
    // - include all previous strokes as bgimg?
    // - draw that in a layer behind?
    // - sure?
    // - we just need to compute bgimg in two places
    
    bgimg?: StrokeSrlz[],
    undo_strokes: StrokeSrlz[],
    redo_strokes: StrokeSrlz[],
    background_color_index: number,
};
export type StrokeSrlz = {
    points: Vec2[],
    color_index: number,
};

export type Vec2 = [number, number];

export type CreateGameResponse = {
    game_id: GameID,
};

export function shuffle<T>(array: T[]) {
    let currentIndex = array.length;
  
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}