import { join, resolve } from "path";
import { joinGame, onPlayerDisconnected, lookupGame, catchupPlayer, MsgError, markReady, postPrompt, postFrames, saveGame, choosePalette } from "./game";
import type { BroadcastMsg, GameID, PlayerID, RecieveMessage } from "../../shared/shared";

// consider hono so we can run on cloudflare pages?

const BASE_DIR = resolve("../client/public");

type ServeDirCfg = {
    directory: string,
    path: string,
    suffixes?: string[],
};

async function serveFromDir(config: ServeDirCfg) {
    const basePath = join(config.directory, config.path);
    const suffixes = config.suffixes ?? ["", ".html", "index.html"];
    for (const suffix of suffixes) {
        try {
            const pathWithSuffix = resolve(join(basePath, suffix));
            if (!pathWithSuffix.startsWith(BASE_DIR)) {
                continue;
            }
            const file = Bun.file(pathWithSuffix);
            if (await file.exists()) {
                return new Response(Bun.file(pathWithSuffix));
            }
        } catch (err) { }
    }
    return null;
}

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
                if(typeof message !== "string") throw new MsgError("Message was not a string");
                const msg_val = JSON.parse(message) as RecieveMessage;
                if(msg_val.kind === "mark_ready") {
                    markReady(send, ws.data.game_id, ws.data.player_id, msg_val.value);
                }else if(msg_val.kind === "submit_prompt") {
                    postPrompt(send, ws.data.game_id, ws.data.player_id, msg_val.prompt);
                }else if(msg_val.kind === "submit_animation") {
                    postFrames(send, ws.data.game_id, ws.data.player_id, msg_val.frames);
                }else if(msg_val.kind === "choose_palette") {
                    choosePalette(send, ws.data.game_id, ws.data.player_id, msg_val.palette);
                }
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
            ws.subscribe(ws.data.game_id);
            ws.subscribe(ws.data.player_id);
            console.log("connect: "+ws.data.player_id);
            catchupPlayer(send, ws.data.game_id, ws.data.player_id);
            saveGame(ws.data.game_id);
        },
        close(ws, code, reason) {
            ws.unsubscribe(ws.data.game_id);
            ws.unsubscribe(ws.data.player_id);
            console.log("disconnect: "+ws.data.player_id+": `"+reason+"` ("+code+")");
            onPlayerDisconnected(ws.data.game_id, ws.data.player_id);
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

            const game_id = lookupGame(codeparam) ?? (codeparam as GameID);
            console.log("try join game: "+game_id);
            const player_id = joinGame(game_id, nameparam);

            if(!server.upgrade(request, {
                data: {
                    game_id,
                    player_id,
                } satisfies WebsocketData,
            })) {
                onPlayerDisconnected(game_id, player_id);
                return new Response("Upgrade failed", {status: 400});
            }

            return; // upgraded
        }

        if(pathname == "/index.tsx") {
            const buildres = await Bun.build({
                entrypoints: ["../client/src/index.tsx"],
            });
            if(!buildres.success) {
                console.log(buildres.logs);
                return new Response("error", {status: 500});
            }
            const result = buildres.outputs[0];
            return new Response(result, {headers: {'Content-Type': "text/javascript"}});
        }
        console.log("request: "+pathname);
        const staticResponse = await serveFromDir({
            directory: BASE_DIR,
            path: pathname,
        });
        if (staticResponse) return staticResponse;
        return new Response("Not Found", { status: 404 });
    }
});
console.log(""+server.url);