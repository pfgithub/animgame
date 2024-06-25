import { join, resolve } from "path";
import type { BroadcastMsg, GameID, PlayerID, RecieveMessage } from "../../shared/shared";
import { MsgError, anyinterface, type AnyGameInterface, type AnyGameState, type GameInterface } from "./gamelib";
import { animgame_interface } from "./games/animgame";
import { drawgrid_interface } from "./games/drawgrid";
import {readFileSync} from "fs";

// consider hono so we can run on cloudflare pages?

type GameData = {
    state: AnyGameState,
    proto: AnyGameInterface,
};
function saveGame(gameid: GameID): void {
    const game = lookupGameFromID(gameid);
    Bun.write("saved-games/"+gameid+".json", JSON.stringify(game.state), {createPath: true});
}

const validlet = "ABCDEFGHJKMNPQRTUVWXYZ2346789"
function toletBiased(a: number): string {
    return validlet[a % validlet.length];
}
function createGame(proto: GameInterface<AnyGameState>, force_code?: string, force_id?: string) {
    const gameid = (force_id != null ? force_id : crypto.randomUUID()) as GameID;
    if(games.has(gameid)) throw new Error("UUID COLLISION");
    const rba = new Uint8Array(5);
    crypto.getRandomValues(rba);
    const gamestr = force_code ?? [...rba].map(toletBiased).join("");
    if(game_id_map.has(gamestr)) throw new MsgError("Failed to create game");
    games.set(gameid, {
        state: force_id != null ? JSON.parse(readFileSync("saved-games/"+force_id+".json", "utf-8")) : proto.create(gamestr),
        proto: proto,
    });
    game_id_map.set(gamestr, gameid);
    return gamestr;
}
const game_id_map = new Map<string, GameID>();
const games = new Map<GameID, GameData>();
console.log("Animgame Code: "+createGame(anyinterface(animgame_interface), "ABCD", process.env.ANIMGAME_LOAD ?? undefined));
console.log("Drawgrid Code: "+createGame(anyinterface(drawgrid_interface), "DRGR", process.env.DRAWGRID_LOAD ?? undefined));

export function lookupGameFromCode(gamestr: string): null | GameID {
    const gres = game_id_map.get(gamestr.toUpperCase());
    if(gres == null) return null;
    return gres;
}
function lookupGameFromID(gameid: GameID): GameData {
    const gres = games.get(gameid);
    if(gres == null) throw new MsgError("Game not found");
    return gres;
}

const CLIENT_DIR = resolve("../client");
const BASE_DIR = resolve("../client/public");

type ServeDirCfg = {
    directory: string,
    path: string,
    suffixes?: string[],
};

type WebsocketData = {
    game_id: GameID,
    player_id: PlayerID,
};

function send(channel: GameID | PlayerID, message: BroadcastMsg): void {
    // we should do ws.close() on game_end, but there's no function to close
    // all subscribers to a channel
    server.publish(channel, JSON.stringify(message));
}
const server = Bun.serve<WebsocketData>({
    port: 2390,
    websocket: {
        maxPayloadLength: 1024 * 1024 * 32, // 32MB
        message(ws, message) {
            try {
                const game = lookupGameFromID(ws.data.game_id);
                if(typeof message !== "string") throw new MsgError("Message was not a string");
                const msg_val = JSON.parse(message) as RecieveMessage;
                game.proto.onMessage({
                    send,
                    gameid: ws.data.game_id,
                    game: game.state,
                    playerid: ws.data.player_id,
                }, msg_val);
                saveGame(ws.data.game_id);
            }catch(e) {
                if(e instanceof MsgError) {
                    send(ws.data.player_id, {kind: "error", message: e.message});
                }else{
                    throw e;
                }
            }
        },
        open(ws) {
            try {
                const game = lookupGameFromID(ws.data.game_id);
                ws.subscribe(ws.data.game_id);
                ws.subscribe(ws.data.player_id);
                console.log("connect: "+ws.data.player_id);
                send(ws.data.player_id, {kind: "game_info",
                    game_id: ws.data.game_id,
                    player_id: ws.data.player_id,
                });
                game.proto.catchup({
                    send,
                    gameid: ws.data.game_id,
                    game: game.state,
                    playerid: ws.data.player_id,
                });
                saveGame(ws.data.game_id);
            }catch(e) {
                if(e instanceof MsgError) {
                    send(ws.data.player_id, {kind: "error", message: e.message});
                }else{
                    throw e;
                }
            }
        },
        close(ws, code, reason) {
            const game = lookupGameFromID(ws.data.game_id);
            ws.unsubscribe(ws.data.game_id);
            ws.unsubscribe(ws.data.player_id);
            console.log("disconnect: "+ws.data.player_id+": `"+reason+"` ("+code+")");
            game.proto.onDisconnect({
                send,
                gameid: ws.data.game_id,
                game: game.state,
                playerid: ws.data.player_id,
            });
            saveGame(ws.data.game_id);
        },
        drain(ws) {
            // client is ready for more data
        },
    },
    async fetch(request) {
        const { pathname, searchParams } = new URL(request.url);

        if(pathname === "/websocket") {
            const codeparam = searchParams.get("code");
            const nameparam = searchParams.get("name");
            if(codeparam == null || nameparam == null) {
                return new Response("Missing codeparam | nameparam", {status: 404});
            }

            const game_id = lookupGameFromCode(codeparam) ?? (codeparam as GameID);
            console.log("try join game: "+game_id+" player "+nameparam);
            const game = lookupGameFromID(game_id);
            const player_id = game.proto.join(game_id, game.state, nameparam);

            if(!server.upgrade(request, {
                data: {
                    game_id,
                    player_id,
                } satisfies WebsocketData,
            })) {
                game.proto.onDisconnect({
                    send,
                    gameid: game_id,
                    game: game.state,
                    playerid: player_id,
                });
                return new Response("Upgrade failed", {status: 400});
            }

            return; // upgraded
        }

        if(pathname == "/index.tsx") {
            const buildres = await Bun.build({
                entrypoints: [CLIENT_DIR+"/src/index.tsx"],
                target: "browser",
            });
            if(!buildres.success) {
                console.log(buildres.logs);
                return new Response("error", {status: 500});
            }
            const result = buildres.outputs[0];
            return new Response(result, {headers: {'Content-Type': "text/javascript"}});
        }
        if(pathname.startsWith("/game/")) {
            const gameid = pathname.substring(6).toLowerCase();
            if(gameid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
                // valid
                console.log("valid game id: "+gameid);
                const fileres = Bun.file("./important-saved-games/"+gameid+".json");
                const htmlcont = await Bun.file(CLIENT_DIR+"/src/index.html").text();
                const filecont = await fileres.json();
                // rather than passing filecont directly, maybe we extract out the info we want to give and send just that?
                return new Response(
                    htmlcont.replace("<!-- GAMECONT -->", "<script>filecont="+JSON.stringify(filecont)+"</script>"),
                    {headers: {'Content-Type': "text/html"}},
                );
            }
            return new Response("Not Found", { status: 404 });
        }
        if(pathname === "/") return new Response(Bun.file(CLIENT_DIR+"/src/index.html"));
        console.log("request: "+pathname);
        return new Response("Not Found", { status: 404 });
    }
});
console.log(""+server.url);