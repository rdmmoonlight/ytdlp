const rspack = require('@rspack/core');
const path = require('path');

/** @type {import('@rspack/cli').Configuration} */
module.exports = {
    entry: {
        main: './src/index.tsx',
    },
    resolve: {
        extensions: ['...', '.ts', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'builtin:swc-loader',
                        options: {
                            jsc: {
                                parser: {
                                    syntax: 'typescript',
                                    tsx: true,
                                },
                                transform: {
                                    react: {
                                        runtime: 'automatic',
                                    },
                                },
                            },
                        },
                    },
                ],
                type: 'javascript/auto',
            },
        ],
    },
    plugins: [
        new rspack.HtmlRspackPlugin({
            template: './public/index.html',
        }),
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
};