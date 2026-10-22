const path = require('node:path')
const rspack = require('@rspack/core')

const root = path.resolve(__dirname, '../..')
const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
    name: 'renderer',
    target: 'web',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'source-map',
    entry: path.join(root, 'src/renderer/index.jsx'),
    output: {
        path: path.join(root, 'dist/renderer'),
        filename: isProduction ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
        publicPath: isProduction ? './' : '/',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'builtin:swc-loader',
                        options: {
                            jsc: {
                                parser: {
                                    syntax: 'ecmascript',
                                    jsx: true
                                },
                                transform: {
                                    react: {
                                        runtime: 'automatic',
                                        development: !isProduction
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader']
            },
            {
                test: /\.svg$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/[name].[contenthash:8][ext]'
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
            '@': path.join(root, 'src/renderer'),
            '@brand': path.join(root, 'resources')
        }
    },
    plugins: [
        new rspack.HtmlRspackPlugin({
            template: path.join(root, 'index.html')
        })
    ],
    optimization: {
        minimize: isProduction
    }
}
