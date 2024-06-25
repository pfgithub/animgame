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
    image_guessed_by?: string[],
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

function nth(num: number): string {
    // doesn't work past 20
    return num + (["st", "nd", "rd"][num - 1] ?? "th");
}
function awardPoints(ctx: GameCtxNoPlayer<GameState>, artist: Player, guesser: Player): void {
    // determine which number
    // - for the guesser:
    //   - were they first? second? third? to guess the author's drawing
    // - for the drawer:
    //   - did the guesser guess it first? second? third?

    const guesser_nguess = guesser.guessed_images!.length - 1;
    const drawing_nguess = artist.image_guessed_by!.length - 1;
    const guessing_individual_points_worth = 1000;
    const drawing_total_points_worth = Math.round(guessing_individual_points_worth / ctx.game.players.length);

    const guessing_points = guessing_individual_points_worth + Math.round(guessing_individual_points_worth * (1 - (drawing_nguess / ctx.game.players.length)));
    const artist_points = drawing_total_points_worth + Math.round(drawing_total_points_worth * (1 - (guesser_nguess / ctx.game.players.length)));
    guesser.points += guessing_points;
    artist.points += artist_points;

    ctx.send(ctx.gameid, {kind: "chat_message", color: "darkgreen", value:
        guesser.name+" ("+(guesser_nguess+1)+" / "+(ctx.game.players.length-1)+") "+
        " was the "+nth(drawing_nguess+1)+" person to guess "+
        artist.name+"'s drawing!\n  Points awarded: guesser +"+guessing_points+", artist: "+artist_points});
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
                    redraw_every_frame: "REDRAW",
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
                text: "Score:\n"+[...ctx.game.players].sort((a, b) => b.points - a.points).map(player => {
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
                    ismatch.image_guessed_by ??= [];
                    if(player.guessed_images.indexOf(ismatch.id) === -1 && ismatch.image_guessed_by.indexOf(player.id) === -1) {
                        // ✓!
                        player.guessed_images.push(ismatch.id);
                        ismatch.image_guessed_by.push(player.id);

                        awardPoints(ctx, ismatch, player);
                        ctx.send(player.id, {kind: "grid_correct_guess", image: ismatch.id});
                        checkGridAndGuessOver(ctx);
                    }
                }
            }else{
                ctx.send(ctx.gameid, {kind: "chat_message", color: "black", value: player.name+": "+msg.message});
            }
        }else{
            throw new MsgError("Command not supported: `"+(msg as RecieveMessage).kind+"`");
        }
    },
};