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

const game_id_map = new Map<string, GameID>();
const games = new Map<GameID, GameState>();

export function createGame(): string {
    const gamestr = "ABCD";
    const gameid = crypto.randomUUID() as GameID;
    if(game_id_map.has(gamestr)) throw new Error("CANNOTCREATEGAME");
    if(games.has(gameid)) throw new Error("UUID COLLISION");
    games.set(gameid, {
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
    let pl: GamePlayer | null = null;
    for(const player of game.players) {
        if(player.id === playerid) pl = player;
        if(player.selected_palette == palette) throw new MsgError("Someone else already chose that palette");
    }
    if(pl == null) throw new MsgError("You are not in the game");
    pl.selected_palette = palette;
}
export function markReady(gameid: GameID, playerid: string) {
    const game = games.get(gameid);
    if(game == null) throw new MsgError("Game not found");
    if(game.state !== "ALLOW_JOINING") throw new MsgError("You cannot mark ready at this time");
    const pl = game.players.find(pl => pl.id === playerid);
    if(pl == null) throw new MsgError("You are not in the game");
    pl.ready = true;

    if(game.players.every(pl => pl.ready)) {
        // start the game
        throw new MsgError("TODO: start the game.");
    }
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