const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const startUrl = process.argv[2];
if (!startUrl) {
  console.error('Моля, въведи стартов URL като аргумент!');
  process.exit(1);
}

const visited = new Set();
const errors = [];

async function crawl(url, baseUrl) {
  if (visited.has(url)) return;
  visited.add(url);

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const status = response.status;

    if (status >= 400) {
      errors.push(`${status} - ${url}`);
      console.log(`Грешка ${status} при ${url}`);
    } else {
      console.log(`OK: ${url} (${status})`);
    }

    if (status === 200 && response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
      const $ = cheerio.load(response.data);
      const links = $('a[href]').map((i, el) => $(el).attr('href')).get();

      for (const link of links) {
        let absoluteUrl;
        try {
          absoluteUrl = new URL(link, baseUrl).href;
        } catch {
          continue; // Пропускаме невалидни URL
        }

        if (absoluteUrl.startsWith(baseUrl)) {
          await crawl(absoluteUrl, baseUrl);
        }
      }
    }
  } catch (error) {
    errors.push(`Error - ${url} (${error.message})`);
    console.log(`Грешка при достъп до ${url}: ${error.message}`);
  }
}

(async () => {
  await crawl(startUrl, new URL(startUrl).origin);
  fs.writeFileSync('errors_report.txt', errors.join('\n'));
  console.log('Готово! Грешките са записани в errors_report.txt');
})();
