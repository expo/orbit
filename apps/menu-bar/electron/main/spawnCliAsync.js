const { fork } = require('child_process');

function spawnCliAsync(cliPath, command, args = [], listenerId) {
  let child;
  let hasReachedReturnOutput = false;
  let hasReachedError = false;
  let returnOutput = '';

  let promise = new Promise((resolve, reject) => {
    child = fork(cliPath, [command, ...args], {
      env: { ...process.env, EXPO_MENU_BAR: true },
      stdio: 'pipe',
    });

    function dataHandler(data) {
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
        } else if (output.length > 0 && !output === '\n') {
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

    const completionListener = (code, signal) => {
      child.removeListener('error', errorListener);

      if (hasReachedError) {
        reject(new Error(returnOutput));
      } else {
        resolve(hasReachedReturnOutput ? returnOutput : null);
      }
    };

    let errorListener = (error) => {
      child.removeListener('close', completionListener);
      reject(error);
    };

    child.once('close', completionListener);
    child.once('error', errorListener);
  });
  promise.child = child;
  return promise;
}

module.exports = spawnCliAsync;
