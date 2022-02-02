const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const helpers = require('./helpers.js');
const getWorkspaceList = require('../src/get-workspace-list.js');

test.beforeEach(helpers.beforeEach);
test.afterEach(helpers.afterEach);

test('finds workspaces using *', function(t) {
  t.context.createWorkspace(path.join('workspaces', 'foo'));
  t.context.createWorkspace(path.join('workspaces', 'bar'));
  t.context.createWorkspace(path.join('workspaces', 'baz'));
  t.context.createWorkspace(path.join('workspaces2', 'baz2'));
  t.context.createWorkspace(path.join('workspaces3', 'buzz'));

  const list = getWorkspaceList({
    workspaces: ['workspaces/*', 'workspaces2/*', 'workspaces3/*']
  }, t.context.dir);

  t.deepEqual(list.sort(), [
    path.join('workspaces', 'foo'),
    path.join('workspaces', 'bar'),
    path.join('workspaces', 'baz'),
    path.join('workspaces2', 'baz2'),
    path.join('workspaces3', 'buzz')
  ].sort());
});

test('finds workspaces using a directory', function(t) {
  t.context.createWorkspace(path.join('workspaces', 'foo'));
  t.context.createWorkspace(path.join('workspaces', 'bar'));
  t.context.createWorkspace(path.join('workspaces', 'baz'));
  t.context.createWorkspace(path.join('workspaces2', 'baz2'));
  t.context.createWorkspace(path.join('workspaces3', 'buzz'));

  const list = getWorkspaceList({
    workspaces: ['workspaces/foo', 'workspaces2/baz2', 'workspaces3/buzz']
  }, t.context.dir);

  t.deepEqual(list.sort(), [
    path.join('workspaces', 'foo'),
    path.join('workspaces2', 'baz2'),
    path.join('workspaces3', 'buzz')
  ].sort());
});

test('finds workspaces using a directory and *', function(t) {
  t.context.createWorkspace(path.join('workspaces', 'foo'));
  t.context.createWorkspace(path.join('workspaces', 'bar'));
  t.context.createWorkspace(path.join('workspaces', 'baz'));
  t.context.createWorkspace(path.join('workspaces2', 'baz2'));
  t.context.createWorkspace(path.join('workspaces3', 'buzz'));

  const list = getWorkspaceList({
    workspaces: ['workspaces/foo', 'workspaces2/baz2', 'workspaces3/buzz', 'workspaces/*']
  }, t.context.dir);

  t.deepEqual(list.sort(), [
    path.join('workspaces', 'foo'),
    path.join('workspaces2', 'baz2'),
    path.join('workspaces3', 'buzz'),
    path.join('workspaces', 'bar'),
    path.join('workspaces', 'baz')
  ].sort());
});

test('does not error with empty workspaces in package.json', function(t) {
  const list = getWorkspaceList({
    workspaces: []
  }, t.context.dir);

  t.deepEqual(list, []);
});

test('does not error with empty no workspaces key in package.json', function(t) {
  const list = getWorkspaceList({}, t.context.dir);

  t.deepEqual(list, []);
});

test('does not error with no package.json', function(t) {
  const list = getWorkspaceList(null, t.context.dir);

  t.deepEqual(list, []);
});

test('does not error without workspace directories', function(t) {
  const list = getWorkspaceList({workspaces: ['workspaces/*']}, t.context.dir);

  t.deepEqual(list, []);
});

test('does not error with a missing workspace dir', function(t) {
  t.context.createWorkspace(path.join('workspaces', 'foo'));
  t.context.createWorkspace(path.join('workspaces3', 'buzz'));

  const list = getWorkspaceList({
    workspaces: ['workspaces/foo', 'workspaces2/baz2', 'workspaces3/buzz']
  }, t.context.dir);

  t.deepEqual(list.sort(), [
    path.join('workspaces', 'foo'),
    path.join('workspaces3', 'buzz')
  ].sort());
});

test('does not detect workspace with missing package.json', function(t) {
  t.context.createWorkspace(path.join('workspaces', 'foo'));
  t.context.createWorkspace(path.join('workspaces2', 'baz2'));
  t.context.createWorkspace(path.join('workspaces3', 'buzz'));

  shell.rm('-f', path.join(t.context.dir, 'workspaces2', 'baz2', 'package.json'));

  const list = getWorkspaceList({
    workspaces: ['workspaces/foo', 'workspaces2/baz2', 'workspaces3/buzz']
  }, t.context.dir);

  t.deepEqual(list.sort(), [
    path.join('workspaces', 'foo'),
    path.join('workspaces3', 'buzz')
  ].sort());
});
