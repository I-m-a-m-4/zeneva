import { NextRequest, NextResponse } from 'next/server';
import { AppConfig } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params;
  const version = AppConfig.version;

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
