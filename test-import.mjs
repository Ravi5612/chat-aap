import { pathToFileURL } from 'url';
const path = 'C:\\Users\\USER\\astrology-in-bharat\\ChatWarriors\\metro.config.js';
const url = pathToFileURL(path).href;
console.log('Trying to import:', url);
try {
    const config = await import(url);
    console.log('Success!');
} catch (e) {
    console.error('Failed!', e);
}
