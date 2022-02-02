module.exports = () => ({
  verbose: false,
  directory: process.cwd(),
  include: [],
  exclude: [],
  ifPresent: false,
  includeRoot: false,
  serial: false,
  npmScriptName: null,
  listWorkspaces: false,
  dryRun: false,
  quiet: false
});
