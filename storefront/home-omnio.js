/* Homepage entry point. The forked home.js drove a hero carousel, a perks
   strip and six editorial modules; none of that survives here, so it is not
   loaded at all rather than loaded and overridden. */
import { renderBoard } from "./home-board.js";
import { showCatalogError } from "./app.js";

const root = document.getElementById("omni-home");
if (root) {
  renderBoard(root).catch((error) => {
    console.error("[omnio] homepage failed", error);
    if (typeof showCatalogError === "function") showCatalogError("The catalogue could not be loaded.");
    else root.innerHTML = `<div class="wrap"><p class="cap">The catalogue could not be loaded.</p></div>`;
  });
}
