const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCustomSound = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resRawDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');
      
      // Create raw directory if it doesn't exist
      if (!fs.existsSync(resRawDir)) {
        fs.mkdirSync(resRawDir, { recursive: true });
      }

      // Source and destination paths
      const sourcePath = path.join(projectRoot, 'assets', 'sounds', 'ringtone.mp3');
      const destPath = path.join(resRawDir, 'ringtone.mp3');

      // Copy the file
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log('Copied ringtone.mp3 to android res/raw directory');
      } else {
        console.warn('Custom ringtone not found at assets/sounds/ringtone.mp3');
      }

      return config;
    },
  ]);
};

module.exports = withCustomSound;
