import * as cheerio from 'cheerio';
import { ApkVariant } from '../types';
import { APK_MIRROR_BASE_URL } from '../utils/constants';

// 🚀 THE MAGIC BACKDOOR
const MAGIC_HEADERS = {
  'User-Agent': 'APKUpdater-v3.0.3',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

export const fetchLatestVersion = async (directUrl: string) => {
  try {
    // 1. Fetch the Main App Page
    const response = await fetch(directUrl, { headers: MAGIC_HEADERS });
    const html = await response.text();
    
    if (html.includes('Cloudflare') || html.includes('Just a moment')) {
      throw new Error('Cloudflare blocked the main page.');
    }

    const $ = cheerio.load(html);
    let stableLink: string | null = null;

    // 2. The Sniper: Find the newest Stable Release Link
    $('.appRow .appRowTitle a, .appRow a.fontBlack').each((_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr('href');
      
      if (href && href.includes('-release/') && 
          !text.includes('beta') && !text.includes('alpha') && !text.includes('developer') && 
          !text.includes('nightly') && !text.includes('wear os') && !text.includes('daydream') && 
          !text.includes('tv') && !text.includes('auto') && !text.includes('klar') && !text.includes('lite')) {
        
        const cleanHref = href.startsWith('/') ? href : `/${href}`;
        stableLink = `https://www.apkmirror.com${cleanHref}`;
        return false; // Stop at the first (newest) stable match!
      }
    });

    if (!stableLink) throw new Error('No stable release found on this page.');

    // ⏱️ CLOUDFLARE COOL-DOWN: Wait 1.5 seconds before jumping to the next page!
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3. Fetch the Release Page to get the variants table
    const releaseResponse = await fetch(stableLink, { headers: MAGIC_HEADERS });
    const releaseHtml = await releaseResponse.text();
    
    if (releaseHtml.includes('Cloudflare') || releaseHtml.includes('Just a moment')) {
      throw new Error('Cloudflare blocked the variant page.');
    }

    const $release = cheerio.load(releaseHtml);

    // 4. Extract Version Number from the giant H1 Title (100% reliable!)
    const pageTitle = $release('h1').text();
    const versionMatch = pageTitle.match(/(\d+\.\d+[a-zA-Z0-9.\-]*)/);
    const latestVersion = versionMatch ? versionMatch[1] : null;

    if (!latestVersion) throw new Error('Could not extract version number from the Release Page.');

    // 5. Extract Variants & Date
    let releaseDate = "Unknown Date";
    const variants: ApkVariant[] = [];
    
    let rows = $release('.table-row');
    if (rows.length === 0) rows = $release('.variants-table .table-row');

    rows.each((_, row) => {
      const rowText = $release(row).text().toLowerCase();
      const originalRowText = $release(row).text();
      
      let link = null;
      $release(row).find('a').each((_, aTag) => {
        const href = $release(aTag).attr('href');
        if (href && !href.includes('#')) link = href;
      });

      if (link) {
        let arch = 'universal';
        if (rowText.includes('arm64-v8a')) arch = 'arm64-v8a';
        else if (rowText.includes('armeabi-v7a')) arch = 'armeabi-v7a';
        else if (rowText.includes('x86')) arch = 'x86';
        
        let dpi = 'nodpi';
        if (rowText.includes('480dpi')) dpi = '480dpi';
        else if (rowText.includes('400dpi')) dpi = '400dpi';
        else if (rowText.includes('320dpi')) dpi = '320dpi';

        if (releaseDate === "Unknown Date") {
          const dateMatch = originalRowText.match(/([A-Z][a-z]{2,8}\s\d{1,2},\s\d{4})/);
          if (dateMatch && dateMatch[1]) releaseDate = dateMatch[1];
        }

        const downloadLink = link.startsWith('http') ? link : `${APK_MIRROR_BASE_URL}${link}`;
        variants.push({ version: latestVersion, arch, dpi, downloadUrl: downloadLink });
      }
    });

    return { variants, latestVersion, releaseDate };

  } catch (error: any) {
    // ✨ FIX: Changed from console.error to console.log! No more ugly grey boxes on your screen!
    console.log('Lightning Scraper Error:', error.message);
    return null;
  }
};