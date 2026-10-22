const path = require('node:path')

const root = path.resolve(__dirname, '../..')

module.exports = {
    name: 'main',
    target: 'electron-main',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    entry: path.join(root, 'src/main/index.js'),
    output: {
        path: path.join(root, 'dist/main'),
        filename: 'index.js',
        clean: true,
        library: {
            type: 'commonjs2'
        }
    },
    externals: {
        'better-sqlite3': 'commonjs better-sqlite3',
        electron: 'commonjs electron'
    },
    node: {
        __dirname: false,
        __filename: false
    },
    optimization: {
        minimize: false
    }
}
