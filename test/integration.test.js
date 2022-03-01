const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const fs = require('fs');
const helpers = require('./helpers.js');
const npmRunWs = require('../src/run.js');
const getDefaultOptions = require('../src/get-default-options.js');

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

  delete pkgObject.scripts.foo;

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
  t.context.npmRunWs = function(options) {
    options = Object.assign(
      getDefaultOptions(),
      {directory: t.context.dir},
      options
    );

    options.console = t.context.console;
    options.isCI = false;

    return npmRunWs(options);
  };
});
test.afterEach.always(helpers.afterEach);

test('can run', function(t) {
  return t.context.npmRunWs({npmScriptName: 'foo', ifPresent: true, includeRoot: true}).then(function(exitCode) {
    t.is(exitCode, 0);

    t.false(shell.test('-f', path.join(t.context.dir, 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'a', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'b', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'c', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces2', 'd', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces3', 'e', 'run-test')));

    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
  });
});

test('can run verbose', function(t) {
  return t.context.npmRunWs({npmScriptName: 'foo', ifPresent: true, includeRoot: true, renderer: 'verbose'}).then(function(exitCode) {
    t.is(exitCode, 0);

    t.false(shell.test('-f', path.join(t.context.dir, 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'a', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'b', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'c', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces2', 'd', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces3', 'e', 'run-test')));

    t.deepEqual(t.context.logs.sort(), [
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
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `** END OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces', 'a')}" SUCCESS**`,
      `** END OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces', 'b')}" SUCCESS**`,
      `** END OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces', 'c')}" SUCCESS**`,
      `** END OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces2', 'd')}" SUCCESS**`,
      `** END OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces3', 'e')}" SUCCESS**`,
      `** START OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces', 'a')}" SUCCESS**`,
      `** START OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces', 'b')}" SUCCESS**`,
      `** START OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces', 'c')}" SUCCESS**`,
      `** START OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces2', 'd')}" SUCCESS**`,
      `** START OUTPUT for "npm run foo --if-present --workspace ${path.join('workspaces3', 'e')}" SUCCESS**`,
      '> a@1.0.0 foo',
      '> b@1.0.0 foo',
      '> c@1.0.0 foo',
      '> d@1.0.0 foo',
      '> e@1.0.0 foo',
      '> node -e "fs.writeFileSync(\'run-test\', \'\')"',
      '> node -e "fs.writeFileSync(\'run-test\', \'\')"',
      '> node -e "fs.writeFileSync(\'run-test\', \'\')"',
      '> node -e "fs.writeFileSync(\'run-test\', \'\')"',
      '> node -e "fs.writeFileSync(\'run-test\', \'\')"'
    ].sort());
    t.deepEqual(t.context.errors, []);
  });
});

test('can run in root', function(t) {
  const pkgObject = JSON.parse(fs.readFileSync(path.join(t.context.dir, 'package.json'), {encoding: 'utf-8'}));

  pkgObject.scripts = {foo: "node -e \"fs.writeFileSync('run-test', '')\""};

  fs.writeFileSync(path.join(t.context.dir, 'package.json'), JSON.stringify(pkgObject, null, 2));
  return t.context.npmRunWs({npmScriptName: 'foo', includeRoot: true}).then(function(exitCode) {
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);

    t.is(exitCode, 0);

    t.true(shell.test('-f', path.join(t.context.dir, 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'a', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'b', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'c', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces2', 'd', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces3', 'e', 'run-test')));
  });
});

test('can fail', function(t) {
  const wsPkg = path.join(t.context.dir, 'workspaces', 'a', 'package.json');
  const pkgObject = JSON.parse(fs.readFileSync(wsPkg, {encoding: 'utf-8'}));

  pkgObject.scripts = {foo: 'this-command-does-not-exist'};

  fs.writeFileSync(wsPkg, JSON.stringify(pkgObject, null, 2));
  return t.context.npmRunWs({npmScriptName: 'foo', ifPresent: true, includeRoot: true}).then(function(exitCode) {
    t.deepEqual(t.context.logs, []);
    t.truthy(t.context.errors.length > 0);

    t.is(exitCode, 1);
  });
});
