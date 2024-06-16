export class MsgError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

// TODO playtest for these numbers
// & maybe for high player counts, each player only draws one frame
// we need a target length of time & then match these counts to how
// long we want the game to go
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const NUM_PALETTES = 8;

type GamePlayer = {
    id: PlayerID,
    name: string,
    selected_palette?: number, // only one player can select each palette
    ready: boolean,
};

type GameStateEnum = (
    | "ALLOW_JOINING"
    | "CHOOSE_PROMPTS"
    | "DRAW_FRAME"
    | "REVIEW"
);

type Frame = {
    artist: PlayerID,
    value: string,
};
type FrameSet = {
    prompt?: string,
    images: Frame[],
};
type GameState = {
    config: {
        frame_count: number,
    },
    state: GameStateEnum,
    draw_frame_num?: number,
    players: GamePlayer[],
    frames: FrameSet[],
};

const game_id_map = new Map<string, GameID>();
const games = new Map<GameID, GameState>();

export function createGame(): string {
    const gamestr = "ABCD";
    const gameid = crypto.randomUUID() as GameID;
    if(game_id_map.has(gamestr)) throw new Error("CANNOTCREATEGAME");
    if(games.has(gameid)) throw new Error("UUID COLLISION");
    games.set(gameid, {
        config: {
            frame_count: 2,
        },
        state: "ALLOW_JOINING",
        players: [],
        frames: [],
    });
    game_id_map.set(gamestr, gameid);
    return gamestr;
}
export function lookupGame(gamestr: string): null | GameID {
    const gres = game_id_map.get(gamestr);
    if(gres == null) return null;
    return gres;
}
export function joinGame(gameid: GameID, player_name: string): PlayerID {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "ALLOW_JOINING") throw new MsgError("No new players are allowed to join the game.");
    if(game.players.length >= MAX_PLAYERS) throw new MsgError("The game is full.");
    const plid = crypto.randomUUID() as PlayerID;
    game.players.push({
        name: player_name,
        id: plid,
        ready: false,
    });
    // success
    return plid;
}
export function choosePalette(gameid: GameID, playerid: string, palette: number) {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "ALLOW_JOINING") throw new MsgError("You cannot change your palette at this time");
    if((palette |0) !== palette || palette < 0 || palette >= NUM_PALETTES) throw new MsgError("Palette out of range");
    let pl: GamePlayer | null = null;
    for(const player of game.players) {
        if(player.id === playerid) pl = player;
        if(player.selected_palette == palette) throw new MsgError("Someone else already chose that palette");
    }
    if(pl == null) throw new MsgError("You are not in the game");
    pl.selected_palette = palette;
}
export function markReady(gameid: GameID, playerid: string, value: boolean) {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "ALLOW_JOINING") throw new MsgError("You cannot mark ready at this time");
    const pl = game.players.find(pl => pl.id === playerid);
    if(pl == null) throw new MsgError("You are not in the game");
    pl.ready = value;

    if(game.players.length >= MIN_PLAYERS && game.players.every(pl => pl.ready)) {
        // start the game
        startGame(gameid, game);
    }
}
function startGame(gameid: GameID, game: GameState) {
    game.state = "CHOOSE_PROMPTS";
    const used_palettes = new Set<number>();
    for(const player of game.players) {
        if(player.selected_palette != null) {
            used_palettes.add(player.selected_palette);
        }
    }
    for(const player of game.players) {
        // pick a random palette for any indecisive ppl
        if(player.selected_palette == null) {
            // try 10 times, allow duplication if it fails.
            for(let i = 0; i < 10; i++) {
                const pval = (Math.random() * NUM_PALETTES) |0;
                player.selected_palette = pval;
                if(!used_palettes.has(pval)) break;
            }
        }
    }
    game.frames = new Array(game.players.length).fill(0).map((): FrameSet => {
        return {images: []};
    });

    broadcast(gameid, {kind: "show_prompt_sel"});
}
export function postPrompt(gameid: GameID, playerid: PlayerID, prompt: string) {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "CHOOSE_PROMPTS") throw new MsgError("You cannot choose a prompt at this time.");
    const playerindex = game.players.findIndex(p => p.id == playerid);
    if(playerindex === -1) throw new MsgError("Player not found");
    const frameindex = modframes(game, playerindex);
    game.frames[frameindex].prompt = prompt;
    if(game.frames.every(frame => frame.prompt != null)) {
        startDrawRound(gameid, game, 1);
    }
}
function startDrawRound(gameid: GameID, game: GameState, num: number) {
    if(num > game.players.length - 1) {
        startReview(gameid, game);
        return;
    }
    game.state = "DRAW_FRAME";
    game.draw_frame_num = num;
    broadcast(gameid, {kind: "show_draw_frame"});
}
function startReview(gameid: GameID, game: GameState) {
    game.state = "REVIEW";
    broadcast(gameid, {kind: "show_review"});
}
type ContextFrames = {
    prompt?: string,
    frames: Frame[],
};
export function getContextFrames(gameid: GameID, playerid: PlayerID, frames: string[]): ContextFrames {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "DRAW_FRAME") throw new MsgError("You cannot choose a prompt at this time.");
    if(frames.length !== game.config.frame_count) throw new MsgError("The wrong number of frames were submitted.");
    const playerindex = game.players.findIndex(p => p.id == playerid);
    if(playerindex === -1) throw new MsgError("Player not found");
    const frameindex = modframes(game, playerindex);
    const fset = game.frames[frameindex];
    if(fset.images.length !== ((game.draw_frame_num ?? 0) - 1) * game.config.frame_count) {
        throw new MsgError("Frames were already submitted");
    }
    const resframes = fset.images.slice(fset.images.length - game.config.frame_count);
    if(resframes.length === 0) return {
        prompt: fset.prompt,
        frames: [],
    };
    return {frames: resframes};
}
export function postFrames(gameid: GameID, playerid: PlayerID, frames: string[]) {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "DRAW_FRAME") throw new MsgError("You cannot choose a prompt at this time.");
    if(frames.length !== game.config.frame_count) throw new MsgError("The wrong number of frames were submitted.");
    const playerindex = game.players.findIndex(p => p.id == playerid);
    if(playerindex === -1) throw new MsgError("Player not found");
    const frameindex = modframes(game, playerindex);
    const fset = game.frames[frameindex];
    const target_frame_count = (game.draw_frame_num ?? 0) * game.config.frame_count;
    if(fset.images.length !== target_frame_count - game.config.frame_count) {
        throw new MsgError("Frames were already submitted");
    }
    for(const frame of frames) {
        fset.images.push({
            artist: playerid,
            value: frame,
        });
    }
    if(fset.images.length !== target_frame_count) {
        throw new Error("Assertion failure");
    }
    if(game.frames.every(frame => frame.images.length === target_frame_count)) {
        startDrawRound(gameid, game, game.draw_frame_num! + 1);
    }
}


function modframes(game: GameState, playerindex: number): number {
    return (playerindex + (game.draw_frame_num ?? 0)) % game.frames.length;
}

// if we implement this genericly, we can literally just tell the client
// "show this scene for this amount of time" and have all logic on the
// server. like the server asks the client "draw a frame" and the client
// returns it.
// so we would dispatch "show:DrawFrame" (count: ..., prompt: ..., context: ...)
// and then the client would dispatch "complete:DrawFrame" (...)
// or if the timer is up, we dispatch "DrawFrame:completeNow"
// that shouldn't be too big a difference from what we have so far
type BroadcastMsg = {
    kind: "show_prompt_sel",
} | {
    kind: "show_draw_frame",
} | {
    kind: "show_review",
};
export function broadcast(gameid: GameID, msg: BroadcastMsg) {

}

type GameID = string & {__is_game_id: true};
type PlayerID = string & {__is_player_id: true};

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

// if we didn't have palettes, we could have you guess
// out of the last frames which one is yours