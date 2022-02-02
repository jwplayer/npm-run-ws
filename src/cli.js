#! /usr/bin/env node
/* eslint-disable no-console */
const run = require('./run.js');
const pkg = require('../package.json');
const getDefaultOptions = require('./get-default-options.js');

const printHelp = function(console) {
  console.log();
  console.log(`  Usage: ${pkg.name} [--if-present|--include-root] <script-name>`);
  console.log();
  console.log(`  ${pkg.description}`);
  console.log();
  console.log('  -v,  --version            Print the version of videojs-generator-verify.');
  console.log('  -V,  --verbose            Print the output of everything.');
  console.log('  -ip, --if-present         Only run the npm script if present on the workspace.');
  console.log('  -s,  --serial             Run the npm workspace script serially.');
  console.log('  -q,  --quiet              Do not print anything when commands are being run.');
  console.log('  -ir, --include-root       Run the script on the root workspace as well.');
  console.log('  -i,  --include [name]     Run on workspaces that match this. Can pass more than one.');
  console.log('  -e,  --exclude [name]     Run on workspaces that do not match this. Can pass more than one');
  console.log('  -d,  --directory [dir]    Run in this project directory, defaults to cwd.');
  console.log('  --list-workspaces         list workspaces, separated by newlines, with relative directory.');
  console.log('  --dry-run                 Show the ui and commands of what would have been run, without running.');
  console.log();
};

const cli = function(args, console, exit) {
  const options = Object.assign({}, getDefaultOptions());

  // only takes one argument
  for (let i = 0; i < args.length; i++) {
    if ((/^-h|--help$/).test(args[i])) {
      printHelp(console);
      exit();
      return options;
    } else if ((/^-v|--version$/).test(args[i])) {
      console.log(pkg.version);
      exit();
      return options;
    } else if ((/^-V|--verbose$/).test(args[i])) {
      options.verbose = true;
    } else if ((/^-s|--serial$/).test(args[i])) {
      options.serial = true;
    } else if ((/^-q|--quiet$/).test(args[i])) {
      options.quiet = true;
    } else if ((/^-ip|--if-present$/).test(args[i])) {
      options.ifPresent = true;
    } else if ((/^-ir|--include-root$/).test(args[i])) {
      options.includeRoot = true;
    } else if ((/^--list-workspaces$/).test(args[i])) {
      options.listWorkspaces = true;
    } else if ((/^--dry-run$/).test(args[i])) {
      options.dryRun = true;
    } else if ((/^-i|--include$/).test(args[i])) {
      i++;
      options.include.push(args[i]);
    } else if ((/^-e|--exclude$/).test(args[i])) {
      i++;
      options.exclude.push(args[i]);
    } else if ((/^-d|--directory$/).test(args[i])) {
      i++;
      options.directory = args[i];
    } else {
      options.npmScriptName = args[i];
    }
  }

  return options;
};

module.exports = {cli, printHelp};

// The code below will only run when working as an executable
// that way we can test the cli using require in unit tests.
if (require.main === module) {
  const options = cli(process.argv.slice(2), console, process.exit);

  run(options).then(function(exitCode) {
    process.exit(exitCode);
  });
}
