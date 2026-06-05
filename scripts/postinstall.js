const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'node_modules', 'react-native-worklets');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(path.join(dir, 'plugin.js'), 'module.exports = function() { return { name: "fake", visitor: {} }; };');
