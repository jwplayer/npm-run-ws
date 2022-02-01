const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');
const TEMP_DIR = shell.tempdir();

const getPkgObject = function(name) {
  return {
    name,
    version: '1.0.0',
    description: '',
    main: 'index.js',
    keywords: [],
    author: '',
    license: 'ISC'
  };
};

const getTempDir = function() {
  return path.join(TEMP_DIR, uuid.v4());
};

module.exports = {
  getPkgObject,
  getTempDir,
  beforeEach(t) {
    shell.config.silent = true;

    t.context.dir = getTempDir();
    t.context.createWorkspace = function(directory) {
      const fullPath = path.join(t.context.dir, directory);
      const pkgObject = getPkgObject(path.basename(directory));

      shell.mkdir('-p', fullPath);
      fs.writeFileSync(path.join(fullPath, 'package.json'), JSON.stringify(pkgObject, null, 2));
    };
    shell.mkdir('-p', t.context.dir);

  },
  afterEach(t) {
    shell.rm('-rf', t.context.dir);
  }
};
