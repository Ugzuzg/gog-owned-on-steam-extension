const steamEndpoint = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';
const steamApiKey = 'F6632EB18DA44A67BF2B446E6C476822';

let steamGames = null;

const fetchSteamGames = async ({ steamid }) => {
  if (steamGames) return steamGames;
  const response = await fetch(`${steamEndpoint}?key=${steamApiKey}&steamid=${steamid}&format=json&include_appinfo=1`);
  steamGames = (await response.json()).response.games;
  return steamGames;
};

const gog = '35';
const steam = '61';
let shopIdsToItadIds = {};

const lookupItadIdsByShopIds = async ({ shopId, gameIds }) => {
  const { hydratedResponse, missingIds } = gameIds.reduce(
    (acc, id) => {
      if (shopIdsToItadIds[shopId]?.[id]) {
        acc.hydratedResponse[id] = shopIdsToItadIds[shopId][id];
      } else {
        acc.missingIds.push(id);
      }
      return acc;
    },
    { hydratedResponse: {}, missingIds: [] },
  );

  if (missingIds.length === 0) return hydratedResponse;

  const response = await fetch(`https://api.isthereanydeal.com/lookup/id/shop/${shopId}/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(missingIds),
  });
  const data = await response.json();
  shopIdsToItadIds = { ...shopIdsToItadIds, [shopId]: { ...data, ...hydratedResponse } };
  return { ...hydratedResponse, ...data };
};

let itadIdsToShopIds = {};
const lookupShopIdsByItadIds = async ({ shopId, gameIds }) => {
  const { hydratedResponse, missingIds } = gameIds.reduce(
    (acc, id) => {
      if (id in (itadIdsToShopIds[shopId] ?? {})) {
        acc.hydratedResponse[id] = itadIdsToShopIds[shopId][id];
      } else {
        acc.missingIds.push(id);
      }
      return acc;
    },
    { hydratedResponse: {}, missingIds: [] },
  );

  if (missingIds.length === 0) return hydratedResponse;

  const response = await fetch(`https://api.isthereanydeal.com/lookup/shop/${shopId}/id/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameIds),
  });
  const data = await response.json();

  itadIdsToShopIds = { ...itadIdsToShopIds, [shopId]: { ...data, ...hydratedResponse } };
  return { ...hydratedResponse, ...data };
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
