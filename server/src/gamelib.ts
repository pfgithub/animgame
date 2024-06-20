import {palettes, type BroadcastMsg, type ContextFrames, type Frame, type FrameSet, type GameID, type PlayerID, type RecieveMessage} from "../../shared/shared.ts";
import { MsgError } from "./games/animgame.ts";

export type SendCB = (channel: GameID | PlayerID, message: BroadcastMsg) => void;

type PlayerWithPalette = {
    id: PlayerID,
    selected_palette?: number,
};
type GameWithPlayersWithPalettes = {
    players: PlayerWithPalette[],
};

export function baseChoosePalette(send: SendCB, gameid: GameID, game: GameWithPlayersWithPalettes, playerid: PlayerID, palette: number): void {
    if((palette |0) !== palette || palette < 0 || palette >= palettes.length) throw new MsgError("Palette out of range");
    let pl: PlayerWithPalette | null = null;
    for(const player of game.players) {
        if(player.id === playerid) {
            pl = player;
        }else if(player.selected_palette == palette) throw new MsgError("Someone else already chose that palette");
    }
    if(pl == null) throw new MsgError("You are not in the game");
    pl.selected_palette = palette;
    send(playerid, {kind: "confirm_your_taken_palette", palette});
    send(gameid, {kind: "update_taken_palettes", taken: game.players.filter(p => p.selected_palette != null).map(p => p.selected_palette!)});
}

export type GameCtx<T> = {
    send: SendCB,
    gameid: GameID,
    game: T,
    playerid: PlayerID,
};
export interface GameInterface<T> {
    join(game_id: GameID, game: T, player_name: string): PlayerID,
    catchup(ctx: GameCtx<T>): void,
    onDisconnect(ctx: GameCtx<T>): void,
    onMessage(ctx: GameCtx<T>, message: RecieveMessage): void,
};
