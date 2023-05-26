export function returnLoggerMiddleware(
  fn: (...args: any[]) => string | Promise<string>
) {
  return async function (...args: any[]) {
    try {
      const result = await fn(...args);

      console.log("---- return output ----");
      console.log(result);
    } catch (error) {
      console.log("---- thrown error ----");
      console.log(error);
    }
  };
}
