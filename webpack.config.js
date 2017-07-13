var path = require('path');

module.exports = {
  entry: './lib/client.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'assets')
  }
}
