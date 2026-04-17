// background.js

// Gør sidepanelet til standard-handlingen når man klikker på ikonet
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Valgfrit: Hvis du vil sikre dig det åbner på den specifikke fane
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});