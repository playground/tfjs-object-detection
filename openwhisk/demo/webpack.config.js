const path = require('path');
const fs = require('fs');
const CopyPlugin = require('copy-webpack-plugin');
const { TsConfigPathsPlugin } = require('awesome-typescript-loader');
const { ContextReplacementPlugin, IgnorePlugin } = require('webpack');
const dist = 'dist';  // be aware 'dist' folder is also used for tsconfig output

module.exports = {
  entry: {
    'demo-action': `./src/demo-action.ts`
  },
  output: {
    path: path.resolve(__dirname, dist),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/
      }
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'dist/common/src/utility.js',
          to: '../js/utility.js'
        },
        {
          from: 'dist/common/src/messenger.js',
          to: '../js/messenger.js'
        },
        {
          from: 'dist/demo/src/demo-action.js',
          to: '../index.js'
        }
    ]})
  ],
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.json'],
    plugins: [
      new TsConfigPathsPlugin({configFile: './tsconfig.json'})
    ],
    alias: {
      '@common/*': '../common/src'
    }
  },
  externalsPresets: { node: true }, // in order to ignore built-in modules like path, fs, etc.
  mode: 'production',
  target: 'node',
  node: {
    __dirname: true,
    global: true
  },
  externals: {
    // pre-defined modules computed below  
  }
}

// https://console.bluemix.net/docs/openwhisk/openwhisk_reference.html#openwhisk_ref_javascript_environments_8
const installedModules = [
  'amqplib',
  'apn',
  'async',
  'bent',
  'body-parser',
  'btoa',
  'cassandra-driver',
  'cloudant',
  '@cloudant\/cloudant',
  'commander',
  'composeaddresstranslator',
  'consul',
  'cookie-parser',
  'cradle',
  'elasticsearch',
  'errorhandler',
  'etcd3',
  'express',
  'express-session',
  'formidable',
  'glob',
  'gm',
  'ibm-cos-sdk',
  'ibm_db',
  'ibmiotf',
  'iconv-lite',
  'jsdom',
  'jsonwebtoken',
  'lodash',
  'log4js',
  'marked',
  'merge',
  'moment',
  '@tensorflow\/tfjs-node',
  'play-sound',
  'ffmpeg',
  'querystring',
  'mysql',
  'mustache',
  'nano',
  'nodemailer',
  'oauth2-server',
  'openwhisk',
  'path-to-regex',
  'pg',
  'process',
  'pug',
  'redis',
  'request',
  'request-promise',
  'rimraf',
  'semver',
  '@sendgrid/mail@6.3.1',
  'serve-favicon',
  'superagent',
  'twilio',
  'underscore',
  'url-pattern',
  'uuid',
  'validator',
  'watson-developer-cloud',
  'when',
  'winston',
  'ws',
  'xml2js',
  'xmlhttprequest',
  'yauzl'
  ];

  installedModules.forEach((nodeModule) => module.exports.externals[nodeModule] = `commonjs ${nodeModule}`); // don't bundle externals; leave as require('module')
