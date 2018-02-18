import { app, BrowserWindow } from 'electron';
import * as ipc from 'ipc-promise';
// const {join} = require('path');
// const {format} = require('url');

import { Browser } from './browser';
import { Player } from './player';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow;

function createWindow(): void {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#111625',
  });

  // and load the index.html of the app.
  // win.loadURL(format({
  //   pathname: join(__dirname, '../dist/index.html'),
  //   protocol: 'file:',
  //   slashes: true,
  // }));
  win.loadURL('http://localhost:4200', { extraHeaders: 'pragma: no-cache\n' });

  // Open the DevTools.
  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();

  const browser = Browser.create();
  const player = Player.create();
  const executors = { browser, player };

  Object.entries(executors).forEach(([name, executor]) => {
    ipc.on(name, command => {
      console.log(`Execute: ${name}->${command.name}()`);

      if (typeof executor[command.name] !== 'function') {
        return Promise.reject(new Error('Unknown executor method'));
      }

      try {
        const res = executor[command.name].apply(executor, command.args);
        return res instanceof Promise ? res : Promise.resolve(res);
      } catch (error) {
        return Promise.reject(error);
      }
    });
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
