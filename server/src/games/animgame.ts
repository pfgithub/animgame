import { palettes, type ContextFrames, type FrameSet, type GameID, type PlayerID, type RecieveMessage } from "../../../shared/shared.ts";
import { MsgError, baseChoosePalette, baseMarkReady, type GameInterface, type SendCB } from "../gamelib.ts";

// TODO playtest for these numbers
// & maybe for high player counts, each player only draws one frame
// we need a target length of time & then match these counts to how
// long we want the game to go
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;

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
    | "REVIEW_GUESS"
    | "REVIEW_REVEAL"
);

type GameState = {
    config: {
        frame_count: number,
        draw_your_own_prompt: "NO" | "LAST" | "FIRST",
    },
    state: GameStateEnum,
    draw_frame_num?: number,
    review_frame_num?: number,
    players: GamePlayer[],
    frames: FrameSet[],
};


export function createGame(): GameState {
    return {
        config: {
            frame_count: 2,
            draw_your_own_prompt: "LAST",
        },
        state: "ALLOW_JOINING",
        players: [],
        frames: [],
    };
}
export function joinGame(game: GameState, gameid: GameID, player_name: string): PlayerID {
    if(game.players.some(pl => pl.id === player_name)) return player_name as PlayerID;
    if(game.state !== "ALLOW_JOINING") throw new MsgError("No new players are allowed to join the game.");
    if(game.players.length >= MAX_PLAYERS) throw new MsgError("The game is full.");
    if(game.players.some(pl => pl.name === player_name)) throw new MsgError("Player name already taken.");
    const plid = crypto.randomUUID() as PlayerID;
    game.players.push({
        name: player_name,
        id: plid,
        ready: false,
    });
    // success
    return plid;
}
export function onPlayerDisconnected(game: GameState, gameid: GameID, player_id: PlayerID): void {
    if(game.state === "ALLOW_JOINING") {
        // remove the player
        game.players = game.players.filter(pl => pl.id !== player_id);
    }else{
        // mark the player as disconnected
        const player = game.players.find(pl => pl.id === player_id);
        if(player == null) return; // nothing to do
    }
}
export function choosePalette(game: GameState, send: SendCB, gameid: GameID, playerid: PlayerID, palette: number) {
    if(game.state !== "ALLOW_JOINING") throw new MsgError("You cannot change your palette at this time");
    baseChoosePalette({send, gameid, game, playerid}, palette);
}
export function markReady(game: GameState, send: SendCB, gameid: GameID, playerid: PlayerID, value: boolean) {
    if(baseMarkReady({send, gameid, game, playerid}, value)) {
        if(game.state === "ALLOW_JOINING") {
            if(game.players.length >= MIN_PLAYERS) {
                // start the game
                startGame(send, gameid, game);
            }
        }else if(game.state === "REVIEW_REVEAL") {
            reviewNext(send, gameid, game);
        }
    }
}
function shuffle<T>(array: T[]) {
    let currentIndex = array.length;
  
    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
}
function startGame(send: SendCB, gameid: GameID, game: GameState) {
    // shuffle players
    shuffle(game.players);

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
                const pval = (Math.random() * palettes.length) |0;
                player.selected_palette = pval;
                if(!used_palettes.has(pval)) break;
            }
        }
    }
    game.frames = new Array(game.players.length).fill(0).map((_, i): FrameSet => {
        return {palette: game.players[i].selected_palette!, images: []};
    });

    catchupAll(game, send, gameid);
}
export function postPrompt(game: GameState, send: SendCB, gameid: GameID, playerid: PlayerID, prompt: string) {
    if(game.state !== "CHOOSE_PROMPTS") throw new MsgError("You cannot choose a prompt at this time.");
    const playerindex = game.players.findIndex(p => p.id == playerid);
    if(playerindex === -1) throw new MsgError("Player not found");
    const frameindex = modframes(game, playerindex);
    game.frames[frameindex].prompt = prompt;
    send(playerid, {kind: "show_prompt_accepted", prompt});
    if(game.frames.every(frame => frame.prompt != null)) {
        startDrawRound(send, gameid, game, 1);
    }
}
function startDrawRound(send: SendCB, gameid: GameID, game: GameState, num: number) {
    if(num > game.players.length - (game.config.draw_your_own_prompt === "NO" ? 1 : 0)) {
        startReview(send, gameid, game);
        return;
    }
    game.state = "DRAW_FRAME";
    game.draw_frame_num = num;
    catchupAll(game, send, gameid);
}
function startReview(send: SendCB, gameid: GameID, game: GameState) {
    reviewNext(send, gameid, game);
}
function reviewNext(send: SendCB, gameid: GameID, game: GameState) {
    for(const player of game.players) player.ready = false;
    game.state = "REVIEW_REVEAL";
    if(game.review_frame_num == null) {
        game.review_frame_num = 0;
    }else{
        game.review_frame_num += 1;
    }
    if(game.review_frame_num >= game.frames.length) {
        // end
        endGame(send, gameid);
        return;
    }
    catchupAll(game, send, gameid);
}
export function endGame(send: SendCB, gameid: GameID) {
    send(gameid, {kind: "game_over"});
}
export function getContextFrames(game: GameState, gameid: GameID, playerid: PlayerID): ContextFrames {
    if(game.state !== "DRAW_FRAME") throw new MsgError("You cannot choose a prompt at this time.");
    const playerindex = game.players.findIndex(p => p.id == playerid);
    if(playerindex === -1) throw new MsgError("Player not found");
    const frameindex = modframes(game, playerindex);
    const fset = game.frames[frameindex];
    if(fset.images.length !== ((game.draw_frame_num ?? 0) - 1) * game.config.frame_count) {
        throw new MsgError("Frames were already submitted");
    }
    const resframes = fset.images.slice(fset.images.length - game.config.frame_count);
    const owner = game.players[frameindex]!;
    return {
        palette: owner.selected_palette!,
        start_frame_index: fset.images.length - resframes.length,
        prompt: resframes.length === 0 || owner.id === playerid ? fset.prompt : undefined,
        frames: resframes,
        ask_for_frames: game.config.frame_count,
    };
}
export function postFrames(game: GameState, send: SendCB, gameid: GameID, playerid: PlayerID, frames: string[]) {
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
    send(playerid, {kind: "show_frame_accepted"});
    if(game.frames.every(frame => frame.images.length === target_frame_count)) {
        startDrawRound(send, gameid, game, game.draw_frame_num! + 1);
    }
}

