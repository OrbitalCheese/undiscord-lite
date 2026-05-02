// Userscript entry point. Tampermonkey/Violentmonkey runs this once when Discord
// loads; initUI() injects the panel and FAB. No work happens until the user clicks Delete.
import initUI from './undiscord-ui.js';
initUI();
