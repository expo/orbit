import { endTimer, formatMilliseconds, startTimer } from './timer';

export type Progress = {
  total: number;
  percent: number;
  transferred: number;
};

export type ProgressHandler = (props: {
  progress?: Progress;
  isComplete?: boolean;
  error?: Error;
}) => void;

export function createProgressTracker({
  total,
  message,
  completedMessage,
}: {
  total?: number;
  message: string | ((ratio: number, total: number) => string);
  completedMessage: string | ((duration: string) => string);
}): ProgressHandler {
  let calcTotal: number = total ?? 0;
  let transferredSoFar = 0;
  let current = 0;

  const timerLabel = String(Date.now());

  const getMessage = (v: number, total: number): string => {
    const ratio = Math.min(Math.max(v, 0), 1);
    const percent = Math.floor(ratio * 100);
    return typeof message === 'string'
      ? `${message} ${percent.toFixed(0)}%`
      : message(ratio, total);
  };

  return ({ progress, isComplete, error }) => {
    if (progress) {
      if (progress.total !== undefined || total !== undefined) {
        calcTotal = (total ?? progress.total) as number;
        startTimer(timerLabel);
      }
      if (progress.total) {
        calcTotal = progress.total;
      }

      let percentage = 0;
      if (progress.percent) {
        percentage = progress.percent;
      } else {
        current += progress.transferred - transferredSoFar;
        percentage = current / calcTotal;
      }

      console.log(getMessage(percentage, calcTotal));

      transferredSoFar = progress.transferred;
    }

    if (isComplete) {
      const duration = endTimer(timerLabel);
      const prettyTime = formatMilliseconds(duration);
      if (error) {
        console.log(error.message);
      } else {
        if (typeof completedMessage === 'string') {
          console.log(completedMessage);
        } else {
          console.log(completedMessage(prettyTime));
        }
      }
    }
  };
}
