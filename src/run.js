/* eslint-disable no-console */
const path = require('path');
const {Listr} = require('listr2');
const execa = require('./spawn.js');
const getWorkspaceList = require('./get-workspace-list.js');
const npmCliVersion = require('npm-cli-version');
const isCI = require('is-ci');
const fs = require('fs');
const pkgDir = require('pkg-dir');
const defaultRenderer = require('./get-default-options.js')().renderer;
const os = require('os');

const run = function(options) {
  // dependency injection for tests
  const Listr_ = options.hasOwnProperty('Listr') ? options.Listr : Listr;
  const isCI_ = options.hasOwnProperty('isCI') ? options.isCI : isCI;
  const npmCliVersion_ = options.hasOwnProperty('npmCliVersion') ? options.npmCliVersion : npmCliVersion;
  const console_ = options.hasOwnProperty('console') ? options.console : console;
  const execa_ = options.hasOwnProperty('execa') ? options.execa : execa;

  if (isCI_ && options.renderer === defaultRenderer) {
    options.renderer = 'verbose';
  }

  return Promise.all([
    npmCliVersion_(),
    pkgDir(options.directory)
  ]).then(function([npmVersion, pkgRoot]) {
    const npmMajor = parseInt(npmVersion.split('.').shift(), 10);

    if (npmMajor < 7) {
      console_.error(`npm workspaces is unsupported on npm@${npmVersion} please upgrade to npm@>=7`);
      return Promise.resolve(1);
    }

    const execaOptions = {
      cwd: pkgRoot
    };

    if (options.stream) {
      execaOptions.stream = true;
    }

    const pkg = require(path.join(pkgRoot, 'package.json'));
    let workspaces = getWorkspaceList(pkg, pkgRoot);

    if (options.includeRoot) {
      workspaces.push(pkg.name);
    }

    if (options.include.length || options.exclude.length) {
      workspaces = workspaces.filter(function(workspace) {
        const shouldInclude = options.include.length ?
          options.include.some((includeRule) => includeRule === workspace || includeRule === path.basename(workspace)) :
          true;
        const shouldExclude = options.exclude.length ?
          options.exclude.some((excludeRule) => excludeRule === workspace || excludeRule === path.basename(workspace)) :
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

    if (!workspaces.length) {
      console_.error('no workspaces found to run on with given arguments!');

      return Promise.resolve(1);
    }

    if (!options.npmScriptName) {
      console_.error('An npm script name to run is required!');
      return Promise.resolve(1);
    }

    const tasks = workspaces.map(function(workspaceName) {
      const args = ['run', options.npmScriptName];

      if (options.ignoreScripts) {
        args.push('--ignore-scripts');
      }

      if (options.ifPresent) {
        args.push('--if-present');
      }

      if (workspaceName !== pkg.name) {
        args.push('--workspace', workspaceName);
      }

      let task;

      if (options.dryRun) {
        task = () => Promise.resolve;
      } else {
        task = (ctx, task_) => {
          return execa_('npm', args, execaOptions).then(function(result) {
            const success = result.exitCode === 0;

            if (!options.stream && (!success || options.renderer === 'verbose')) {
              const line = `${task_.title}\n${result.all}`;

              if (!success) {
                throw Error(line);
              } else {
                task_.output = line;
              }
            }

            return Promise.resolve();
          });
        };
      }

      return {
        title: `npm ${args.join(' ')}`,
        skip: (ctx) => {
          if (!options.ifPresent) {
            return false;
          }
          let subpkg = pkg;

          if (workspaceName !== pkg.name) {
            subpkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, workspaceName, 'package.json')));
          }

          if (!subpkg.scripts || !subpkg.scripts[options.npmScriptName]) {
            return true;
          }

          return false;
        },
        task
      };
    });

    const runner = new Listr_(tasks, {
      concurrent: (options.throttle ? os.cpus().length : true),
      exitOnError: false,
      renderer: options.renderer,
      rendererOptions: {showTimer: true}
    });

    if (options.dryRun) {
      console_.log('NOTE: this is a dry run, commands are not actually being run!');
    }

    return runner.run().then(function() {
      const failures = [];

      runner.tasks.forEach((task) => {
        if (task.hasFailed()) {
          failures.push(task.title);
        }
      });

      if (failures.length) {
        console_.error(`\nThe following commands failed:\n* ${failures.join('\n* ')}`);

        return Promise.resolve(1);
      }

      return Promise.resolve(0);
    });
  });
};

module.exports = run;
