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

import type { PlayerID, RecieveMessage } from "../../../shared/shared";
import { MsgError, baseChoosePalette, baseMarkReady, type GameInterface } from "../gamelib";

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
    prompt?: string,
    drawing?: string,
    points: number,
    ready: boolean,
};
type GameState = {
    config: {
        word_list: string[],
    },
    state: GameStateEnum,
    players: Player[],
};


const default_word_list = ["apple", "pear", "bananna"];

export const drawgrid_interface: GameInterface<GameState> = {
    create(): GameState {
        return {
            config: {word_list: default_word_list},
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
        }else throw new MsgError("TODO impl catchup for state: "+ctx.game.state);
    },
    onDisconnect(ctx) {
        throw new MsgError("TODO impl disconnect");
    },
    onMessage(ctx, msg) {
        if(msg.kind === "choose_palette") {
            if(ctx.game.state !== "JOIN_AND_PALETTE") throw new MsgError("You cannot change your palette at this time");
            baseChoosePalette(ctx, msg.palette);
        }else if(msg.kind === "mark_ready") {
            if(baseMarkReady(ctx, msg.value)) {
                if(ctx.game.state === "JOIN_AND_PALETTE") {
                    if(ctx.game.players.length >= MIN_PLAYERS) {
                        throw new MsgError("TODO start the game");
                    }
                }
            }
        }else{
            throw new MsgError("Command not supported: `"+(msg as RecieveMessage).kind+"`");
        }
    },
};