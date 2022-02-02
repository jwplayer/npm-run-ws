const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const fs = require('fs');
const helpers = require('./helpers.js');
const npmRunWs = require('../src/run.js');
const getDefaultOptions = require('../src/get-default-options.js');

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
    log(...args) {
      t.context.logs.push.apply(t.context.logs, args);
    },
    error(...args) {
      t.context.errors.push.apply(t.context.errors, args);
    }
  };
  t.context.npmRunWs = function(options) {
    options = Object.assign(
      getDefaultOptions(),
      {directory: t.context.dir},
      options
    );

    options.console = t.context.console;

    return npmRunWs(options);
  };
});
test.afterEach.always(helpers.afterEach);

test('can run', function(t) {
  return t.context.npmRunWs({npmScriptName: 'foo', ifPresent: true, includeRoot: true}).then(function(exitCode) {
    t.is(exitCode, 0);
    t.deepEqual(t.context.logs.sort(), [].sort());
    t.deepEqual(t.context.errors, []);

    t.false(shell.test('-f', path.join(t.context.dir, 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'a', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'b', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces', 'c', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces2', 'd', 'run-test')));
    t.true(shell.test('-f', path.join(t.context.dir, 'workspaces3', 'e', 'run-test')));
  });
});
