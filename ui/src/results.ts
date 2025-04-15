import { type AnyLogHandle } from '@platforma-sdk/model';
import { computed } from 'vue';
import { useApp } from './app';

export type DetectProgress = {
  value: number;
  progressString: string;
};

export type ResultEntry = {
  sampleLabel: string;
  log?: AnyLogHandle;
  progress?: DetectProgress;
  nEpitopes?: string;
};

function parseProgress(lines: string | undefined): DetectProgress | undefined {
  if (!lines) return undefined;
  const line = lines.split('\n').reverse().find((l) => l.includes('%'));
  if (!line || line.indexOf('%') < 0) return undefined;
  const percentage = parseInt(line.substring(0, line.indexOf('%')));
  if (Number.isNaN(percentage)) return undefined;

  return {
    value: percentage,
    progressString: percentage + '%',
  };
}

// return a map of sampleId => ResultEntry
export const resultMap = computed((): Record<string, ResultEntry> | undefined => {
  const app = useApp();

  const labels = app.model.outputs.labels;
  if (labels === undefined) return undefined;

  const logs = app.model.outputs.logs;
  if (logs === undefined) return undefined;

  const progress = app.model.outputs.progress;
  if (progress === undefined) return undefined;

  const nEpitopes = app.model.outputs.nEpitopes;
  if (nEpitopes === undefined) return undefined;

  const r: Record<string, ResultEntry> = {};

  for (const log of logs.data) {
    const sampleId = log.key[0];
    r[sampleId] = {
      sampleLabel: labels[sampleId],
      log: log.value,
    };
  }

  for (const prog of progress.data) {
    r[prog.key[0]].progress = parseProgress(prog.value);
  }

  for (const nEps of nEpitopes.data) {
    r[nEps.key[0]].nEpitopes = nEps.value;
  }

  console.log(app.model.outputs.progress);
  console.log(r);
  return r;
});
