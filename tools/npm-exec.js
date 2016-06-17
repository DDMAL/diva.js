var spawn = require('child_process').spawn;
var Promise = global.Promise || require('bluebird');

module.exports = function (command)
{
    return new Promise(function (resolve, reject)
    {
        console.log('executing npm ' + command.join(' '));
        var proc = spawn('npm', command, {shell: true, stdio: 'inherit'});

        proc.on('error', function (err)
        {
            console.error('failed to call npm ' + command[0] + ': ' + err);
            reject(err);
        });

        proc.on('exit', function (code)
        {
            if (code === 0)
                resolve();
            else
                reject(new Error('npm exited with code ' + code));
        });
    });
};
