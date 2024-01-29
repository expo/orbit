import { fork, ChildProcess } from 'child_process';

function spawnCliAsync(cliPath: string, command: string, args: string[] = [], listenerId: number) {
  let child: ChildProcess;
  let hasReachedReturnOutput = false;
  let hasReachedError = false;
  let returnOutput = '';

  let promise = new Promise<string>((resolve, reject) => {
    child = fork(cliPath, [command, ...args], {
      env: { ...process.env, EXPO_MENU_BAR: true } as any,
      stdio: 'pipe',
    });

    function dataHandler(data: any) {
      const wholeOutput = data.toString();
      const outputs = wholeOutput.split('\n');

      for (const output of outputs) {
        if (output === '') {
          continue;
        }

        if (hasReachedReturnOutput || hasReachedError) {
          returnOutput += output;
        } else if (output === '---- return output ----') {
          hasReachedReturnOutput = true;
        } else if (output === '---- thrown error ----') {
          hasReachedError = true;
        } else if (output.length > 0 && output !== '\n') {
          const eventData = {
            listenerId,
            output,
          };
          console.log('sendEventWithName', eventData);
        }
      }
    }

    if (child.stdout) {
      child.stdout.on('data', dataHandler);
    }

    if (child.stderr) {
      child.stderr.on('data', dataHandler);
    }

    const completionListener = () => {
      child.removeListener('error', errorListener);

      if (hasReachedError) {
        reject(new Error(returnOutput));
      } else {
        resolve(returnOutput);
      }
    };

    let errorListener = (error: Error) => {
      child.removeListener('close', completionListener);
      reject(error);
    };

    child.once('close', completionListener);
    child.once('error', errorListener);
  });
  // @ts-ignore: TypeScript isn't aware the Promise constructor argument runs synchronously and
  // thinks `child` is not yet defined.
  promise.child = child;
  return promise;
}

export default spawnCliAsync;
