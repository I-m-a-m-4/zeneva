import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({ 
  cloud_name: 'dd1czj85j', 
  api_key: '865444197932722', 
  api_secret: 'vWcijTSdOTmf2uexlaiGz4ogn4Y' 
});

const videos = [
  'signup video 1.mp4',
  'signup video 2.mp4',
  'signup video 3.mp4',
  'signup video 5.mp4',
  'signup video 6.mp4'
];

async function uploadVideos() {
  for (const video of videos) {
    const filePath = path.join(__dirname, 'public', video);
    console.log(`Uploading ${video}...`);
    try {
      const result = await cloudinary.uploader.upload(filePath, { 
        resource_type: "video",
        public_id: `zeneva_welcome_${video.replace(/ /g, '_').replace('.mp4', '')}`,
        folder: "zeneva"
      });
      console.log(`Success: ${video} -> ${result.secure_url}`);
    } catch (error) {
      console.error(`Failed to upload ${video}:`, error);
    }
  }
}

uploadVideos();
