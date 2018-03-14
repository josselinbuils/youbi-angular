import { remote } from 'electron';
import * as ipc from 'ipc-promise';

process.once('loaded', () => {
  const g = global as any;
  g.ipc = ipc;
  g.getCurrentElectronWindow = remote.getCurrentWindow;
});
