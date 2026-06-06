const { withAndroidManifest } = require('@expo/config-plugins');

const withPiP = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    const activity = application.activity.find((a) => a.$['android:name'] === '.MainActivity');

    if (activity) {
      // Add supportsPictureInPicture
      activity.$['android:supportsPictureInPicture'] = 'true';

      // Update configChanges to prevent activity restart during PiP transitions
      let configChanges = activity.$['android:configChanges'] || '';
      const requiredChanges = ['orientation', 'keyboardHidden', 'keyboard', 'screenSize', 'smallestScreenSize', 'screenLayout'];
      
      requiredChanges.forEach(change => {
          if (!configChanges.includes(change)) {
              if (configChanges.length > 0) configChanges += '|';
              configChanges += change;
          }
      });
      activity.$['android:configChanges'] = configChanges;
    }

    return config;
  });
};

module.exports = withPiP;
