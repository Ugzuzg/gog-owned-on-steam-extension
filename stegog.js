const idsMappingUrl = 'https://raw.githubusercontent.com/Ugzuzg/gog-owned-on-steam-extension/master/idsMapping.json';
const gogGamesUrl = 'https://raw.githubusercontent.com/Ugzuzg/gog-owned-on-steam-extension/master/gogGames.json';

const fetchJsonFromGithub = async (url) => {
  const response = await fetch(url);
  return response.json();
};

const stripTitle = title => title
  .toLowerCase()
  .split('™')
  .join('')
  .split(',')
  .join('')
  .split(':')
  .join('')
  .replace(/  +/g, ' ');

const steamApiKey = 'F6632EB18DA44A67BF2B446E6C476822';
const endpoint = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';

const displaySteamIdModal = () => {
  const modal = document.createElement('div');
  modal.className = 'stegog-modal';

  const input = document.createElement('input');
  input.setAttribute('placeholder', 'steamid');
  modal.appendChild(input);

  const saveButton = document.createElement('button');
  saveButton.appendChild(document.createTextNode('Save'));
  saveButton.addEventListener('click', async (e) => {
    e.preventDefault();
    await browser.storage.sync.set({
      steamid: input.value,
    });
    modal.remove();
    doJob();
  });
  modal.appendChild(saveButton);

  document.body.appendChild(modal);
};

const checkGames = (steamid, gogToSteamId, gogGames, steamOwned) => {
  const searchByTitle = (gogId, gogTitle) => steamOwned.find((v) => {
    // if there's a direct link between game ids return it
    const directEntry = gogToSteamId.find(gs => gs.steamIds.includes(String(v.appid)));
    if (directEntry) return directEntry.gogIds.includes(gogId);

    // try ineffective title comparison method
    if (!gogTitle) return false;
    const steamTitle = stripTitle(v.name);
    return steamTitle.includes(gogTitle) || gogTitle.includes(steamTitle);
  });

  const addIndicator = (product) => {
    const id = product.getAttribute('gog-product') || product.getAttribute('gog-mosaic-product');
    const gameTitle = gogGames[id];

    if (product.querySelector('.stegog-owned')) return;
    const steamGame = searchByTitle(id, gameTitle);
    if (!steamGame) return;

    const indicator = document.createElement('a');
    const steamLink = `https://store.steampowered.com/app/${steamGame.appid}/`;
    indicator.setAttribute('href', steamLink);
    indicator.setAttribute('target', '_blank');
    indicator.setAttribute('style', `background-image: url(${browser.extension.getURL('images/g99.png')});`);
    indicator.className = 'stegog-owned';

    product.appendChild(indicator);
  };

  const products = document.querySelectorAll('[gog-product]');
  products.forEach(addIndicator);
  const mosaicProducts = document.querySelectorAll('[gog-mosaic-product]');
  mosaicProducts.forEach(addIndicator);
};

const doJob = async () => {
  let res = {};
  try {
    res = await browser.storage.sync.get('steamid');
  } catch (err) {
    // ignore
  }

  const { steamid } = res;

  if (!steamid) {
    displaySteamIdModal();
    return;
  }

  const gogToSteamId = await fetchJsonFromGithub(idsMappingUrl);
  const gogGames = await fetchJsonFromGithub(gogGamesUrl);

  Object.keys(gogGames).forEach((key) => {
    gogGames[key] = stripTitle(gogGames[key]);
  });

  const response = await fetch(`${endpoint}?key=${steamApiKey}&steamid=${steamid}&format=json&include_appinfo=1`);
  const steamOwned = (await response.json()).response.games;

  checkGames(steamid, gogToSteamId, gogGames, steamOwned);
  setInterval(() => checkGames(steamid, gogToSteamId, gogGames, steamOwned), 5000);
};

doJob();
