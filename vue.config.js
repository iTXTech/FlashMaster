const webpack = require('webpack');

module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    productionSourceMap: false,
    publicPath: './',
    configureWebpack: config => {
        return {
            plugins: [
                new webpack.DefinePlugin({
                    'VERSION': JSON.stringify(require('./package.json').version),
                })
            ]
        }
    }
}
