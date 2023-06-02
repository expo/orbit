import { htmlStringToElement } from "./utils";

export function showInstallModal() {
  const html = `
  <div class="modal-container">
    <div class="modal-content"><span id="close-button">×</span>
      <h2>It appears that you do not have EAS Quick Launcher installed</h2>
      <p>Please visit
        <a href="https://github.com/expo/eas-menu-bar" target="_blank">https://github.com/expo/eas-menu-bar</a>
        for more information on how you can install it.
      </p>
    </div>
  </div> d
  `;

  const modalContainer = htmlStringToElement(html);
  document.body.appendChild(modalContainer);

  const closeButton = document.querySelector("#close-button");
  closeButton?.addEventListener("click", function () {
    document.body.removeChild(modalContainer);
  });
}

const style = document.createElement("style");
style.textContent = `
.modal-container {
  z-index: 10;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  position: relative;
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
}

#close-button {
  position: absolute;
  top: 0px;
  right: 10px;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
}
`;

document.head.appendChild(style);
