import { InternalError } from "common-types";
import { Platform } from "common-types/build/cli-commands";
import util from "util";

export function returnLoggerMiddleware(
  fn: (...args: any[]) => any | Promise<any>
) {
  return async function (...args: any[]) {
    try {
      const result = await fn(...args);

      console.log("---- return output ----");
      if (typeof result === "string") {
        console.log(result);
      } else if (typeof result === "object" && result !== null) {
        console.log(JSON.stringify(result));
      } else {
        console.log(
          util.inspect(result, {
            showHidden: false,
            depth: null,
            colors: false,
          })
        );
      }
    } catch (error) {
      console.log("---- thrown error ----");
      if (error instanceof InternalError) {
        console.log(
          JSON.stringify({
            name: error.name,
            code: error.code,
            message: error.message,
            details: error.details,
            stack: error.stack,
          })
        );
      } else if (error instanceof Error) {
        console.log(
          JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          })
        );
      } else {
        console.log(error);
      }
    }
  };
}

export const getPlatformFromURI = (uri: string) => {
  if (uri.endsWith(".apk")) {
    return Platform.Android;
  }

  return Platform.Ios;
};
