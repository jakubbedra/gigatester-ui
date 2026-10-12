import { Injectable } from '@angular/core';

export interface PythonRunResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const PYODIDE_VERSION = '0.26.4';

/**
 * Runs Python in the browser with Pyodide (CPython compiled to WebAssembly), inside a Web Worker so a
 * student's `while True:` can never freeze the page — on timeout the worker is simply thrown away.
 * Pyodide is fetched from a CDN the first time and cached by the browser afterwards.
 */
const WORKER_SOURCE = `
let pyodide = null;
async function init() {
  importScripts('https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js');
  pyodide = await loadPyodide();
  self.postMessage({ type: 'ready' });
}
init().catch(e => self.postMessage({ type: 'fatal', message: String(e) }));

self.onmessage = async (event) => {
  const { id, code, stdin } = event.data;
  const out = [];
  const err = [];
  const lines = String(stdin || '').replace(/\\r\\n/g, '\\n').split('\\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  let next = 0;
  pyodide.setStdin({ stdin: () => (next < lines.length ? lines[next++] : undefined) });
  pyodide.setStdout({ batched: s => out.push(s) });
  pyodide.setStderr({ batched: s => err.push(s) });
  try {
    const globals = pyodide.globals.get('dict')();
    await pyodide.runPythonAsync(code, { globals });
    globals.destroy();
  } catch (e) {
    err.push(String(e && e.message ? e.message : e));
  }
  self.postMessage({ type: 'result', id, stdout: out.join('\\n') + (out.length ? '\\n' : ''), stderr: err.join('\\n') });
};
`;

@Injectable({ providedIn: 'root' })
export class PythonRunnerService {

  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private nextId = 1;

  private start(): Promise<void> {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'ready') { worker.removeEventListener('message', onMessage); resolve(); }
        else if (e.data?.type === 'fatal') { worker.removeEventListener('message', onMessage); reject(new Error(e.data.message)); }
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', ev => reject(new Error(ev.message || 'Python worker failed')));
    });
    return this.ready;
  }

  /** Starts loading Python in the background so the first Run is fast. */
  warmUp(): Promise<void> {
    return this.ready ?? this.start();
  }

  async run(code: string, stdin: string, timeoutMs: number): Promise<PythonRunResult> {
    await this.warmUp();
    const worker = this.worker!;
    const id = this.nextId++;
    return new Promise<PythonRunResult>(resolve => {
      const timer = setTimeout(() => {
        worker.terminate();
        this.worker = null;
        this.ready = null;
        resolve({ stdout: '', stderr: '', timedOut: true });
      }, timeoutMs);
      const onMessage = (e: MessageEvent) => {
        if (e.data?.type === 'result' && e.data.id === id) {
          clearTimeout(timer);
          worker.removeEventListener('message', onMessage);
          resolve({ stdout: e.data.stdout, stderr: e.data.stderr, timedOut: false });
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ id, code, stdin });
    });
  }

}