export function catchupAll(game: GameState, send: SendCB, gameid: GameID) {
    for(const player of game.players) catchupPlayer(game, send, gameid, player.id);
}
export function catchupPlayer(game: GameState, send: SendCB, gameid: GameID, playerid: PlayerID) {
    const pl = game.players.find(pl => pl.id === playerid);
    if(pl == null) throw new MsgError("You are not in the game");

    if(game.state !== "ALLOW_JOINING") {
        send(playerid, {kind: "game_info",
            game_id: gameid,
            player_id: playerid,
        });
    }

    if(game.state === "ALLOW_JOINING") {
        send(pl.id, {kind: "choose_palettes_and_ready", taken_palettes: game.players.filter(p => p.selected_palette != null).map(p => p.selected_palette!)});
    }else if(game.state === "CHOOSE_PROMPTS") {
        send(pl.id, {kind: "show_prompt_sel"});
    }else if(game.state === "DRAW_FRAME") {
        // TODO: check if the client has already drawn the frames
        send(pl.id, {kind: "show_draw_frame", context: getContextFrames(game, gameid, playerid)});
        // the client will ask to getContextFrames()
    }else if(game.state === "REVIEW_GUESS") {
        throw new Error("TODO impl review_guess");
    }else if(game.state === "REVIEW_REVEAL") {
        const frames = game.frames[game.review_frame_num!];
        send(pl.id, {
            kind: "review_reveal",
            frameset: frames,
            ready: pl.ready,
        });
    }else assertNever(game.state);
}
function assertNever(v: never): never {
    throw new Error("assertion failed");
}
function assert(v: boolean): void {
    if(!v) throw new Error("assertion failed");
}

function modframes(game: GameState, playerindex: number): number {
    return (playerindex + ((game.draw_frame_num ?? 0) -+ (game.config.draw_your_own_prompt === "FIRST"))) % game.frames.length;
}

export type Ctx = {
    game: GameID,
    send: SendCB,
};

export const animgame_interface: GameInterface<GameState> = {
    create() {
        return createGame();
    },
    join(game_id, game, player_name) {
        return joinGame(game, game_id, player_name);
    },
    catchup(ctx) {
        catchupPlayer(ctx.game, ctx.send, ctx.gameid, ctx.playerid);
    },
    onDisconnect(ctx) {
        onPlayerDisconnected(ctx.game, ctx.gameid, ctx.playerid);
    },
    onMessage(ctx, msg) {
        if(msg.kind === "mark_ready") {
            markReady(ctx.game, ctx.send, ctx.gameid, ctx.playerid, msg.value);
        }else if(msg.kind === "submit_prompt") {
            postPrompt(ctx.game, ctx.send, ctx.gameid, ctx.playerid, msg.prompt);
        }else if(msg.kind === "submit_animation") {
            postFrames(ctx.game, ctx.send, ctx.gameid, ctx.playerid, msg.frames);
        }else if(msg.kind === "choose_palette") {
            choosePalette(ctx.game, ctx.send, ctx.gameid, ctx.playerid, msg.palette);
        }else{
            throw new MsgError("Command not supported: `"+(msg as RecieveMessage).kind+"`");
        }
    },
};

// if we implement this genericly, we can literally just tell the client
// "show this scene for this amount of time" and have all logic on the
// server. like the server asks the client "draw a frame" and the client
// returns it.
// so we would dispatch "show:DrawFrame" (count: ..., prompt: ..., context: ...)
// and then the client would dispatch "complete:DrawFrame" (...)
// or if the timer is up, we dispatch "DrawFrame:completeNow"
// that shouldn't be too big a difference from what we have so far
//
// if we want, we could even have one client be the game manager
// the person who makes the game gets the powers to handle the game

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

//
// #REVIEW#
//
// let's show the last frame of the anim
// then you guess which prompt it was
// then play the anim and have 'next'
//    'next' is like 'ready' - once everyone
//    presses it it goes next.