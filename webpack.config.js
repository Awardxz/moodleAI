const path = require('path');
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = (env, argv) => {
  const isProd = (argv.mode || process.env.NODE_ENV) !== 'development';

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'inline-source-map',
    entry: {
      content: './src/content/index.js',
      popup: './src/popup/popup.js',
      background: './src/background.js',
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    plugins: isProd
      ? [
          new JavaScriptObfuscator(
            {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              deadCodeInjection: false,
              debugProtection: false,
              disableConsoleOutput: false,
              identifierNamesGenerator: 'hexadecimal',
              log: false,
              numbersToExpressions: true,
              renameGlobals: false,
              selfDefending: false,
              simplify: true,
              splitStrings: true,
              splitStringsChunkLength: 8,
              stringArray: true,
              stringArrayCallsTransform: true,
              stringArrayEncoding: ['base64'],
              stringArrayIndexShift: true,
              stringArrayRotate: true,
              stringArrayShuffle: true,
              stringArrayWrappersCount: 2,
              stringArrayWrappersChainedCalls: true,
              stringArrayWrappersParametersMaxCount: 3,
              stringArrayWrappersType: 'function',
              stringArrayThreshold: 0.75,
              transformObjectKeys: true,
              unicodeEscapeSequence: false,
            },
            // Second arg = files to EXCLUDE from obfuscation (keep popup/background readable)
            ['popup.bundle.js', 'background.bundle.js']
          ),
        ]
      : [],
    optimization: {
      minimize: isProd,
    },
    performance: {
      hints: false,
    },
  };
};
