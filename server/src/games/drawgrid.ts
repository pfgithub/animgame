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

import { shuffle, type PlayerID, type RecieveMessage } from "../../../shared/shared";
import { MsgError, baseChoosePalette, baseFillPalettes, baseMarkReady, baseResetReady, type GameCtx, type GameCtxNoPlayer, type GameInterface } from "../gamelib";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;

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
    id: PlayerID,
    name: string,
    selected_palette?: number,
    prompt_choices?: string[],
    prompt?: string,
    image?: string,
    guessed_images?: string[],
    points: number,
    ready: boolean,
};
type GameState = {
    config: {
        word_choices: number,
        guessing_min_time_ms: number,
        guessing_max_time_ms: number,
    },
    state: GameStateEnum,
    players: Player[],
    guess_start_time_ms?: number,
};


const default_word_list = (await Bun.file("data/drawgrid_words.txt").text()).split("\n").map(l => l.trim()).filter(l => l);

function startGame(ctx: GameCtxNoPlayer<GameState>): void {
    shuffle(ctx.game.players);
    baseFillPalettes(ctx.game);
    ctx.game.state = "CHOOSE_PROMPT";
    const used_words = new Set<string>();
    for(const player of ctx.game.players) {
        const res_words: string[] = [];
        let i = 0;
        while(res_words.length < ctx.game.config.word_choices) {
            i += 1;

            const random_word = default_word_list[Math.random() * default_word_list.length |0];
            if(used_words.has(random_word) && i < 100) continue;
            used_words.add(random_word);
            res_words.push(random_word);
        }
        player.prompt_choices = res_words;
    }
    catchupAll(ctx);
}
function startDrawPhase(ctx: GameCtxNoPlayer<GameState>): void {
    ctx.game.state = "DRAW";
    catchupAll(ctx);
}
function startGuessPhase(ctx: GameCtxNoPlayer<GameState>): void {
    ctx.game.state = "GRID_AND_GUESS";
    ctx.game.guess_start_time_ms = Date.now();
    baseResetReady(ctx.game);
    catchupAll(ctx);
}
function catchupAll(ctx: GameCtxNoPlayer<GameState>): void {
    for(const player of ctx.game.players) {
        drawgrid_interface.catchup({...ctx, playerid: player.id});
    }
}
function checkGridAndGuessOver(ctx: GameCtxNoPlayer<GameState>): void {
    if(ctx.game.players.every(pl => pl.guessed_images?.length === ctx.game.players.length - 1 || pl.ready)) {
        ctx.game.state = "REVEAL_SCORES";
        catchupAll(ctx);
    }
}
function rescale(t: number, prev_min: number, prev_max: number, next_min: number, next_max: number): number {
    return ((t - prev_min) / (prev_max - prev_min)) * (next_min - next_max) + next_min;
}

/// 2000 points for guessing within guessing_min_time_ms
/// 500 points for guessing at more than guessing_max_time_ms
/// scaled in the middle
/// 2000 / players_count points for someone guessing your drawing correctly
function awardPoints(game: GameState, drawer: Player, guesser: Player): void {
    const time_it_took = Date.now() - game.guess_start_time_ms!;

    drawer.points += Math.round(2000 / game.players.length);
    // TODO: instead of this, score based on if you got it first, second, third, ...
    guesser.points += Math.max(500, Math.min(2000, Math.round(rescale(
        time_it_took,
        game.config.guessing_min_time_ms,
        game.config.guessing_max_time_ms,
        2000,
        500,
        // these are backwards. TODO: figure it out?
    ))));
}

