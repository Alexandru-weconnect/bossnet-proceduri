import { pathToFileURL } from "node:url";
import { config } from "./config.js";
import { buildServer } from "./server.js";

export async function start() {
  const app = await buildServer();
  await app.listen({ host: config.host, port: config.port });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await start();
}
