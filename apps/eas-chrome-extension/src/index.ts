import { EAS_BUILD_PAGE_REGEX } from "./utils";
import { easInjector } from "./easInjector";

let currentUrl: string;
let listeningForButton = false;

function main() {
  // Listening for UI changes until the download button is shown
  if (listeningForButton) {
    const didInjectSuccessfully = easInjector();
    listeningForButton = !didInjectSuccessfully;
  }

  // Check if URL changed to the build page
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    if (EAS_BUILD_PAGE_REGEX.test(currentUrl)) {
      listeningForButton = true;
      easInjector();
    }
  }
}

const observer = new MutationObserver(main);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});
