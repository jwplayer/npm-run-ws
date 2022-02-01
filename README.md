<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [npm-run-ws](#npm-run-ws)
  - [Installation](#installation)
  - [--help](#--help)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# npm-run-ws

Run npm workspace scripts with extra features like serial, parallel, and root project runs.

## Installation
To install run

```
npm i --save-dev npm-run-ws
```

## --help

```


  Usage: npm-run-ws [--if-present|--include-root] <script-name>

  Run npm workspace scripts with extra features like serial, parallel, and root project runs.

  -v,  --version            Print the version of videojs-generator-verify.
  -V,  --verbose            Print the output of everything.
  -ip, --if-present         Only run the npm script if present on the workspace.
  -s,  --serial             Run the npm workspace script serially.
  -ir, --include-root       Run the script on the root workspace as well.
  -i,  --include [glob]     Run on workspaces that match this. Can pass more than one.
  -e,  --exclude [glob]     Run on workspaces that do not match this. Can pass more than one
  -d,  --directory [dir]    Run in this project directory, defaults to cwd.
  --list-workspaces         list workspaces, separated by newlines, with relative directory.
  --dry-run                 Show the ui and commands of what would have been run, without running.

```
