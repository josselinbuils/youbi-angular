import { app, BrowserWindow } from 'electron';
import * as electronWindowState from 'electron-window-state';
import * as ipc from 'ipc-promise';
import { join } from 'path';
import 'source-map-support/register';
import { format } from 'url';

import { Command } from '../shared/interfaces';

import { Browser } from './browser';
import { Logger } from './logger';
import { Player } from './player';

const logger = Logger.create('Main');

export class Main {
  private static mainWindow: BrowserWindow;

  static getAppDataPath(): string {
    logger.debug('getAppDataPath()');
    return app.getPath('userData');
  }

  static init(): void {
    logger.debug('init()');

    app.on('ready', () => {
      this.createMainWindow();

      const browser = Browser.create();
      const player = Player.create();
      const executors = { browser, player };

      Object.entries(executors).forEach(([name, executor]) => {
        ipc.on(name, async (command: Command) => {
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

            let preview = res;

            if (typeof res === 'string') {
              preview = res.length < 50 ? res : `${res.slice(0, 50)}[...]`;
            } else if (typeof res === 'object') {
              preview = '[object]';
            }

            logger.debug(`Responds: ${logHeader}: ${preview}`);
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
    logger.debug('createMainWindow()');

    const mainWindowState = electronWindowState({
      defaultWidth: 900,
      defaultHeight: 600,
    });

    const { width, height } = mainWindowState;

    this.mainWindow = new BrowserWindow({
      width,
      height,
      minWidth: 900,
      minHeight: 600,
      frame: false,
      backgroundColor: '#111625',
      webPreferences: {
        experimentalFeatures: true,
        nodeIntegration: false,
        preload: join(__dirname, 'preload.js'),
      },
    });

    mainWindowState.manage(this.mainWindow);

    if (this.isDev()) {
      this.mainWindow.loadURL('http://localhost:4200', { extraHeaders: 'pragma: no-cache\n' });
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadURL(format({
        pathname: join(__dirname, '../browser/index.html'),
        protocol: 'file:',
        slashes: true,
      }));
    }

    this.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      delete this.mainWindow;
    });
  }

  private static isDev(): boolean {
    return (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));
  }
}

Main.init();
