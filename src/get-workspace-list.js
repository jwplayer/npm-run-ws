const path = require('path');
const shell = require('shelljs');

const getWorkspaceList = function(pkg, baseDir) {
  const workspaceList = [];

  if (!pkg || !pkg.workspaces) {
    return workspaceList;
  }

  const oldSilentState = shell.config.silent;

  shell.config.silent = true;

  pkg.workspaces.forEach(function(workspaceEntry) {
    const packagePaths = shell.ls(path.join(baseDir, workspaceEntry, 'package.json'));

    packagePaths.forEach(function(packagePath) {
      const relativeDir = path.relative(baseDir, path.dirname(packagePath));

      if (workspaceList.indexOf(relativeDir) === -1) {
        workspaceList.push(relativeDir);
      }
    });
  });

  shell.config.silent = oldSilentState;
  return workspaceList;
};

module.exports = getWorkspaceList;
