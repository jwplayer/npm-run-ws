module.exports = () => ({
  directory: process.cwd(),
  include: [],
  exclude: [],
  ifPresent: false,
  includeRoot: false,
  renderer: 'simple',
  serial: false,
  npmScriptName: null,
  listWorkspaces: false,
  dryRun: false
});
