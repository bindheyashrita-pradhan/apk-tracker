import * as cheerio from 'cheerio';
import { ApkVariant } from '../types';
import { APK_MIRROR_BASE_URL } from '../utils/constants';

// 🎭 The Ultimate Disguise: Perfectly matches your Realme Narzo 50 5G!
const SPOOFED_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14; RMX3571) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

export const fetchLatestVersion = async (searchTerm: string): Promise<ApkVariant[] | null> => {
  try {
    // 1. Force the 'www.' prefix which Cloudflare prefers
    const rssUrl = `https://www.apkmirror.com/feed/?s=${searchTerm}`;
    console.log(`Checking APKMirror for: ${searchTerm}`);
    
    // Use native fetch instead of axios
    const rssResponse = await fetch(rssUrl, { headers: SPOOFED_HEADERS });
    const rssText = await rssResponse.text();
    
    // Did Cloudflare catch us?
    if (rssText.includes('Cloudflare') || rssText.includes('Just a moment')) {
      console.log('Cloudflare blocked the RSS feed!');
      return null;
    }
    
    const $ = cheerio.load(rssText, { xmlMode: true });
    const firstItem = $('item').first();
    if (firstItem.length === 0) return null;
    
    const title = firstItem.find('title').text();
    const downloadPageUrl = firstItem.find('link').text();
    const versionMatch = title.match(/(\d+\.\d+\.\d+\.\d+)/) || title.match(/(\d+\.\d+\.\d+)/) || title.match(/(\d+\.\d+)/);
    
    if (!versionMatch || !downloadPageUrl) return null;
    const version = versionMatch[1];
    
    // 2. Fetch the Variants Page
    const pageResponse = await fetch(downloadPageUrl, { headers: SPOOFED_HEADERS });
    const pageText = await pageResponse.text();
    
    if (pageText.includes('Cloudflare') || pageText.includes('Just a moment')) {
      console.log('Cloudflare blocked the Variants page!');
      return null;
    }
    
    const page$ = cheerio.load(pageText);
    const variants: ApkVariant[] = [];
    
    let rows = page$('.table-row');
    if (rows.length === 0) rows = page$('.variants-table .table-row');
    
    rows.each((_, row) => {
      const cells = page$(row).find('.table-cell');
      if (cells.length >= 2) {
        const arch = page$(cells[0]).text().trim().toLowerCase();
        const dpi = cells.length >= 2 ? page$(cells[1]).text().trim().toLowerCase() : 'nodpi';
        const downloadCell = cells.length >= 3 ? cells[2] : cells[1];
        const link = page$(downloadCell).find('a').attr('href');
        
        if (arch && link) {
          const downloadLink = link.startsWith('http') ? link : `${APK_MIRROR_BASE_URL}${link}`;
          variants.push({ version, arch, dpi, downloadUrl: downloadLink });
        }
      }
    });
    
    return variants.length > 0 ? variants : null;
  } catch (error) {
    console.error('APKMirror fetch failed:', error);
    return null;
  }
};