const packager = require('electron-packager');

const keep = ['/dist', '/node_modules', '/package.json'];

const options = {
  dir: './',
  out: './package',
  icon: './assets/youbi',
  platform: process.argv[2],
  arch: 'x64',
  overwrite: true,
  ignore: path => {
    if (!path) {
      return false;
    }
    return !keep.some(p => path.indexOf(p) === 0);
  }
};

packager(options)
  .then(path => console.log(`Success: ${path}`))
  .catch(error => console.error(error.stack));
