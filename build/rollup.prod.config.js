var babel = require('rollup-plugin-babel')
var babel = require('rollup-plugin-babel')
var resolve = require('rollup-plugin-node-resolve')
var commonjs = require('rollup-plugin-commonjs')
var eslint = require('rollup-plugin-eslint')
var license = require('rollup-plugin-license')
var uglify = require('rollup-plugin-uglify')

var path = require('path')
var pkg = require('../package.json')

module.exports = {
  input: path.resolve(__dirname, '../src/index.js'),
  output: [
    {
      file: path.resolve(__dirname, '../dist/weapp.qrcode.min.js'),
      format: 'umd'
    },
    {
      file: path.resolve(__dirname, '../dist/weapp.qrcode.common.js'),
      format: 'cjs'
    },
    {
      file: path.resolve(__dirname, '../dist/weapp.qrcode.esm.js'),
      format: 'es'
    }
  ],
  moduleName: 'drawQrcode',
  plugins: [
    eslint(),
    resolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs(),
    babel({
      exclude: 'node_modules/**'
    }),
    uglify({
      compress: {
        // 'drop_console': true
      }  
    }),
    license({
      banner: 'weapp.qrcode.js v' + pkg.version + ' (' + pkg.homepage + ')'
    })
  ]
}