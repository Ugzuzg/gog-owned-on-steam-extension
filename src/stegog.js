const itadKey = 'd1af465a5309c5664c366ff24e8441d3cbbcf38e';
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

const checkGames = (steamid, steamOwned) => {
  const searchByUrl = gogUrl => _.find(steamOwned, { gogUrl });

  const addIndicator = (product) => {
    try {
      let gameUrl = null;
      if (product.getAttribute('card-product')) {
        gameUrl = window.location.pathname;
      } else {
        gameUrl = product.querySelector('[href]').getAttribute('href');
      }

      if (product.querySelector('.stegog-owned')) return;
      // const steamGame = searchByTitle(id, gameTitle);
      const steamGame = searchByUrl(gameUrl);
      if (!steamGame) return;

      const indicator = document.createElement('a');
      const steamLink = `https://store.steampowered.com/app/${steamGame.appid}/`;
      indicator.setAttribute('href', steamLink);
      indicator.setAttribute('target', '_blank');
      indicator.setAttribute('style', `background-image: url(${browser.extension.getURL('images/g99.png')});`);
      indicator.className = 'stegog-owned';

      if (product.querySelector('.product-actions')) {
        product.querySelector('.product-actions').appendChild(indicator);
      } else {
        product.appendChild(indicator);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const cardProducts = document.querySelectorAll('[card-product]');
  cardProducts.forEach(addIndicator);
  const products = document.querySelectorAll('[product-tile-id]');
  products.forEach(addIndicator);
  const mosaicProducts = document.querySelectorAll('[menu-product]');
  mosaicProducts.forEach(addIndicator);
};

const getItadPlains = async (steamOwned) => {
  const sliceSize = 200;
  let games = {};
  await P.map(_.times(Math.ceil(steamOwned.length / sliceSize)), async (i) => {
    const gameIds = steamOwned.map(v => `app/${v.appid}`).slice(i * sliceSize, (i + 1) * sliceSize);
    const response = await fetch(`https://api.isthereanydeal.com/v01/game/plain/id/?key=${itadKey}&shop=steam&ids=${gameIds.join(',')}`);
    const data = (await response.json()).data;
    games = {
      ...games,
      ...data,
    };
  }, { concurrency: 3 });
  return games;
};

const getGogLinks = async (plainsObject) => {
  const plains = _.map(plainsObject, plain => plain);
  const sliceSize = 30;
  return _.flatten(await P.map(_.times(Math.ceil(plains.length / sliceSize)), async (i) => {
    const p = plains.slice(i * sliceSize, (i + 1) * sliceSize);
    const response = await fetch(`https://api.isthereanydeal.com/v01/game/prices/?key=${itadKey}&shops=gog&plains=${p.join(',')}`);
    const games = (await response.json()).data;
    return _.map(games, (value, key) => {
      if (value.list.length === 0) return null;
      const match = value.list[0].url.match(/(\/game\/\w+)\?.*/);
      return {
        gogUrl: match[1],
        appid: _.find(_.toPairs(plainsObject), ([, plain]) => plain === key)[0].slice(4),
      };
    }).filter(v => v);
  }, { concurrency: 3 }));
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

  const response = await fetch(`${endpoint}?key=${steamApiKey}&steamid=${steamid}&format=json&include_appinfo=1`);
  const steamOwned = (await response.json()).response.games;
  const plains = await getItadPlains(steamOwned);
  const ownedGogLinks = await getGogLinks(plains);
  console.log(ownedGogLinks);

  checkGames(steamid, ownedGogLinks);
  setInterval(() => checkGames(steamid, ownedGogLinks), 5000);
};

doJob();
