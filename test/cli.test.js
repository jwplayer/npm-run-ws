const test = require('ava');
const {version} = require('../package.json');
const {cli, printHelp} = require('../src/cli.js');
const getDefaultOptions = require('../src/get-default-options.js');

test.before((t) => {
  t.context.helpLogs = [];

  printHelp({
    log(...args) {
      t.context.helpLogs.push.apply(t.context.helpLogs, args);
    }
  });
});

test.beforeEach((t) => {
  t.context.defaultOptions = getDefaultOptions();
  t.context.exitCode = null;
  t.context.exit = (code = 0) => {
    t.context.exitCode = code;
  };
  t.context.logs = [];
  t.context.errors = [];
  t.context.console = {
    log: (...args) => {
      t.context.logs.push.apply(t.context.logs, args);
    },
    error: (...args) => {
      t.context.errors.push.apply(t.context.errors, args);
    }
  };
});

['-h', '--help'].forEach(function(arg) {
  test(`${arg} prints help`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);

    t.is(t.context.exitCode, 0);
    t.deepEqual(t.context.logs, t.context.helpLogs);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, t.context.defaultOptions);
  });
});

['-v', '--version'].forEach(function(arg) {
  test(`${arg} prints version`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);

    t.is(t.context.exitCode, 0);
    t.deepEqual(t.context.logs, [version]);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, t.context.defaultOptions);
  });
});

test('--list-workspaces sets listWorkspace', (t) => {
  const options = cli(['--list-workspaces'], t.context.console, t.context.exit);
  const expectedOptions = Object.assign({}, t.context.defaultOptions, {
    listWorkspaces: true
  });

  t.is(t.context.exitCode, null);
  t.deepEqual(t.context.logs, []);
  t.deepEqual(t.context.errors, []);
  t.deepEqual(options, expectedOptions);
});

test('--dry-run sets dryRun', (t) => {
  const options = cli(['--dry-run'], t.context.console, t.context.exit);
  const expectedOptions = Object.assign({}, t.context.defaultOptions, {
    dryRun: true
  });

  t.is(t.context.exitCode, null);
  t.deepEqual(t.context.logs, []);
  t.deepEqual(t.context.errors, []);
  t.deepEqual(options, expectedOptions);
});

['-V', '--verbose'].forEach(function(arg) {
  test(`${arg} sets renderer to verbose`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      renderer: 'verbose'
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

['-q', '--quiet'].forEach(function(arg) {
  test(`${arg} sets renderer to silent`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      renderer: 'silent'
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

['-in', '--interactive'].forEach(function(arg) {
  test(`${arg} sets renderer to default`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      renderer: 'default'
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

['-s', '--serial'].forEach(function(arg) {
  test(`${arg} sets serial`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      serial: true
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

['-ip', '--if-present'].forEach(function(arg) {
  test(`${arg} sets ifPresent`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      ifPresent: true
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

['-ir', '--include-root'].forEach(function(arg) {
  test(`${arg} sets ifPresent`, (t) => {
    const options = cli([arg], t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      includeRoot: true
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

[['-d', 'foo'], ['--directory', 'foo']].forEach(function(args) {
  test(`${args.join(' ')} sets directory to foo`, (t) => {
    const options = cli(args, t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      directory: 'foo'
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

[['-i', 'foo'], ['--include', 'foo']].forEach(function(args) {
  test(`${args.join(' ')} sets include to foo`, (t) => {
    const options = cli(args, t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      include: ['foo']
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

test('can pass include twice', (t) => {
  const options = cli(['-i', 'foo', '--include', 'bar'], t.context.console, t.context.exit);
  const expectedOptions = Object.assign({}, t.context.defaultOptions, {
    include: ['foo', 'bar']
  });

  t.is(t.context.exitCode, null);
  t.deepEqual(t.context.logs, []);
  t.deepEqual(t.context.errors, []);
  t.deepEqual(options, expectedOptions);
});

[['-e', 'foo'], ['--exclude', 'foo']].forEach(function(args) {
  test(`${args.join(' ')} sets exclude to foo`, (t) => {
    const options = cli(args, t.context.console, t.context.exit);
    const expectedOptions = Object.assign({}, t.context.defaultOptions, {
      exclude: ['foo']
    });

    t.is(t.context.exitCode, null);
    t.deepEqual(t.context.logs, []);
    t.deepEqual(t.context.errors, []);
    t.deepEqual(options, expectedOptions);
  });
});

test('can pass exclude twice', (t) => {
  const options = cli(['-e', 'foo', '--exclude', 'bar'], t.context.console, t.context.exit);
  const expectedOptions = Object.assign({}, t.context.defaultOptions, {
    exclude: ['foo', 'bar']
  });

  t.is(t.context.exitCode, null);
  t.deepEqual(t.context.logs, []);
  t.deepEqual(t.context.errors, []);
  t.deepEqual(options, expectedOptions);
});

test('npm script name set to unamed arg', (t) => {
  const options = cli(['foo'], t.context.console, t.context.exit);
  const expectedOptions = Object.assign({}, t.context.defaultOptions, {
    npmScriptName: 'foo'
  });

  t.is(t.context.exitCode, null);
  t.deepEqual(t.context.logs, []);
  t.deepEqual(t.context.errors, []);
  t.deepEqual(options, expectedOptions);
});

test('can set multiple arguments', (t) => {
  const options = cli([
    '-i', 'foo',
    '-e', 'foo',
    '-d', 'foo',
    '-s', '-ip',
    '-ir', '-V',
    'foo'
  ], t.context.console, t.context.exit);
  const expectedOptions = Object.assign({}, t.context.defaultOptions, {
    directory: 'foo',
    include: ['foo'],
    exclude: ['foo'],
    includeRoot: true,
    ifPresent: true,
    renderer: 'verbose',
    npmScriptName: 'foo',
    serial: true
  });

  t.is(t.context.exitCode, null);
  t.deepEqual(t.context.logs, []);
  t.deepEqual(t.context.errors, []);
  t.deepEqual(options, expectedOptions);
});
