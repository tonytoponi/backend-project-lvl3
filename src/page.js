import cheerio from 'cheerio';

const isResource = (link, address) => {
  const { href } = new URL(link, address);
  return href.includes(address);
};

export const getAllResourcesLinks = (html, address) => {
  const $ = cheerio.load(html);
  const links = [];
  $('[src]').each((i, element) => {
    links.push($(element).attr('src'));
  });
  $('[href]').each((i, element) => {
    links.push($(element).attr('href'));
  });
  const localLinks = links.filter((link) => isResource(link, address) && link.includes('/'));
  return localLinks;
};


export const changeLink = (html, oldLink, newLink) => {
  const $ = cheerio.load(html);
  $(`*[src*="${oldLink}"]`).attr('src', newLink);
  $(`*[href*="${oldLink}"]`).attr('href', newLink);
  return $.html();
};
