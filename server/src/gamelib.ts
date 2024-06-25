import { palettes, type BroadcastMsg, type GameID, type PlayerID, type RecieveMessage } from "../../shared/shared.ts";

export class MsgError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}


export type SendCB = (channel: GameID | PlayerID, message: BroadcastMsg) => void;

type PlayerWithPalette = {
    id: PlayerID,
    selected_palette?: number,
};
type GameWithPlayersWithPalettes = {
    players: PlayerWithPalette[],
};
type PlayerWithReady = {
    id: PlayerID,
    ready: boolean,
};
type GameWithPlayersWithReady = {
    players: PlayerWithReady[],
};

export function baseChoosePalette(ctx: GameCtx<GameWithPlayersWithPalettes>, palette: number): void {
    if((palette |0) !== palette || palette < 0 || palette >= palettes.length) throw new MsgError("Palette out of range");
    let pl: PlayerWithPalette | null = null;
    for(const player of ctx.game.players) {
        if(player.id === ctx.playerid) {
            pl = player;
        }else if(player.selected_palette == palette) throw new MsgError("Someone else already chose that palette");
    }
    if(pl == null) throw new MsgError("You are not in the game");
    pl.selected_palette = palette;
    ctx.send(ctx.gameid, {kind: "update_taken_palettes", taken: ctx.game.players.filter(p => p.selected_palette != null).map(p => p.selected_palette!)});
    ctx.send(ctx.playerid, {kind: "confirm_your_taken_palette", palette});
}
export function baseFillPalettes(game: GameWithPlayersWithPalettes): void {
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
}
/// returns true if all players are ready
export function baseMarkReady(ctx: GameCtx<GameWithPlayersWithReady>, value: boolean): boolean {
    const pl = ctx.game.players.find(pl => pl.id === ctx.playerid);
    if(pl == null) throw new MsgError("You are not in the game");
    pl.ready = value;

    ctx.send(ctx.playerid, {kind: "ready_ack", value});

    if(ctx.game.players.every(pl => pl.ready)) {
        return true;
    }
    return false;
}
export function baseResetReady(game: GameWithPlayersWithReady): void {
    for(const player of game.players) player.ready = false;
}

export type GameCtxNoPlayer<T> = {
    send: SendCB,
    gameid: GameID,
    game: T,
};
export type GameCtx<T> = GameCtxNoPlayer<T> & {
    playerid: PlayerID,
};
export interface GameInterface<T> {
    create(initial_game_code: string): T,
    join(game_id: GameID, game: T, player_name: string): PlayerID,
    catchup(ctx: GameCtx<T>): void,
    onDisconnect(ctx: GameCtx<T>): void,
    onMessage(ctx: GameCtx<T>, message: RecieveMessage): void,
};

export type AnyGameState = "OpaqueGameT";
export type AnyGameInterface = GameInterface<AnyGameState>;
export function anyinterface<T>(a: GameInterface<T>): GameInterface<AnyGameState> {
    return a as unknown as GameInterface<AnyGameState>;
}
