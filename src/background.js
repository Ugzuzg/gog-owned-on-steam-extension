const steamEndpoint = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';
const steamApiKey = 'F6632EB18DA44A67BF2B446E6C476822';
const itadKey = 'd1af465a5309c5664c366ff24e8441d3cbbcf38e';

const fetchItadByGog = async ({ plains }) => {
  const response = await fetch(
    `https://api.isthereanydeal.com/v01/game/prices/?key=${itadKey}&shops=gog&plains=${plains.join(',')}`,
  );
  return (await response.json()).data;
};

const fetchItadPlains = async ({ gameIds }) => {
  const response = await fetch(
    `https://api.isthereanydeal.com/v01/game/plain/id/?key=${itadKey}&shop=steam&ids=${gameIds.join(',')}`,
  );
  const { data } = await response.json();
  return data;
};

const fetchSteamGames = async ({ steamid }) => {
  const response = await fetch(`${steamEndpoint}?key=${steamApiKey}&steamid=${steamid}&format=json&include_appinfo=1`);
  return (await response.json()).response.games;
};

function connected(p) {
  p.onMessage.addListener(async ({ id, name, params }) => {
    try {
      const data = await (() => {
        switch (name) {
          case 'fetchSteamGames':
            return fetchSteamGames(params);
          case 'fetchItadPlains':
            return fetchItadPlains(params);
          case 'fetchItadByGog':
            return fetchItadByGog(params);
          default:
            throw new Error('unknown request');
        }
      })();
      p.postMessage({ id, data });
    } catch (error) {
      p.postMessage({ id, error });
    }
  });
}

browser.runtime.onConnect.addListener(connected);
