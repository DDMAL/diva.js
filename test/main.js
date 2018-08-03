
const srcContext = require.context('../source/js', true, /\.js$/);
srcContext.keys().forEach(srcContext);

const testsContext = require.context('.', true, /\.js$/);
testsContext.keys().forEach(testsContext);