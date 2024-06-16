type GamePlayer = {
    name: string,
    selected_palette?: number, // only one player can select each palette
};

type GameStateEnum = (
    | "ALLOW_JOINING"
    | "CHOOSE_PROMPTS"
    | "DRAW_FRAME"
    | "REVIEW"
);

type Frame = {
    value: string,
};
type FrameSet = {
    prompt?: string,
    images: Frame[],
};
type GameState = {
    state: GameStateEnum,
    players: GamePlayer[],
    frames: FrameSet[],
};

// in ALLOW_JOINING, players are allowed to join
// once a join command is sent, if enough players are in then the game
// starts.
// everyone makes up a prompt
// then, you get a prompt and draw two frames
// then, the next player gets your two frames and draws
//   two more
// the next player gets those two frames and draws too more
//   etc etc
// at the end, we review all the animations