const fs = require('fs');
const files = [
  'app/search.tsx',
  'app/notifications.tsx',
  'app/friend-requests.tsx',
  'app/sent-requests.tsx',
  'app/profile/[id].tsx',
  'app/group-info.tsx',
  'app/new-group.tsx',
  'app/status/viewer.tsx'
];
const appendStr = "\nexport { ScreenErrorBoundary as ErrorBoundary } from '@/components/ui/ScreenErrorBoundary';\n";

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    if (!content.includes('ScreenErrorBoundary as ErrorBoundary')) {
      fs.appendFileSync(f, appendStr);
      console.log('Appended to ' + f);
    } else {
      console.log('Already in ' + f);
    }
  } else {
    console.log('Not found: ' + f);
  }
});
