import { app, BrowserWindow } from 'electron';
import * as ipc from 'ipc-promise';
// const {join} = require('path');
// const {format} = require('url');

import { Browser } from './browser';
import { Logger } from './logger';
import { Player } from './player';

const logger = Logger.create('Main');

export class Main {
  private static mainWindow: BrowserWindow;

  static getAppDataPath(): string {
    return app.getPath('userData');
  }

  static init(): void {
    app.on('ready', () => {
      this.createMainWindow();

      const browser = Browser.create();
      const player = Player.create();
      const executors = { browser, player };

      Object.entries(executors).forEach(([name, executor]) => {
        ipc.on(name, async command => {

          if (typeof command === 'string') {
            command = { name: command };
          }

          const logHeader = `${name}->${command.name}`;

          logger.debug(`Executes: ${logHeader}()`);

          if (typeof executor[command.name] !== 'function') {
            const message = 'Unknown executor method';
            logger.error(`${logHeader}: ${message}`);
            throw { message };
          }

          try {
            let res = executor[command.name].apply(executor, command.args);

            if (res instanceof Promise) {
              res = await res;
            }

            logger.debug(`Responds: ${logHeader}: ${typeof res !== 'object' ? res : '[object]'}`);
            return res;

          } catch (error) {
            logger.error(`${logHeader}: ${error.stack}`);
            throw { message: error.message };
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
      if (this.mainWindow === null) {
        Main.createMainWindow();
      }
    });
  }

  private static createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      minWidth: 900,
      minHeight: 600,
      frame: false,
      backgroundColor: '#111625',
      webPreferences: { webSecurity: false },
    });

    // this.window.loadURL(format({
    //   pathname: join(__dirname, '../dist/index.html'),
    //   protocol: 'file:',
    //   slashes: true,
    // }));
    this.mainWindow.loadURL('http://localhost:4200', { extraHeaders: 'pragma: no-cache\n' });

    this.mainWindow.webContents.openDevTools();

    this.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      delete this.mainWindow;
    });
  }
}

Main.init();
