const path = require('path')
const nodeExternals = require('webpack-node-externals')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  entry: './bin/www',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  target: 'node',
  externals: [nodeExternals()],
  mode: 'development',
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['@babel/preset-env']
      },
      parser: {
        amd: false
      }
    }]
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin()
    ]
  }
}