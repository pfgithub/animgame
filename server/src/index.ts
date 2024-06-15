import { join, resolve } from "path";

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

const server = Bun.serve({
    port: 2390,
    async fetch(request) {
        const { pathname } = new URL(request.url);
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