const {app, BrowserWindow} = require('electron');
const naudiodon = require('naudiodon');
// const path = require('path');
// const url = require('url');

const {Decoder} = require('./decoder');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#111625',
  });

  const path = //'\\\\DISKSTATION\\music\\Noir Désir\\Des Visages des Figures\\02 Le Grand Incendie.m4a';
    'C:\\Users\\Josselin\\Downloads\\3-02 C\'est Une Belle Journee.m4a';
    // '\\\\DISKSTATION\\music\\Shaka Ponk\\The Black Pixel Ape (Drinking Cigarettes to Take a Break)\\01 On the Ro\'.m4a';
    // 'C:\\Users\\Josselin\\Downloads\\Goldfrapp-Tales_Of_Us\\01-01-Goldfrapp-Jo-SMR.flac';


  const devices = naudiodon.getDevices()
    .map(device => `- ${device.name} (${device.hostAPIName})`)
    .join('\n');

  console.log(`Available devices:\n${devices}\n`);

  const device = naudiodon.getDevices()
    .filter(device => /usb|dx7/i.test(device.name) && /wdm/i.test(device.hostAPIName))[0];

  console.time('decode');
  Decoder.decode(path).then(decoded => {
    console.timeEnd('decode');

    const audioOutput = new naudiodon.AudioOutput({
      channelCount: decoded.channels,
      sampleFormat: naudiodon[`SampleFormat${decoded.bits}Bit`],
      sampleRate: decoded.sampleRate,
      deviceId: device.id
    });

    decoded.audioStream.pipe(audioOutput);
    audioOutput.start();
  });

  // and load the index.html of the app.
  // win.loadURL(url.format({
  //   pathname: path.join(__dirname, 'dist/index.html'),
  //   protocol: 'file:',
  //   slashes: true,
  // }));
  win.loadURL('http://localhost:4200');

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
app.on('ready', createWindow);

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
