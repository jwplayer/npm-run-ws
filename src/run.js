/* eslint-disable no-console */
const path = require('path');
const {Listr} = require('listr2');
const isCI = require('is-ci');
const execa = require('execa');
const getWorkspaceList = require('./get-workspace-list.js');
const npmCliVersion = require('npm-cli-version');

const run = function(options) {
  // dependency injection for tests
  const Listr_ = options.hasOwnProperty('Listr') ? options.Listr : Listr;
  const isCI_ = options.hasOwnProperty('isCI') ? options.isCI : isCI;
  const npmCliVersion_ = options.hasOwnProperty('npmCliVersion') ? options.npmCliVersion : npmCliVersion;
  const console_ = options.hasOwnProperty('console') ? options.console : console;
  const execa_ = options.hasOwnProperty('execa') ? options.execa : execa;

  return npmCliVersion_().then(function(version) {
    const npmMajor = parseInt(version.split('.').shift(), 10);

    if (npmMajor < 7) {
      console_.error(`npm workspaces is unsupported on npm@${version} please upgrade to npm@>=7`);
      return Promise.resolve(1);
    }

    const pkg = require(path.join(options.directory, 'package.json'));
    let workspaces = getWorkspaceList(pkg, options.directory);

    if (options.includeRoot) {
      workspaces.push(pkg.name);
    }

    if (options.include || options.exclude) {
      workspaces = workspaces.filter(function(workspace) {
        const shouldInclude = options.include.length ?
          options.include.some((includeRule) => includeRule === workspace) :
          true;
        const shouldExclude = options.exclude.length ?
          options.exclude.some((excludeRule) => excludeRule === workspace) :
          false;

        if (shouldInclude && !shouldExclude) {
          return true;
        }
      });
    }

    if (options.listWorkspaces) {
      workspaces.forEach((ws) =>{
        console_.log(ws);
      });

      return Promise.resolve(0);
    }

    if (!options.npmScriptName) {
      console_.error('An npm script name to run is required!');
      return Promise.resolve(1);
    }

    const tasks = workspaces.map(function(workspaceName) {
      const args = ['run', options.npmScriptName];

      if (options.ifPresent) {
        args.push('--if-present');
      }

      if (workspaceName !== pkg.name) {
        args.push('--workspace', workspaceName);
      }

      return {
        title: `npm ${args.join(' ')}`,
        task: () => options.dryRun ? Promise.resolve() : execa_('npm', args, {all: true, cwd: options.directory})
      };
    });

    let renderer = options.verbose ? 'verbose' : 'default';

    if (isCI_ && !options.verbose) {
      renderer = 'simple';
    }

    if (options.quiet) {
      renderer = 'silent';
    }

    const runner = new Listr_(tasks, {
      concurrent: (options.serial ? false : true),
      exitOnError: false,
      renderer
    });

    if (options.dryRun) {
      console_.log('NOTE: this is a dry run, commands are not actually being run!');
    }

    return runner.run().then(function() {
      const failure = runner.tasks.some((task) => task.hasFailed());

      return Promise.resolve(failure ? 1 : 0);
    });
  });
};

module.exports = run;
