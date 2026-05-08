import { NextRequest, NextResponse } from 'next/server';
import { AppConfig } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params;
  let version = AppConfig.version;

  try {
    const res = await fetch('https://api.github.com/repos/I-m-a-m-4/zeneva/releases/latest', {
      headers: { 'User-Agent': 'zeneva-website' },
      next: { revalidate: 300 } // Cache latest release for 5 minutes
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tag_name) {
        version = data.tag_name.replace(/^v/, '');
      }
    }
  } catch (err) {
    console.error("Failed to fetch latest release from GitHub API:", err);
  }

  let downloadUrl = '';

  switch (platform) {
    case 'windows':
      downloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64_en-US.msi`;
      break;
    case 'macos-silicon':
      downloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_aarch64.dmg`;
      break;
    case 'macos-intel':
      downloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva_${version}_x64.dmg`;
      break;
    case 'android':
      downloadUrl = `https://github.com/I-m-a-m-4/zeneva/releases/download/v${version}/zeneva-v${version}-SIGNED.apk`;
      break;
    default:
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  // Redirect to the GitHub asset URL
  // This achieves the "download from our website" look while leveraging GitHub's hosting
  return NextResponse.redirect(downloadUrl);
}
