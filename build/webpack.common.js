const path = require('path');

module.exports = {
  entry: './src/index.js',
  externals: {
    'vue/dist/vue.esm': {
      root: 'Vue',
      commonjs: 'vue/dist/vue.esm',
      commonjs2: 'vue/dist/vue.esm',
      amd: 'vue/dist/vue.esm'
    }
  },
  output: {
    filename: 'style-select.js',
    path: path.resolve(__dirname, '../dist'),
    library: 'StyleSelect',
    libraryTarget: "umd",
    libraryExport: 'default',
    auxiliaryComment: {
      root: "Root",
      commonjs: "CommonJS",
      commonjs2: "CommonJS2",
      amd: "AMD"
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  }
};
