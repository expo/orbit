export const canOpenProtocol = (
  uri: string,
  failCallback: () => void,
  successCallback: () => void
) => {
  const timeout = setTimeout(function () {
    failCallback();
    handler.remove();
  }, 2000);

  // handle page running in an iframe (blur must be registered with top level window)
  let target: Window = window;
  while (target.parent && target != target.parent) {
    target = target.parent;
  }

  const onBlur = () => {
    clearTimeout(timeout);
    handler.remove();
    successCallback();
  };

  const handler = registerEvent(target, "blur", onBlur);
  window.location.href = uri;
};

const registerEvent = (
  target: Window,
  eventType: keyof WindowEventMap,
  callback: () => void
) => {
  target.addEventListener(eventType, callback);
  return {
    remove: function () {
      target.removeEventListener(eventType, callback);
    },
  };
};
