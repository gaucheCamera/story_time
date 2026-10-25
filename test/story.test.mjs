import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { parseScene, isSceneName, inlineHtml } from "../docs/scene.js";
import { createReader, createProgress, CHOICE_DELAY_MS } from "../docs/reader.js";

test("Obsidian-style CRLF files keep colours, paragraphs, emphasis and choices", () => {
  const scene = parseScene('\uFEFF---\r\nbackground: "#101012"\r\naccent: "#abc"\r\n---\r\n# A window\r\n\r\nOne line\r\nand another.\r\n\r\n> A quiet **voice**.\r\n\r\n## Choices\r\n- [Open it](outside.md)\r\n- [Stay](inside.md)');
  assert.equal(scene.title, "A window");
  assert.equal(scene.background, "#101012");
  assert.equal(scene.accent, "#abc");
  assert.deepEqual(scene.blocks, [
    { type: "p", text: "One line and another." },
    { type: "blockquote", text: "A quiet **voice**." }
  ]);
  assert.deepEqual(scene.choices, [
    { label: "Open it", target: "outside.md" }, { label: "Stay", target: "inside.md" }
  ]);
});

test("one link is a continuation; no choices is an ending", () => {
  assert.deepEqual(parseScene("# Opening\n\n## Choices\n- [Next](next.md)").choices,
    [{ label: "Next", target: "next.md" }]);
  assert.deepEqual(parseScene("# An ending\n\nStill water.").choices, []);
});

test("untitled scenes preserve their first paragraph and work with choices or as endings", () => {
  const scene = parseScene("The first paragraph.\n\nThe second paragraph.\n\n## Choices\n- [Next](next.md)");
  assert.equal(scene.title, "");
  assert.deepEqual(scene.blocks, [
    { type: "p", text: "The first paragraph." },
    { type: "p", text: "The second paragraph." }
  ]);
  assert.deepEqual(scene.choices, [{ label: "Next", target: "next.md" }]);
  assert.deepEqual(parseScene("An ending without a heading.").choices, []);
});

test("untitled scenes still accept colour metadata and formatted prose", () => {
  const scene = parseScene('---\r\nbackground: "#101014"\r\naccent: "#abc"\r\n---\r\n\r\nA **quiet** beginning.\r\n\r\n## An interlude\r\n\r\nMore text.');
  assert.equal(scene.title, "");
  assert.equal(scene.background, "#101014");
  assert.equal(scene.accent, "#abc");
  assert.deepEqual(scene.blocks[0], { type: "p", text: "A **quiet** beginning." });
  assert.deepEqual(scene.blocks[1], { type: "h2", text: "An interlude" });
});

test("authoring mistakes produce helpful errors instead of accidental endings", () => {
  assert.throws(() => parseScene("   "), /Add story text/);
  assert.throws(() => parseScene('---\naccent: "#abc"\n---'), /Add story text/);
  assert.throws(() => parseScene("# Title\n\n## Choices"), /Add a choice/);
  assert.throws(() => parseScene("# Title\n\n## Choices\n- [[next]]"), /Button text/);
  assert.throws(() => parseScene("# Title\n\n## Choices\n- [Next](next.md)\n\nMore prose"), /Button text/);
  assert.throws(() => parseScene("---\naccent: red\n---\n# Title"), /hex colour/);
});

test("links and saved scene names stay inside the scenes folder", () => {
  for (const value of [null, "", "../secret.md", "/start.md", "x/y.md", "https://example.com/a.md", "javascript:alert(1)", "a.md?x=1", "a\\b.md"]) {
    assert.equal(isSceneName(value), false, String(value));
    assert.throws(() => parseScene(`# Title\n\n## Choices\n- [Next](${value})`));
  }
  assert.equal(isSceneName("a-new-scene.md"), true);
});

test("story HTML stays literal while supported Markdown is formatted", () => {
  assert.equal(inlineHtml('<img src=x onerror=alert(1)> & *soft* **strong**'),
    '&lt;img src=x onerror=alert(1)&gt; &amp; <em>soft</em> <strong>strong</strong>');
});

