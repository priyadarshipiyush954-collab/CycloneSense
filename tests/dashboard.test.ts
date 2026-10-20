import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("dashboard keeps its real source-backed sections and map loading states", async () => {
  const app = await read("../src/App.tsx");
  assert.match(app, /LiveMap/);
  assert.match(app, /NASA GIBS/);
  assert.match(app, /GDACS/);
  assert.match(app, /tileState === "loading"/);
  assert.match(app, /tileState === "missing"/);
  assert.match(app, /https:\/\/mausam\.imd\.gov\.in\//);
});

test("map implementation provides recovery, load and error feedback", async () => {
  const map = await read("../src/LiveMap.tsx");
  assert.match(map, /onTileState\("loading"\)/);
  assert.match(map, /onTileState\("ready"\)/);
  assert.match(map, /onTileState\("missing"\)/);
  assert.match(map, /invalidateSize/);
  assert.match(map, /flyTo/);
});
