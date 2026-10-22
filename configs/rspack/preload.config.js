const path = require('node:path')

const root = path.resolve(__dirname, '../..')

module.exports = {
    name: 'preload',
    target: 'electron-preload',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    entry: path.join(root, 'src/preload/index.js'),
    output: {
        path: path.join(root, 'dist/preload'),
        filename: 'index.js',
        clean: true,
        library: {
            type: 'commonjs2'
        }
    },
    externals: {
        electron: 'commonjs electron'
    },
    optimization: {
        minimize: false
    }
}
