export const EAS_BUILD_PAGE_REGEX =
  /.*expo\.(dev|test)\/accounts\/[^\/]+\/projects\/[^\/]+\/builds\/[^\/]+$/;

export const SNACK_PAGE_REGEX = /.*snack\.expo\.(dev|test).+$/;

export function htmlStringToElement(html: string) {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild as ChildNode;
}

export const boltIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="11px" height="20px" viewBox="0 0 11 19" version="1.1"><g id="surface1"><path style=" stroke:none;fill-rule:nonzero;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 10.875 8.445312 L 3.242188 18.738281 C 3.113281 18.910156 2.917969 18.992188 2.703125 18.992188 C 2.613281 18.992188 2.507812 18.972656 2.421875 18.929688 C 2.136719 18.804688 1.988281 18.488281 2.074219 18.191406 L 3.914062 11.566406 L 0.640625 11.566406 C 0.402344 11.566406 0.1875 11.441406 0.078125 11.230469 C -0.03125 11.019531 -0.03125 10.785156 0.101562 10.574219 L 6.863281 0.300781 C 7.035156 0.046875 7.363281 -0.0585938 7.644531 0.046875 C 7.925781 0.152344 8.097656 0.449219 8.054688 0.742188 L 6.992188 7.453125 L 10.355469 7.453125 C 10.59375 7.453125 10.832031 7.578125 10.9375 7.789062 C 11.046875 8 11.003906 8.253906 10.875 8.445312 Z M 10.875 8.445312 "/></g></svg>';
