var babel = require('rollup-plugin-babel')
var resolve = require('rollup-plugin-node-resolve')
var commonjs = require('rollup-plugin-commonjs')
var replace = require('rollup-plugin-replace')
var eslint = require('rollup-plugin-eslint')

var path = require('path')

var pkg = require('../package.json')

module.exports = {
  input: path.resolve(__dirname, '../src/index.js'),
  output: {
    file: path.resolve(__dirname, '../dist/weapp.qrcode.js'),
    format: 'umd',
    banner: '// weapp.qrcode.js v' + pkg.version + ' (' + pkg.homepage + ')'
  },
  moduleName: 'umd',
  sourcemap: 'inline',
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
    replace({
      exclude: 'node_modules/**',
      __VERSION__: JSON.stringify(pkg.version),
      ENV: JSON.stringify(process.env.NODE_ENV || 'dev')
    })
  ]
}