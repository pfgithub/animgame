// play order:
// - creator sets custom word list if wanted
// - players join and choose a color palette
// - once everyone had readied up, draw time
// - choose your word from a choice of three
//   - no players will get the same words
// - once everyone has chosen, draw your
//   word
// - once everyone has drawn, reveal
//   all the drawings in a grid, their positions
//   are randomized per-player to avoid bias.
// - guess them all as fast as you can.
//   - four minute timer? or have it so when
//     you give up you can press a 'give up'
//     button and once everyone's done that
//     move on
// - keep score. two scores? drawing & guessing?
//   or just one, combined draw/guess
// - show end screen with scores

// this doesn't require much new stuff
// - same palette&ready screen
// - new ChooseFromList screen
// - same draw screen with prompt, but
//   only ask for one frame (and hide the frame
//   bar if only one frame)
// - new DrawGridReveal screen
// - new EndScore screen

type GameStateEnum = (
    | "JOIN_AND_PALETTE"
    | "CHOOSE_PROMPT"
    | "DRAW"
    | "GRID_AND_GUESS"
    | "REVEAL_SCORES"
);
type Player = {
    name: string,
    selected_palette?: number,
    prompt?: string,
    drawing?: string,
    points: number,
};
type GameState = {
    config: {
        word_list: string[],
    },
    state: GameStateEnum,
    players: Player[],
};


