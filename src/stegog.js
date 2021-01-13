const port = browser.runtime.connect({ name: 'stegog-content' });

const backgroundFetch = async (name, params) => {
  return new P((resolve, reject) => {
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
};

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
  const searchByUrl = (gogUrl) => _.find(steamOwned, { gogUrl });

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
    } catch (err) {}
  };

  const attributes = ['card-product', 'product-tile-id', 'menu-product', 'gog-product'];
  _.flatMap(attributes, (attribute) => [...document.querySelectorAll(`[${attribute}]`)]).forEach((v) =>
    addIndicator(v),
  );
};

const getItadPlains = async (steamOwned) => {
  const sliceSize = 200;
  let games = {};
  await P.map(
    _.times(Math.ceil(steamOwned.length / sliceSize)),
    async (i) => {
      const gameIds = steamOwned.map((v) => `app/${v.appid}`).slice(i * sliceSize, (i + 1) * sliceSize);
      const data = await backgroundFetch('fetchItadPlains', { gameIds });
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
        const games = await backgroundFetch('fetchItadByGog', { plains: p });
        return _.map(games, (value, key) => {
          if (value.list.length === 0) return null;
          const match = value.list[0].url.match(/(\/game\/\w+)\?.*/);
          return {
            gogUrl: match[1],
            appid: _.find(_.toPairs(plainsObject), ([, plain]) => plain === key)[0].slice(4),
          };
        }).filter((v) => v);
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

  const steamOwned = await backgroundFetch('fetchSteamGames', { steamid });
  const plains = await getItadPlains(steamOwned);
  const ownedGogLinks = await getGogLinks(plains);

  checkGames(steamid, ownedGogLinks);
  setInterval(() => checkGames(steamid, ownedGogLinks), 5000);
};

doJob();