test("every published scene is valid and every choice reaches an existing file", async () => {
  const directory = new URL("../docs/scenes/", import.meta.url);
  const names = (await readdir(directory)).filter((name) => name.endsWith(".md"));
  const scenes = new Map();
  for (const name of names) {
    assert.ok(isSceneName(name), `Use a lowercase-hyphenated.md filename: ${name}`);
    scenes.set(name, parseScene(await readFile(new URL(name, directory), "utf8")));
  }
  assert.ok(scenes.has("start.md"), "The first scene must be start.md");
  for (const [name, scene] of scenes) {
    for (const choice of scene.choices) {
      assert.ok(scenes.has(choice.target), `${name} links to missing scene ${choice.target}`);
    }
  }
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("a new reader resumes the saved decision or ending from shared browser storage", () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const reopen = () => createProgress(() => storage, () => assert.fail("Storage should be available"));
  assert.equal(reopen().read(), "start.md");
  reopen().save("crossing.md");
  assert.equal(reopen().read(), "crossing.md");
  reopen().save("lantern.md");
  assert.equal(reopen().read(), "lantern.md");
  reopen().save("../../outside.md");
  assert.equal(reopen().read(), "start.md");
});

test("denied storage and quota errors do not prevent reading", () => {
  let notices = 0;
  const unavailable = () => { notices++; };
  const denied = createProgress(() => { throw new Error("Storage denied"); }, unavailable);
  assert.equal(denied.read(), "start.md");
  assert.doesNotThrow(() => denied.save("river.md"));
  const full = createProgress(() => ({
    getItem: () => "crossing.md",
    setItem: () => { throw new Error("Quota exceeded"); }
  }), unavailable);
  assert.equal(full.read(), "crossing.md");
  assert.doesNotThrow(() => full.save("river.md"));
  assert.equal(notices, 3);
});

function harness(overrides = {}) {
  const events = [];
  const reader = createReader({
    load: async (id) => ({ id }),
    present: (scene) => events.push(["present", scene.id]),
    save: (name) => events.push(["save", name]),
    setBusy: (busy) => events.push(["busy", busy]),
    leave: async () => {},
    enter: async () => {},
    wait: async () => {},
    onError: (error) => events.push(["error", error.message]),
    ...overrides
  });
  return { reader, events };
}

test("choices stay locked during loading, the incoming fade and the reading pause", async () => {
  const loading = deferred();
  const entering = deferred();
  const entered = deferred();
  const waiting = deferred();
  const waited = deferred();
  const { reader, events } = harness({
    load: () => loading.promise,
    enter: () => { entered.resolve(); return entering.promise; },
    wait: (ms) => { assert.equal(ms, CHOICE_DELAY_MS); waited.resolve(); return waiting.promise; }
  });
  const first = reader.go("start.md");
  assert.equal(await reader.go("crossing.md"), false);
  loading.resolve({ id: "start.md" });
  await entered.promise;
  assert.equal(await reader.go("crossing.md"), false);
  assert.deepEqual(events.at(-1), ["save", "start.md"]);
  entering.resolve();
  await waited.promise;
  assert.equal(await reader.go("crossing.md"), false);
  waiting.resolve();
  assert.equal(await first, true);
  assert.deepEqual(events.at(-1), ["busy", false]);
  assert.equal(events.filter(([event]) => event === "present").length, 1);
});

test("a failed choice preserves the scene and save, and can be retried", async () => {
  let offline = false;
  const { reader, events } = harness({ load: async (id) => {
    if (offline) throw new Error("Offline");
    return { id };
  } });
  await reader.go("crossing.md");
  offline = true;
  assert.equal(await reader.go("lantern.md"), false);
  assert.deepEqual(events.filter(([event]) => event === "save"), [["save", "crossing.md"]]);
  assert.equal(events.filter(([event]) => event === "present").length, 1);
  assert.deepEqual(events.at(-1), ["busy", false]);
  offline = false;
  assert.equal(await reader.go("lantern.md"), true);
  assert.deepEqual(events.filter(([event]) => event === "save").at(-1), ["save", "lantern.md"]);
});

test("every reachable branch loads and saves its destination", async () => {
  const load = async (id) => ({ id, ...parseScene(await readFile(new URL(`../docs/scenes/${id}`, import.meta.url), "utf8")) });
  const pending = ["start.md"];
  const visited = new Set();
  const { reader, events } = harness({ load });
  while (pending.length) {
    const name = pending.pop();
    if (visited.has(name)) continue;
    visited.add(name);
    assert.equal(await reader.go(name), true);
    assert.deepEqual(events.filter(([event]) => event === "save").at(-1), ["save", name]);
    const scene = await load(name);
    pending.push(...scene.choices.map((choice) => choice.target));
  }
});

test("restarting from an ending replaces saved progress only when the opening loads", async () => {
  let saved = "river.md";
  let offline = false;
  const { reader } = harness({
    load: async (id) => {
      if (offline) throw new Error("Offline");
      return { id };
    },
    save: (id) => { saved = id; }
  });
  await reader.go("river.md");
  offline = true;
  assert.equal(await reader.go("start.md"), false);
  assert.equal(saved, "river.md");
  offline = false;
  assert.equal(await reader.go("start.md"), true);
  assert.equal(saved, "start.md");
});
