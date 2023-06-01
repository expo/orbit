export function showInstallModal() {
  const modalContainer = document.createElement("div");
  modalContainer.classList.add("modal-container");

  const modalContent = document.createElement("div");
  modalContent.classList.add("modal-content");

  const closeButton = document.createElement("span");
  closeButton.classList.add("close-button");
  closeButton.innerHTML = "&times;"; // Display 'x' symbol

  const installText = document.createElement("p");
  installText.textContent =
    "Visit https://github.com/expo/eas-menu-bar to install EAS Quick Launcher.";

  modalContent.appendChild(closeButton);
  modalContent.appendChild(installText);
  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalContainer);

  closeButton.addEventListener("click", function () {
    document.body.removeChild(modalContainer);
  });
}

const style = document.createElement("style");
style.textContent = `
.modal-container {
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
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
}

p {
  margin: 0;
  padding: 10px 0;
}
`;

document.head.appendChild(style);
