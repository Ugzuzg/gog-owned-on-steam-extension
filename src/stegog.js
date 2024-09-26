const port = browser.runtime.connect({ name: 'stegog-content' });

const backgroundFetch = async (name, params) =>
  new P((resolve, reject) => {
    const id = _.uniqueId('request');

    const handler = ({ id: mId, data, error }) => {
      if (id !== mId) return;

      if (data) resolve(data);
      else if (error) reject(error);
      else resolve(null);

      port.onMessage.removeListener(handler);
    };
    port.onMessage.addListener(handler);

    port.postMessage({ id, name, params });
  });

const displaySteamIdModal = (steamid = '', withError = false) => {
  const modal = document.createElement('div');
  modal.className = 'stegog-modal';

  const h1 = document.createElement('h1');
  h1.innerText = 'SteGOG Settings';
  modal.appendChild(h1);

  const p = document.createElement('p');
  if (withError) {
    p.innerHTML = `Wasn't able to fetch anything with the provided steamID64. Please verify it. You can look it up on <a href="https://steamid.io" target="_blank" rel="noopener noreferrer">https://steamid.io</a>`;
  } else {
    p.innerHTML = `Please, enter steamID64. You can look it up on <a href="https://steamid.io" target="_blank" rel="noopener noreferrer">https://steamid.io</a>`;
  }
  modal.appendChild(p);

  const input = document.createElement('input');
  input.setAttribute('placeholder', 'steamid64');
  input.value = steamid;
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
  const searchByGogId = (gogId) => _.find(steamOwned, { gogId });

  const addIndicator = (product) => {
    try {
      const gameId =
        product.getAttribute('card-product') ??
        product.getAttribute('menu-product') ??
        product.querySelector('[data-product-id]')?.getAttribute('data-product-id');

      if (product.querySelector('.stegog-owned')) return;
      const steamGame = searchByGogId(gameId);
      if (!steamGame) return;

      const indicator = document.createElement('a');
      const steamLink = `https://store.steampowered.com/app/${steamGame.appid}/`;
      indicator.setAttribute('href', steamLink);
      indicator.setAttribute('target', '_blank');
      indicator.setAttribute('style', `background-image: url(${browser.extension.getURL('images/g99.png')});`);
      indicator.className = 'stegog-owned';

      if (product.querySelector('.product-actions')) {
        product.querySelector('.product-actions').appendChild(indicator);
      } else if (product.querySelector('[selenium-id=productTile]')) {
        product.querySelector('[selenium-id=productTile]').appendChild(indicator);
      } else {
        product.appendChild(indicator);
      }
    } catch (err) {}
  };

  const attributes = ['[card-product]', '[product-tile-id]', '[menu-product]', '[gog-product]', 'product-tile'];
  _.flatMap(attributes, (attribute) => [...document.querySelectorAll(`${attribute}`)]).forEach((v) => addIndicator(v));
};

const getItadPlains = async (steamOwned) => {
  const sliceSize = 200;
  let games = {};
  await P.map(
    _.times(Math.ceil(steamOwned.length / sliceSize)),
    async (i) => {
      const gameIds = steamOwned.map((v) => `app/${v.appid}`).slice(i * sliceSize, (i + 1) * sliceSize);
      const data = await backgroundFetch('lookupItadIdsByShopIds', { shopId: 61, gameIds });
      games = {
        ...games,
        ...data,
      };
    },
    { concurrency: 3 },
  );
  return games;
};

const getGogLinks = async (plainsObject) => {
  const plains = _.map(plainsObject, (plain) => plain);
  const sliceSize = 30;
  return _.flatten(
    await P.map(
      _.times(Math.ceil(plains.length / sliceSize)),
      async (i) => {
        const p = plains.slice(i * sliceSize, (i + 1) * sliceSize);
        const games = await backgroundFetch('lookupShopIdsByItadIds', { shopId: 35, gameIds: p });
        return _.map(games, (value, key) => {
          if (!value || value.length === 0) return [];

          return value.map((gogId) => ({
            gogId,
            appid: _.find(_.toPairs(plainsObject), ([, plain]) => plain === key)[0].slice(4),
          }));
        })
          .flat()
          .filter(Boolean);
      },
      { concurrency: 3 },
    ),
  );
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

  let steamOwned;
  try {
    steamOwned = await backgroundFetch('fetchSteamGames', { steamid });
  } catch (err) {
    displaySteamIdModal(steamid, true);
    return;
  }
  const plains = await getItadPlains(steamOwned);
  const ownedGogLinks = await getGogLinks(plains);

  checkGames(steamid, ownedGogLinks);
  setInterval(() => checkGames(steamid, ownedGogLinks), 5000);
};

doJob();
