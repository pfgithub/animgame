export type GameID = string & {__is_game_id: true};
export type PlayerID = string & {__is_player_id: true};

export type Frame = {
    artist: PlayerID,
    value: string,
};
export type ContextFrames = {
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
    kind: "show_review",
} | {
    kind: "ready_ack",
    value: boolean,
};
export type RecieveMessage = {
    kind: "mark_ready",
    value: boolean,
} | {
    kind: "submit_prompt",
    prompt: string,
};