const camelToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const bodyStyles = window.getComputedStyle(document.body);

export const PlatformColor = (color: string) => {
  const colorValue =
    bodyStyles.getPropertyValue(`--${camelToSnakeCase(color)}`) ||
    bodyStyles.getPropertyValue(`--${camelToSnakeCase(color)}-color`);

  return colorValue || '#000000';
};
