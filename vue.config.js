const webpack = require('webpack');
let commitHash = require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString();

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
                    'VERSION': JSON.stringify(commitHash),
                })
            ]
        }
    }
}
