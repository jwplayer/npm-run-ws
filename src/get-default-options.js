module.exports = () => ({
  directory: process.cwd(),
  include: [],
  exclude: [],
  ifPresent: false,
  includeRoot: false,
  renderer: 'default',
  serial: false,
  npmScriptName: null,
  listWorkspaces: false,
  ignoreScripts: false,
  dryRun: false
});
