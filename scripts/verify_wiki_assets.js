const fs = require('fs');
const path = require('path');

const files = [
  'wiki.html',
  'assets/css/wiki.css',
  'assets/js/wiki.js'
];

let allPassed = true;

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists.`);
    const content = fs.readFileSync(file, 'utf8');
    if (file === 'wiki.html' && !content.includes('assets/css/wiki.css')) {
      console.error(`❌ ${file} does not link to CSS.`);
      allPassed = false;
    }
    if (file === 'wiki.html' && !content.includes('assets/js/wiki.js')) {
        console.error(`❌ ${file} does not link to JS.`);
        allPassed = false;
    }
  } else {
    console.error(`❌ ${file} missing.`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('Wiki Verification Passed!');
  process.exit(0);
} else {
  console.error('Wiki Verification Failed!');
  process.exit(1);
}
