let webpackConfig = require('./webpack.config');
webpackConfig.entry = {};

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: [
      'tests/**/*_test.js'
    ],
    exclude: [
    ],
    preprocessors: {
        'tests/**/*_test.js': ['webpack']
    },
    webpack: webpackConfig,
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity
  })
};

// let webpackConfig = require('./webpack.config');
// webpackConfig.entry = {};

// module.exports = function (config)
// {
//     config.set({
//         basePath: '',
//         frameworks: ['mocha'],
//         files: [
//             'tests/**/*_test.js'
//         ],
//         exclude: ["/node_modules/"],
//         preprocessors: {
//             // 'source/js/diva.js': ['webpack'],
//             'tests/**/*_test.js': ['webpack']
//         },
//         webpack: webpackConfig,
//         reporters: ['progress'],
//         port: 9877,
//         colors: true,
//         logLevel: config.LOG_INFO,
//         autoWatch: true,
//         browsers: ['PhantomJS'],
//         singleRun: false,
//         concurrency: Infinity
//     });
// };
