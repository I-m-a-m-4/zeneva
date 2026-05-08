import { NextRequest, NextResponse } from 'next/server';
import { AppConfig } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params;
  let version = AppConfig.version;
  let assets: Array<{ name: string; browser_download_url: string }> = [];

  try {
    const res = await fetch('https://api.github.com/repos/I-m-a-m-4/zeneva/releases/latest?t=' + Date.now(), {
      headers: { 'User-Agent': 'zeneva-website' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tag_name) {
        version = data.tag_name.replace(/^v/, '');
      }
      if (Array.isArray(data.assets)) {
        assets = data.assets;
      }
    }
  } catch (err) {
    console.error("Failed to fetch latest release from GitHub API:", err);
  }

  let downloadUrl = '';

  // Helper to find asset by pattern
  const findAssetUrl = (endsWithStr: string, containsStr?: string) => {
    const matched = assets.find(asset => {
      const name = asset.name.toLowerCase();
      const matchEnds = name.endsWith(endsWithStr.toLowerCase());
      const matchContains = containsStr ? name.includes(containsStr.toLowerCase()) : true;
      return matchEnds && matchContains;
    });
    return matched ? matched.browser_download_url : '';
  };

  if (assets.length > 0) {
    switch (platform) {
      case 'windows':
        // Try MSI first, then setup EXE
        downloadUrl = findAssetUrl('.msi') || findAssetUrl('.exe');
        break;
      case 'macos-silicon':
        downloadUrl = findAssetUrl('aarch64.dmg') || findAssetUrl('.dmg', 'aarch64');
        break;
      case 'macos-intel':
        downloadUrl = findAssetUrl('x64.dmg') || findAssetUrl('.dmg', 'x64') || findAssetUrl('.dmg');
        break;
      case 'android':
        downloadUrl = findAssetUrl('signed.apk') || findAssetUrl('.apk');
        break;
    }
  }

  // Fallback to hardcoded naming pattern or latest releases page if GitHub API failed or assets were empty
  if (!downloadUrl) {
    if (version === AppConfig.version) {
      downloadUrl = 'https://github.com/I-m-a-m-4/zeneva/releases/latest';
    } else {
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
    }
  }

  return NextResponse.redirect(downloadUrl);
}
