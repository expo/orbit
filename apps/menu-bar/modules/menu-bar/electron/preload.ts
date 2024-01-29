declare global {
  // eslint-disable-next-line no-var
  var screen: { height: number; width: number } | null | undefined;
}

const MenuBarModule = {
  name: 'MenuBar',
  initialScreenSize: {
    height: globalThis.screen?.height || 0,
    width: globalThis.screen?.width || 0,
  },
};

export default MenuBarModule;
