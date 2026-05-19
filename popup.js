document.addEventListener('DOMContentLoaded', async () => {

  const countElement = document.getElementById('incident-count');

  try {

    const result = await chrome.storage.local.get(['incidents']);

    const incidents = result.incidents || [];

    countElement.innerText =
      `${incidents.length} harmful interactions detected`;

  } catch (error) {

    console.error(error);

    countElement.innerText =
      "Failed to load statistics";

  }

});