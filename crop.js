const sharp = require('sharp');

sharp('D:/warriors/chat-aap/assets/images/logo.png')
  .trim()
  .toFile('D:/warriors/chat-aap/assets/images/trimmed_logo.png')
  .then(() => console.log('Trim complete'))
  .catch(console.error);
