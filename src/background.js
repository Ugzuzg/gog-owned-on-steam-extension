const steamEndpoint = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';
const steamApiKey = 'F6632EB18DA44A67BF2B446E6C476822';

const fetchSteamGames = async ({ steamid }) => {
  const response = await fetch(`${steamEndpoint}?key=${steamApiKey}&steamid=${steamid}&format=json&include_appinfo=1`);
  return (await response.json()).response.games;
};

const lookupItadIdsByShopIds = async ({ shopId, gameIds }) => {
  const response = await fetch(`https://api.isthereanydeal.com/lookup/id/shop/${shopId}/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameIds),
  });
  return response.json();
};

const lookupShopIdsByItadIds = async ({ shopId, gameIds }) => {
  const response = await fetch(`https://api.isthereanydeal.com/lookup/shop/${shopId}/id/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameIds),
  });
  return response.json();
};

function connected(p) {
  p.onMessage.addListener(async ({ id, name, params }) => {
    try {
      const data = await (() => {
        switch (name) {
          case 'fetchSteamGames':
            return fetchSteamGames(params);
          case 'lookupItadIdsByShopIds':
            return lookupItadIdsByShopIds(params);
          case 'lookupShopIdsByItadIds':
            return lookupShopIdsByItadIds(params);
          default:
            throw new Error('unknown request');
        }
      })();
      p.postMessage({ id, data });
    } catch (error) {
      p.postMessage({ id, error: error.message });
    }
  });
}

browser.runtime.onConnect.addListener(connected);
