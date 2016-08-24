var spawn = require('child_process').spawn;
var Promise = global.Promise || require('bluebird');

module.exports = function ()
{
    return gitExec(['status', '--porcelain']).then(function (output)
    {
        if (output)
            throw new Error('working directory must be clean, but got files:\n' + output);
    });
};

function gitExec(command)
{
    return new Promise(function (resolve, reject)
    {
        var proc = spawn('git', command, {stdio: ['inherit', 'pipe', 'inherit']});

        var output = '';

        proc.stdout.on('data', function (data)
        {
            output += data;
        });

        proc.on('exit', function (code)
        {
            if (code === 0)
                resolve(output);
            else
                reject(new Error('git exited with code ' + code));
        });
    });
}
