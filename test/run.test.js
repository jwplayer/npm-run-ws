const test = require('ava');
const path = require('path');
const fs = require('fs');
const helpers = require('./helpers.js');
const npmRunWs = require('../src/run.js');
const getDefaultOptions = require('../src/get-default-options.js');
const os = require('os');

const fakeLogger = function(arr) {
  return (...logs) => {
    logs.forEach(function(log) {
      const logLines = log ? log.split(/\r\n|\r|\n/) : [''];

      arr.push(...logLines);
    });
  };
};

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
    log: fakeLogger(t.context.logs),
    error: fakeLogger(t.context.errors)
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

  t.context.execaReturn = {
    exitCode: 0,
    all: 'foo'
  };
  t.context.execaRuns = [];
  t.context.execa = function(bin, args, options) {
    t.context.execaRuns.push([bin, args, options]);
    return Promise.resolve(t.context.execaReturn);
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
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
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
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
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
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
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
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
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
      concurrent: os.cpus().length,
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
      concurrent: os.cpus().length,
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
      concurrent: os.cpus().length,
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

test('isCI + simple works', function(t) {
  t.context.isCI = true;

  return t.context.npmRunWs({npmScriptName: 'test', renderer: 'simple'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
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

test('serial works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', serial: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: false,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
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
  return t.context.npmRunWs({npmScriptName: 'test', ifPresent: true, includeRoot: true, ignoreScripts: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
    });
    const tasks = t.context.currentRunner.tasks;
    const baseStr = 'npm run test --ignore-scripts --if-present';
    const wsStr = `${baseStr} --workspace`;

    t.is(tasks.length, 6);
    t.is(tasks[0].title, `${wsStr} ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `${wsStr} ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `${wsStr} ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `${wsStr} ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `${wsStr} ${path.join('workspaces3', 'e')}`);
    t.is(tasks[5].title, baseStr);

    tasks.forEach(function(task) {
      task.task({}, task);
    });

    t.is(t.context.execaRuns.length, 6);
    const cmd = ['run', 'test', '--ignore-scripts', '--if-present'];
    const wsCmd = cmd.concat(['--workspace']);
    const options = {all: true, cwd: t.context.dir, env: {FORCE_COLOR: true}, reject: false};

    // verify the execa command
    t.deepEqual(t.context.execaRuns, [
      ['npm', wsCmd.concat([path.join('workspaces', 'a')]), options],
      ['npm', wsCmd.concat([path.join('workspaces', 'b')]), options],
      ['npm', wsCmd.concat([path.join('workspaces', 'c')]), options],
      ['npm', wsCmd.concat([path.join('workspaces2', 'd')]), options],
      ['npm', wsCmd.concat([path.join('workspaces3', 'e')]), options],
      ['npm', cmd, options]
    ]);
  });
});

test('stream works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', ifPresent: true, includeRoot: true, stream: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
    });
    const tasks = t.context.currentRunner.tasks;
    const baseStr = 'npm run test --if-present';
    const wsStr = `${baseStr} --workspace`;

    t.is(tasks.length, 6);
    t.is(tasks[0].title, `${wsStr} ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `${wsStr} ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `${wsStr} ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `${wsStr} ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `${wsStr} ${path.join('workspaces3', 'e')}`);
    t.is(tasks[5].title, baseStr);

    return Promise.all(tasks.map(function(task) {
      return task.task({}, task);
    }));
  }).then(function() {

    t.is(t.context.execaRuns.length, 6);
    const cmd = ['run', 'test', '--if-present'];
    const wsCmd = cmd.concat(['--workspace']);
    const options = {all: true, cwd: t.context.dir, env: {FORCE_COLOR: true}, reject: false, stdio: 'inherit'};

    // verify the execa command
    t.deepEqual(t.context.execaRuns, [
      ['npm', wsCmd.concat([path.join('workspaces', 'a')]), options],
      ['npm', wsCmd.concat([path.join('workspaces', 'b')]), options],
      ['npm', wsCmd.concat([path.join('workspaces', 'c')]), options],
      ['npm', wsCmd.concat([path.join('workspaces2', 'd')]), options],
      ['npm', wsCmd.concat([path.join('workspaces3', 'e')]), options],
      ['npm', cmd, options]
    ]);

    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
  });
});

