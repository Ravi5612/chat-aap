const path = 'C:\\Users\\USER\\astrology-in-bharat\\ChatWarriors\\metro.config.js';
console.log('Trying to require:', path);
try {
    const config = require(path);
    console.log('Success!', config);
} catch (e) {
    console.error('Failed!', e);
}
