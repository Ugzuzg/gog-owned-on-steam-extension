function saveOptions(e) {
  browser.storage.sync.set({
    steamid: document.querySelector('#steamid').value
  });
  e.preventDefault();
}

function restoreOptions() {
  const storageItem = browser.storage.managed.get('steamid');
  const gettingItem = browser.storage.sync.get('steamid');
  gettingItem.then((res) => {
    console.log(res);
    document.querySelector('#steamid').value = res.steamid;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
