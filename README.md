<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [@jwplayer/npm-run-ws](#jwplayernpm-run-ws)
  - [Installation](#installation)
  - [--help](#--help)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# @jwplayer/npm-run-ws

Run npm workspace scripts with extra features like serial, parallel, and root project runs.

After instalation an `npm-run-ws` binary will be added to our local node modules bin directory for running.

## Installation
To install run

```
npm i --save-dev @jwplayer/npm-run-ws
```

## --help

```

  Usage: @jwplayer/npm-run-ws [--if-present|--include-root] <script-name>

  Run npm workspace scripts with extra features like serial, parallel, and root project runs.

  -v,  --version             Print the version of @jwplayer/npm-run-ws.
  -V,  --verbose             Print the output of everything.
  -ip, --if-present          Only run the npm script if present on the workspace.
  -s,  --serial              Run the npm workspace script serially.
  -q,  --quiet               Do not print anything when commands are being run.
  -in, --interactive         Interactive running list output.
  -ir, --include-root        Run the script on the root workspace as well.
  --include-workspace-root   Alias for --include-root used by npm.
  -i,  --include[=name,name] Run on workspaces that match this. Can pass more than one.
  -e,  --exclude[=name,name] Run on workspaces that do not match this. Can pass more than one
  -d,  --directory [dir]     Run in this project directory, defaults to cwd.
  --ignore-scripts           Ignore lifecycle scripts in parity with npm.
  --list-workspaces          list workspaces, separated by newlines, with relative directory.
  --dry-run                  Show the ui and commands of what would have been run, without running.

```
