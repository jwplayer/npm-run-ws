const pty = require('node-pty');
const onExit = require('signal-exit');
const which = require('which');

const spawn = (cmd, args, options) => which(cmd).then((realcmd) => new Promise(function(resolve, reject) {
  let all = '';

  options = Object.assign({
    cwd: process.env.cwd,
    env: {}
  }, options);

  options.env = Object.assign({}, process.env, options.env);

  const stream = options.stream;
  const child = pty.spawn(realcmd, args, options);

  const removeExitHandler = onExit(() => {
    child.kill();
  });

  child.on('data', function(data) {
    all += data;

    if (stream) {
      process.stdout.write(data);
    }
  });

  child.on('exit', function(exitCode) {
    removeExitHandler();
    resolve({exitCode, all: all.trim()});
  });
}));

module.exports = spawn;