export const drawgrid_interface: GameInterface<GameState> = {
    create(): GameState {
        return {
            config: {
                word_choices: 3,
                guessing_min_time_ms: 10 * 1000,
                guessing_max_time_ms: 2 * 60 * 1000,
            },
            state: "JOIN_AND_PALETTE",
            players: [],
        };
    },
    join(game_id, game, player_name) {
        if(game.players.some(pl => pl.id === player_name)) return player_name as PlayerID;
        if(game.state !== "JOIN_AND_PALETTE") throw new MsgError("No new players are allowed to join the game.");
        if(game.players.length >= MAX_PLAYERS) throw new MsgError("The game is full.");
        if(game.players.some(pl => pl.name === player_name)) throw new MsgError("Player name already taken.");
        const plid = crypto.randomUUID() as PlayerID;
        game.players.push({
            name: player_name,
            id: plid,
            points: 0,
            ready: false,
        });
        // success
        return plid;
    },
    catchup(ctx) {
        if(ctx.game.state === "JOIN_AND_PALETTE") {
            ctx.send(ctx.playerid, {kind: "choose_palettes_and_ready", taken_palettes: ctx.game.players.filter(pl => pl.selected_palette != null).map(pl => pl.selected_palette!)});
        }else if(ctx.game.state === "CHOOSE_PROMPT") {
            const player = ctx.game.players.find(pl => pl.id === ctx.playerid);
            if(player == null) throw new MsgError("Player not found");
            ctx.send(ctx.playerid, {kind: "choose_prompt", choices: player.prompt_choices!, choice: player.prompt});
        }else if(ctx.game.state === "DRAW") {
            const player = ctx.game.players.find(pl => pl.id === ctx.playerid);
            if(player == null) throw new MsgError("Player not found");
            if(player.image != null) {
                ctx.send(ctx.playerid, {kind: "show_frame_accepted"});
            }else{
                ctx.send(ctx.playerid, {kind: "show_draw_frame", context: {
                    start_frame_index: 0,
                    palette: player.selected_palette!,
                    frames: [],
                    ask_for_frames: 1,
                    prompt: player.prompt!,
                }});
            }
        }else if(ctx.game.state === "GRID_AND_GUESS") {
            const player = ctx.game.players.find(pl => pl.id === ctx.playerid);
            if(player == null) throw new MsgError("Player not found");
            ctx.send(ctx.playerid, {
                kind: "grid_and_guess",
                guessed: player.guessed_images ?? [],
                given_up: player.ready,
                images: ctx.game.players.filter(p => p.id !== player.id).map(p => {
                    return {
                        id: p.id,
                        palette: p.selected_palette!,
                        value: p.image!,
                    };
                }),
            });
        }else if(ctx.game.state === "REVEAL_SCORES") {
            ctx.send(ctx.playerid, {
                kind: "fullscreen_message",
                text: "Score:\n"+ctx.game.players.sort((a, b) => a.points - b.points).map(player => {
                    return player.name + ": " + player.points;
                }).join("\n"),
                game_over: true,
            });
        }else throw new MsgError("TODO impl catchup for state: "+ctx.game.state);
    },
    onDisconnect(ctx) {
        if(ctx.game.state === "JOIN_AND_PALETTE") {
            // remove the player
            ctx.game.players = ctx.game.players.filter(pl => pl.id !== ctx.playerid);
        }
    },
    onMessage(ctx, msg) {
        if(msg.kind === "choose_palette") {
            if(ctx.game.state !== "JOIN_AND_PALETTE") throw new MsgError("You cannot change your palette at this time");
            baseChoosePalette(ctx, msg.palette);
        }else if(msg.kind === "mark_ready") {
            if(baseMarkReady(ctx, msg.value)) {
                if(ctx.game.state === "JOIN_AND_PALETTE") {
                    if(ctx.game.players.length >= MIN_PLAYERS) {
                        startGame(ctx);
                    }
                }
            }
            if(ctx.game.state === "GRID_AND_GUESS") checkGridAndGuessOver(ctx);
        }else if(msg.kind === "choose_prompt") {
            if(ctx.game.state !== "CHOOSE_PROMPT") throw new MsgError("You cannot choose your prompt at this time.");
            const player = ctx.game.players.find(pl => pl.id === ctx.playerid);
            if(player == null) throw new MsgError("Player not found");
            if(!player.prompt_choices!.includes(msg.choice)) throw new MsgError("Prompt not found");
            player.prompt = msg.choice;

            ctx.send(ctx.playerid, {kind: "choose_prompt_ack", choice: player.prompt});
            if(ctx.game.players.every(player => player.prompt != null)) {
                startDrawPhase(ctx);
            }
        }else if(msg.kind === "submit_animation") {
            if(ctx.game.state !== "DRAW") throw new MsgError("You cannot submit an animation at this time.");
            const player = ctx.game.players.find(pl => pl.id === ctx.playerid);
            if(player == null) throw new MsgError("Player not found");
            if(msg.frames.length !== 1) throw new MsgError("Expected one frame");
            player.image = msg.frames[0]!;

            if(ctx.game.players.every(player => player.image != null)) {
                startGuessPhase(ctx);
            }else{
                drawgrid_interface.catchup(ctx);
            }
        }else if(msg.kind === "chat_message") {
            if(ctx.game.state !== "GRID_AND_GUESS") throw new MsgError("You cannot submit chat messages at this time.");
            const player = ctx.game.players.find(pl => pl.id === ctx.playerid);
            if(player == null) throw new MsgError("Player not found");
            const msgtrimlc = msg.message.trim().toLowerCase();
            const ismatch = ctx.game.players.find(p => p.prompt?.toLowerCase() === msgtrimlc);
            if(ismatch != null) {
                if(ismatch.id !== player.id) {
                    player.guessed_images ??= [];
                    if(player.guessed_images.indexOf(ismatch.id) === -1) {
                        // ✓!
                        player.guessed_images.push(ismatch.id);
                        awardPoints(ctx.game, ismatch, player);
                        ctx.send(player.id, {kind: "grid_correct_guess", image: ismatch.id});
                        checkGridAndGuessOver(ctx);
                    }
                }
            }else{
                ctx.send(ctx.gameid, {kind: "chat_message", value: player.name+": "+msg.message});
            }
        }else{
            throw new MsgError("Command not supported: `"+(msg as RecieveMessage).kind+"`");
        }
    },
};