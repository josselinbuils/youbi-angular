import { app, BrowserWindow } from 'electron';
import * as ipc from 'ipc-promise';
// const {join} = require('path');
// const {format} = require('url');

import { Browser } from './browser';
import { Logger } from './logger';
import { Player } from './player';

const logger = Logger.create('Main');

let win: BrowserWindow;

function createWindow(): void {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#111625',
  });

  // win.loadURL(format({
  //   pathname: join(__dirname, '../dist/index.html'),
  //   protocol: 'file:',
  //   slashes: true,
  // }));
  win.loadURL('http://localhost:4200', { extraHeaders: 'pragma: no-cache\n' });

  win.webContents.openDevTools();

  win.on('closed', () => {
    // Dereference the window object, usually you would store windows in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

app.on('ready', () => {
  createWindow();

  const browser = Browser.create();
  const player = Player.create();
  const executors = { browser, player };

  Object.entries(executors).forEach(([name, executor]) => {
    ipc.on(name, command => {
      const logHeader = `${name}->${command.name}`;

      logger.debug(`Execute: ${logHeader}()`);

      if (typeof executor[command.name] !== 'function') {
        return Promise.reject(new Error('Unknown executor method'));
      }

      try {
        let res = executor[command.name].apply(executor, command.args);

        if (res instanceof Promise) {
          res = res.catch(error => {
            logger.error(`${logHeader}: ${error.stack}`);
            throw error;
          });
        } else {
          res = Promise.resolve(res);
        }

        return res;

      } catch (error) {
        logger.info(`${logHeader}: ${error.stack}`);
        return Promise.reject(error);
      }
    });
  });
});

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
