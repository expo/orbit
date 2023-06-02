import { EAS_BUILD_PAGE_REGEX, SNACK_PAGE_REGEX } from "./utils";
import { easInjector } from "./easInjector";
import { snackInjector } from "./snackInjector";

let currentUrl: string;
let listeningForEASButton = false;

function main() {
  if (SNACK_PAGE_REGEX.test(currentUrl)) {
    return snackInjector();
  }

  // Check if URL changed to the build page
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    if (EAS_BUILD_PAGE_REGEX.test(currentUrl)) {
      listeningForEASButton = true;
    }
  }

  // Listening for UI changes until the download button is shown
  if (listeningForEASButton) {
    const didInjectSuccessfully = easInjector();
    listeningForEASButton = !didInjectSuccessfully;
  }
}

const observer = new MutationObserver(main);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});
