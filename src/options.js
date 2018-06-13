const saveOptions = (e) => {
  browser.storage.sync.set({
    steamid: document.querySelector('#steamid').value,
  });
  e.preventDefault();
};

const restoreOptions = async () => {
  const res = await browser.storage.sync.get('steamid');
  document.querySelector('#steamid').value = res.steamid;
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
