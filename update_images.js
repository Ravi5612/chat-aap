const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.expo') && !fullPath.includes('.git')) {
                results = results.concat(walk(fullPath));
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('./app').concat(walk('./components'));
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // First check if it has Image from react-native
    const rnImageRegex = /import\s+{[^}]*\bImage\b[^}]*}\s+from\s+['"]react-native['"]/g;
    
    if (rnImageRegex.test(content)) {
        // Remove Image from react-native import
        content = content.replace(/(import\s+{[^}]*?)\bImage\b,?\s*([^}]*?}\s+from\s+['"]react-native['"])/g, '$1$2');
        // Clean up empty commas
        content = content.replace(/{\s*,/, '{').replace(/,\s*}/, '}').replace(/,\s*,/, ',');
        
        // Add expo-image import if missing
        if (!content.includes("from 'expo-image'") && !content.includes('from "expo-image"')) {
            // Find a good place to insert it (after the react-native import)
            content = content.replace(/(import .* from ['"]react-native['"];?)/, "$1\nimport { Image } from 'expo-image';");
        }
        modified = true;
    }

    // Now append cachePolicy="memory-disk" to all <Image tags that don't have it
    if (content.includes('<Image ')) {
        const originalContent = content;
        content = content.replace(/<Image([^>]*?)(?:\/?>|>)/g, (match, p1) => {
            if (p1.includes('cachePolicy')) return match;
            if (match.endsWith('/>')) {
                return '<Image' + p1 + ' cachePolicy="memory-disk" />';
            } else {
                return '<Image' + p1 + ' cachePolicy="memory-disk">';
            }
        });
        
        if (content !== originalContent) {
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log('Modified ' + modifiedCount + ' files.');