test('execa verbose', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', include: ['a', 'b'], renderer: 'verbose'}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: 'verbose'
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 2);

    return Promise.all(tasks.map(function(task) {
      return task.task({}, task);
    }));
  }).then(function() {
    t.is(t.context.execaRuns.length, 2);
    const cmd = ['run', 'test', '--workspace'];
    const options = {all: true, cwd: t.context.dir, env: {FORCE_COLOR: true}, reject: false};

    // verify the execa command
    t.deepEqual(t.context.execaRuns, [
      ['npm', cmd.concat([path.join('workspaces', 'a')]), options],
      ['npm', cmd.concat([path.join('workspaces', 'b')]), options]
    ]);

    t.deepEqual(t.context.logs, [
      '',
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces', 'a')}" SUCCESS**`,
      'foo',
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces', 'a')}" SUCCESS**`,
      '',
      '',
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces', 'b')}" SUCCESS**`,
      'foo',
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces', 'b')}" SUCCESS**`,
      ''
    ]);
    t.deepEqual(t.context.errors, []);
  });
});

test('dryRun works', function(t) {
  return t.context.npmRunWs({npmScriptName: 'test', dryRun: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
    });
    const tasks = t.context.currentRunner.tasks;
    const baseStr = 'npm run test --workspace';

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `${baseStr} ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `${baseStr} ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `${baseStr} ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `${baseStr} ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `${baseStr} ${path.join('workspaces3', 'e')}`);

    tasks.forEach(function(task) {
      task.task({}, task);
    });

    // nothing is run thorugh execa
    t.deepEqual(t.context.execaRuns, []);
    t.deepEqual(t.context.logs, [
      'NOTE: this is a dry run, commands are not actually being run!'
    ]);
    t.deepEqual(t.context.errors, []);
  });
});

test('can fail', function(t) {
  t.context.taskFail = true;
  t.context.execaReturn.exitCode = 1;
  const baseStr = 'npm run test --workspace';

  return t.context.npmRunWs({npmScriptName: 'test'}).then(function(exitCode) {

    t.is(exitCode, 1);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 5);
    t.is(tasks[0].title, `${baseStr} ${path.join('workspaces', 'a')}`);
    t.is(tasks[1].title, `${baseStr} ${path.join('workspaces', 'b')}`);
    t.is(tasks[2].title, `${baseStr} ${path.join('workspaces', 'c')}`);
    t.is(tasks[3].title, `${baseStr} ${path.join('workspaces2', 'd')}`);
    t.is(tasks[4].title, `${baseStr} ${path.join('workspaces3', 'e')}`);

    return Promise.all(tasks.map(function(task) {
      return task.task({}, task).catch(() => {});
    }));
  }).then(function() {

    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors.sort(), [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `* npm run test --workspace ${path.join('workspaces', 'a')}`,
      `* npm run test --workspace ${path.join('workspaces', 'b')}`,
      `* npm run test --workspace ${path.join('workspaces', 'c')}`,
      `* npm run test --workspace ${path.join('workspaces2', 'd')}`,
      `* npm run test --workspace ${path.join('workspaces3', 'e')}`,
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces', 'a')}" FAILURE**`,
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces', 'b')}" FAILURE**`,
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces', 'c')}" FAILURE**`,
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces2', 'd')}" FAILURE**`,
      `** END OUTPUT for "npm run test --workspace ${path.join('workspaces3', 'e')}" FAILURE**`,
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces', 'a')}" FAILURE**`,
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces', 'b')}" FAILURE**`,
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces', 'c')}" FAILURE**`,
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces2', 'd')}" FAILURE**`,
      `** START OUTPUT for "npm run test --workspace ${path.join('workspaces3', 'e')}" FAILURE**`,
      'The following commands failed:',
      'foo',
      'foo',
      'foo',
      'foo',
      'foo'
    ].sort());
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

test('works in a subdirectory', function(t) {
  const directory = path.join(t.context.dir, 'workspaces');

  return t.context.npmRunWs({npmScriptName: 'test', include: ['a'], directory}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.truthy(t.context.currentRunner);
    t.deepEqual(t.context.currentRunner.options, {
      concurrent: os.cpus().length,
      exitOnError: false,
      renderer: getDefaultOptions().renderer
    });
    const tasks = t.context.currentRunner.tasks;

    t.is(tasks.length, 1);
    t.is(tasks[0].title, `npm run test --workspace ${path.join('workspaces', 'a')}`);

    tasks.forEach(function(task) {
      task.task({}, task);
    });

    const options = {all: true, cwd: t.context.dir, env: {FORCE_COLOR: true}, reject: false};

    t.is(t.context.execaRuns.length, 1);
    // verify the execa command
    t.deepEqual(t.context.execaRuns, [
      ['npm', ['run', 'test', '--workspace', path.join('workspaces', 'a')], options]
    ]);
  });
});
