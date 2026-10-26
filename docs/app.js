import { parseScene, inlineHtml } from "./scene.js";
import { createReader, createProgress, FADE_MS, START_SCENE } from "./reader.js";

const sceneElement = document.querySelector(".scene");
const passageElement = document.querySelector(".passage");
const titleElement = document.querySelector("#scene-title");
const proseElement = document.querySelector("#prose");
const choicesElement = document.querySelector(".choices");
const noticeElement = document.querySelector("#notice");
const restartButton = document.querySelector(".restart");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let storageUnavailable = false;
let initialLoad = true;
let loadNotice = "";
const progress = createProgress(() => window.localStorage, () => {
  storageUnavailable = true;
  notice();
});

function notice(message = "") {
  noticeElement.textContent = message || (storageUnavailable
    ? "Progress cannot be saved in this browser. Keep this tab open to continue." : "");
  noticeElement.hidden = !noticeElement.textContent;
}

async function fetchScene(name) {
  const response = await fetch(new URL(`./scenes/${name}`, import.meta.url), { cache: "no-cache" });
  if (!response.ok) {
    const error = new Error(`Could not load ${name} (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return { ...parseScene(await response.text()), id: name };
}

async function loadScene(name) {
  try {
    return await fetchScene(name);
  } catch (error) {
    // Only a removed saved file resets progress; a temporary network error remains retryable.
    if (initialLoad && name !== START_SCENE && error.status === 404) {
      const scene = await fetchScene(START_SCENE);
      loadNotice = "Your saved passage is no longer available. The story begins again here.";
      return scene;
    }
    throw error;
  }
}

function addButton(label, target) {
  const button = document.createElement("button");
  button.className = "choice";
  button.type = "button";
  button.disabled = true;
  const text = document.createElement("span");
  text.textContent = label;
  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");
  button.append(text, arrow);
  button.addEventListener("click", () => reader.go(target));
  choicesElement.append(button);
}

function present(scene, moveFocus) {
  initialLoad = false;
  titleElement.textContent = scene.title;
  titleElement.hidden = !scene.title;
  document.title = scene.title ? `${scene.title} · Story Time` : "Story Time";
  proseElement.replaceChildren(...scene.blocks.map(({ type, text }) => {
    const block = document.createElement(type);
    block.innerHTML = inlineHtml(text);
    return block;
  }));
  choicesElement.replaceChildren();
  for (const choice of scene.choices) addButton(choice.label, choice.target);
  if (!scene.choices.length) {
    const ending = document.createElement("p");
    ending.className = "ending";
    ending.textContent = "The end";
    choicesElement.append(ending);
  }
  document.documentElement.style.setProperty("--background", scene.background || "#080909");
  document.documentElement.style.setProperty("--accent", scene.accent || "#d3c4a5");
  document.querySelector('meta[name="theme-color"]').content = scene.background || "#080909";
  notice(loadNotice);
  loadNotice = "";
  window.scrollTo({ top: 0, behavior: "instant" });
  if (moveFocus) {
    const focusTarget = scene.title ? titleElement : passageElement;
    focusTarget.focus({ preventScroll: true });
  }
}

async function fade(from, to) {
  if (!reducedMotion.matches) {
    const animation = sceneElement.animate([{ opacity: from }, { opacity: to }], {
      duration: FADE_MS, easing: "ease-in-out", fill: "forwards"
    });
    await animation.finished;
    sceneElement.style.opacity = String(to);
    animation.cancel();
  } else {
    sceneElement.style.opacity = String(to);
  }
}

const reader = createReader({
  load: loadScene,
  present,
  save: progress.save,
  setBusy(busy) {
    sceneElement.setAttribute("aria-busy", String(busy));
    restartButton.disabled = busy;
    choicesElement.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
  },
  leave: () => fade(1, 0),
  enter: () => fade(0, 1),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onError(error, name, hasScene) {
    console.error(error);
    sceneElement.style.opacity = "1";
    if (!hasScene) {
      titleElement.hidden = false;
      titleElement.textContent = "A pause in the story.";
      proseElement.textContent = "This passage could not be opened. Check your connection and try again.";
      choicesElement.replaceChildren();
      addButton("Try again", name);
    }
    notice("The passage could not be loaded. Your saved place has been kept. Please try again.");
  }
});

// Temporary author testing shortcut; it uses normal navigation and saves only on success.
restartButton.addEventListener("click", () => reader.go(START_SCENE));
reader.go(progress.read());
