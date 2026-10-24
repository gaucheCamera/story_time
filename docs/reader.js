import { isSceneName } from "./scene.js";

// The reading pause starts after the incoming fade has finished.
export const CHOICE_DELAY_MS = 700;
export const FADE_MS = 220;
export const START_SCENE = "start.md";
const SAVE_KEY = "story-time:scene";

export function createProgress(getStorage, onUnavailable) {
  return {
    read() {
      try {
        const saved = getStorage().getItem(SAVE_KEY);
        return isSceneName(saved) ? saved : START_SCENE;
      } catch {
        onUnavailable();
        return START_SCENE;
      }
    },
    save(name) {
      try {
        getStorage().setItem(SAVE_KEY, name);
      } catch {
        onUnavailable();
      }
    }
  };
}

export function createReader({ load, present, save, setBusy, leave, enter, wait, onError }) {
  let busy = false;
  let hasScene = false;

  return {
    async go(name) {
      if (busy) return false;
      busy = true;
      setBusy(true);
      try {
        // Fetch first: an unavailable passage must leave the current scene and save intact.
        const scene = await load(name);
        if (hasScene) await leave();
        present(scene, hasScene);
        hasScene = true;
        save(scene.id);
        await enter();
        await wait(CHOICE_DELAY_MS);
        return true;
      } catch (error) {
        onError(error, name, hasScene);
        return false;
      } finally {
        busy = false;
        setBusy(false);
      }
    }
  };
}
