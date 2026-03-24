const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)){
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

console.log('Downloading face-api.js models to public/models...');

let downloaded = 0;

files.forEach(file => {
  const dest = path.join(modelsDir, file);
  const fileStream = fs.createWriteStream(dest);
  
  https.get(baseUrl + file, (response) => {
    if (response.statusCode !== 200) {
       console.error(`Failed to download ${file}, status code: ${response.statusCode}`);
       return;
    }
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      downloaded++;
      console.log(`Downloaded ${file} (${downloaded}/${files.length})`);
      if (downloaded === files.length) {
        console.log('\n✅ All models downloaded successfully! You can now start the frontend.');
      }
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});
