export function partition<T>(array: T[], predicate: (item: T) => boolean) {
  return array.reduce(
    (acc: T[][], item: T) => (acc[+!predicate(item)].push(item), acc),
    [[], []],
  );
}

export function capitalize(word: string) {
  return `${word.toUpperCase()[0]}${word.substring(1)}`;
}
