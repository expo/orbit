import { canOpenProtocol } from "./canOpenProtocol";
import { showInstallModal } from "./installModal";
import { getBoltIcon, htmlStringToElement } from "./utils";

// Returns a boolean indicating if the button was successfully injected
export function easInjector() {
  // Check if Quick Lunch button already exists in DOM
  const button = document.querySelector('a[id="eas-quick-launch"]');
  if (button) {
    return true;
  }

  const downloadButton = document.querySelector(
    'a[data-testid="artifact-download-button"]'
  );

  if (!downloadButton || !(downloadButton instanceof HTMLAnchorElement)) {
    return false;
  }

  // Only show the quick launch button for installable builds
  if (
    !downloadButton.href.endsWith(".tar.gz") &&
    !downloadButton.href.endsWith(".apk")
  ) {
    return true;
  }

  // Copy install/download button style and attributes
  const installButton = Array.from(document.querySelectorAll("span")).find(
    (span) => span.textContent === "Install" || span.textContent === "Download"
  )?.parentNode;

  if (!installButton) {
    return false;
  }

  const installButtonClone = installButton.cloneNode(true) as HTMLElement;
  const quickLaunchButton = document.createElement("a");
  quickLaunchButton.setAttribute(
    "class",
    installButtonClone.getAttribute("class") ?? ""
  );
  quickLaunchButton.setAttribute("id", "eas-quick-launch");

  while (installButtonClone.firstChild) {
    if (installButtonClone.firstChild instanceof SVGElement) {
      quickLaunchButton.appendChild(
        htmlStringToElement(
          getBoltIcon("var(--expo-theme-button-primary-text)")
        )
      );
      installButtonClone.removeChild(installButtonClone.firstChild);
    } else {
      quickLaunchButton.appendChild(installButtonClone.firstChild);
    }
  }

  const span = quickLaunchButton.querySelector("span");
  if (span?.textContent) {
    span.textContent = "Quick Launch";
  }

  const url = downloadButton.href.replace("https://", "expomenubar://");
  quickLaunchButton.removeAttribute("href");

  quickLaunchButton.addEventListener("click", function () {
    canOpenProtocol(url, showInstallModal, () => {});
  });

  // Insert quick launch button in DOM
  installButton.parentNode?.insertBefore(quickLaunchButton, installButton);

  return true;
}
