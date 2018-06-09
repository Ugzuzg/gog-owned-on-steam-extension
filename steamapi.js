const key = 'F6632EB18DA44A67BF2B446E6C476822';
const endpoint = 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';
/*
?key=XXXXXXXXXXXXXXXXX&steamid=76561197960434622&format=json
*/
fetch(`${endpoint}?key=${key}&steamid=76561197960434622&format=json`).then((response) => {
  console.log(response.json());
});
