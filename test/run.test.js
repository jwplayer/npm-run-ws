const test = require('ava');
const path = require('path');
const fs = require('fs');
const helpers = require('./helpers.js');
const npmRunWs = require('../src/run.js');
const getDefaultOptions = require('../src/get-default-options.js');

test.beforeEach((t) => {
  helpers.beforeEach(t);

  const pkgObject = helpers.getPkgObject('root-pkg');

  pkgObject.workspaces = [
    'workspaces/*',
    'workspaces2/*',
    'workspaces3/*'
  ];

  fs.writeFileSync(path.join(t.context.dir, 'package.json'), JSON.stringify(pkgObject, null, 2));

  t.context.createWorkspace(path.join('workspaces', 'a'));
  t.context.createWorkspace(path.join('workspaces', 'b'));
  t.context.createWorkspace(path.join('workspaces', 'c'));
  t.context.createWorkspace(path.join('workspaces2', 'd'));
  t.context.createWorkspace(path.join('workspaces3', 'e'));

  t.context.logs = [];
  t.context.errors = [];
  t.context.console = {
    log(...args) {
      t.context.logs.push.apply(t.context.logs, args);
    },
    error(...args) {
      t.context.errors.push.apply(t.context.errors, args);
    }
  };
  t.context.isCI = false;

  t.context.npmCliVersion = () => {
    return Promise.resolve('7');
  };

  t.context.currentRunner = null;

  t.context.taskFail = false;

  t.context.listr = function(tasks, options) {
    const runner = t.context.currentRunner = {
      run: () => {
        runner.tasks.forEach(function(task) {
          if (!task.hasOwnProperty('hasFailed')) {
            task.hasFailed = () => t.context.taskFail ? true : false;
          }

          if (task.skip()) {
            task.skipped = true;
          }
        });
        return Promise.resolve();
      },
      tasks,
      options
    };

    return runner;
  };

  t.context.execaRuns = [];
  t.context.execa = function(bin, args, options) {
    t.context.execaRuns.push([bin, args, options]);
  };

  t.context.npmRunWs = function(options) {
    options = Object.assign(
      getDefaultOptions(),
      {directory: t.context.dir},
      options
    );

    options.Listr = t.context.listr;
    options.isCI = t.context.isCI;
    options.npmCliVersion = t.context.npmCliVersion;
    options.console = t.context.console;
    options.execa = t.context.execa;

    return npmRunWs(options);
  };
});
test.afterEach(helpers.afterEach);

