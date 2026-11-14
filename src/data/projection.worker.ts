// Runs the exam projection off the main thread: it can take seconds on a phone with a full program.
import { project } from '../scheduler/dashboard.ts';
import { createScheduler } from '../scheduler/fsrs.ts';

type Input = Omit<Parameters<typeof project>[0], 'scheduler'> & { requestId: number };

const scheduler = createScheduler();

self.onmessage = async (e: MessageEvent<Input>) => {
  const { requestId, ...input } = e.data;
  try {
    const result = project({ ...input, scheduler: await scheduler });
    self.postMessage({ requestId, result });
  } catch (err) {
    self.postMessage({ requestId, error: (err as Error).message });
  }
};