test('can list workspaces', function(t) {
  return t.context.npmRunWs({listWorkspaces: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'a'),
      path.join('workspaces', 'b'),
      path.join('workspaces', 'c'),
      path.join('workspaces2', 'd'),
      path.join('workspaces3', 'e')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('include works', function(t) {
  const include = [
    path.join('workspaces', 'a'),
    path.join('workspaces', 'b')
  ];

  return t.context.npmRunWs({listWorkspaces: true, include}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'a'),
      path.join('workspaces', 'b')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('include works with basename', function(t) {
  const include = [
    'a',
    'b'
  ];

  return t.context.npmRunWs({listWorkspaces: true, include}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'a'),
      path.join('workspaces', 'b')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('exclude works', function(t) {
  const exclude = [
    path.join('workspaces', 'a'),
    path.join('workspaces', 'b')
  ];

  return t.context.npmRunWs({listWorkspaces: true, exclude}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'c'),
      path.join('workspaces2', 'd'),
      path.join('workspaces3', 'e')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('exclude works with basename', function(t) {
  const exclude = [
    'a',
    'b'
  ];

  return t.context.npmRunWs({listWorkspaces: true, exclude}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'c'),
      path.join('workspaces2', 'd'),
      path.join('workspaces3', 'e')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('include and exclude work together', function(t) {
  const include = [
    path.join('workspaces', 'a'),
    path.join('workspaces', 'c')
  ];
  const exclude = [
    path.join('workspaces', 'a'),
    path.join('workspaces', 'b')
  ];

  return t.context.npmRunWs({listWorkspaces: true, include, exclude}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'c')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('include and exclude work together with basename', function(t) {
  const include = [
    'a',
    'c'
  ];
  const exclude = [
    'a',
    'b'
  ];

  return t.context.npmRunWs({listWorkspaces: true, include, exclude}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'c')
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('includeRoot works with listWorkspaces', function(t) {
  return t.context.npmRunWs({listWorkspaces: true, includeRoot: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [
      path.join('workspaces', 'a'),
      path.join('workspaces', 'b'),
      path.join('workspaces', 'c'),
      path.join('workspaces2', 'd'),
      path.join('workspaces3', 'e'),
      'root-pkg'
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('exitCode 1 and error if npm version too low', function(t) {
  t.context.npmCliVersion = () => Promise.resolve('6');

  return t.context.npmRunWs().then(function(exitCode) {
    t.is(exitCode, 1);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, [
      'npm workspaces is unsupported on npm@6 please upgrade to npm@>=7'
    ]);
  });
});

test('tasks are as expected', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('ifPresent works', function(t) {
  return t.context.npmRunWs({ifPresent: true, npmScriptName: 'test'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --if-present --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --if-present --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --if-present --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --if-present --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --if-present --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('includeRoot works', function(t) {
  return t.context.npmRunWs({includeRoot: true, npmScriptName: 'test'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 6);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
    t.is(tasks[5].title, 'npm run test');
  });
});

test('includeRoot + ifPresent works', function(t) {
  return t.context.npmRunWs({includeRoot: true, ifPresent: true, npmScriptName: 'test'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 6);
    t.is(tasks[0].title, `npm run test --if-present --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --if-present --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --if-present --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --if-present --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --if-present --workspace ${path.join('workspaces3', 'e')}`);
    t.is(tasks[5].title, 'npm run test --if-present');
  });
});

test('verbose works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', renderer: 'verbose'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'verbose'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('quiet works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', renderer: 'silent'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'silent'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('isCI works', function(t) {
  t.context.isCI = true;

  return t.context.npmRunWs({npmScriptName: 'test'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'simple'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('isCI + verbose works', function(t) {
  t.context.isCI = true;

  return t.context.npmRunWs({npmScriptName: 'test', renderer: 'verbose'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'verbose'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('serial works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', serial: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: false,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('sanity check for execa', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', ifPresent: true, includeRoot: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 6);
    t.is(tasks[0].title, `npm run test --if-present --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --if-present --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --if-present --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --if-present --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --if-present --workspace ${path.join('workspaces3', 'e')}`);
    t.is(tasks[5].title, 'npm run test --if-present');

    tasks.forEach(function(task) {
      task.task();
    });

    t.is(t.context.execaRuns.length, 6);
    // verify the execa command
    t.deepEqual(t.context.execaRuns, [
      ['npm', ['run', 'test', '--if-present', '--workspace', path.join('workspaces', 'a')], {all: true, cwd: t.context.dir}],
      ['npm', ['run', 'test', '--if-present', '--workspace', path.join('workspaces', 'b')], {all: true, cwd: t.context.dir}],
      ['npm', ['run', 'test', '--if-present', '--workspace', path.join('workspaces', 'c')], {all: true, cwd: t.context.dir}],
      ['npm', ['run', 'test', '--if-present', '--workspace', path.join('workspaces2', 'd')], {all: true, cwd: t.context.dir}],
      ['npm', ['run', 'test', '--if-present', '--workspace', path.join('workspaces3', 'e')], {all: true, cwd: t.context.dir}],
      ['npm', ['run', 'test', '--if-present'], {all: true, cwd: t.context.dir}]
    ]);
  });
});

test('dryRun works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', dryRun: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, [
      'NOTE: this is a dry run, commands are not actually being run!'
    ]);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);

    tasks[0].task();

    // nothing is run thorugh execa
    t.deepEqual(t.context.execaRuns, []);
  });
});

test('can fail', function(t) {
  t.context.taskFail = true;

  return t.context.npmRunWs({npmScriptName: 'test'}).then(function(exitCode) {
    t.is(exitCode, 1);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: true,
      exitOnError: false,
      renderer: 'default'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `npm run test --workspace ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `npm run test --workspace ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `npm run test --workspace ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `npm run test --workspace ${path.join('workspaces3', 'e')}`);
  });
});

test('failure without npm script name', function(t) {
  t.context.taskFail = true;

  return t.context.npmRunWs().then(function(exitCode) {
    t.is(exitCode, 1);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, [
      'An npm script name to run is required!'
    ]);
  });
});

test('failure without a valid workspace', function(t) {
  t.context.taskFail = true;

  return t.context.npmRunWs({npmScriptName: 'test', include: ['nope']}).then(function(exitCode) {
    t.is(exitCode, 1);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, [
      'no workspaces found to run on with given arguments!'
    ]);
  });
});

test('marks task as skipped if --if-present and non-existent script', function(t) {
  return t.context.npmRunWs({npmScriptName: 'bar', ifPresent: true, include: ['a']}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 1);
    t.is(tasks[0].skipped, true);
  });
});

test('marks task as skipped if --if-present and no scripts', function(t) {
  const pkgObject = helpers.getPkgObject('a');

  delete pkgObject.scripts;

  fs.writeFileSync(path.join(t.context.dir, 'workspaces', 'a', 'package.json'), JSON.stringify(pkgObject, null, 2));

  return t.context.npmRunWs({npmScriptName: 'bar', ifPresent: true, include: ['a']}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 1);
    t.is(tasks[0].skipped, true);
  });
});
