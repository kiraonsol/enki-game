const firebaseConfig = {
  apiKey: "AIzaSyBlTVNMSh1hCjzLLu5SV4XJZRfyOZgLMVc",
  authDomain: "enki-game.firebaseapp.com",
  databaseURL: "https://enki-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "enki-game",
  storageBucket: "enki-game.firebasestorage.app",
  messagingSenderId: "902253472756",
  appId: "1:902253472756:web:eea22ee4ee0021ad2fe7a1"
};

let firebaseInitialized = false;
try {
  firebase.initializeApp(firebaseConfig);
  window.database = firebase.database();
  firebaseInitialized = true;
  window.firebaseReady = true;
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  window.firebaseReady = false;
  window.database = null;
  alert('Failed to initialize Firebase. Leaderboard may not work.');
}

let telegramReady = false;
const waitForTelegram = async () => {
  return new Promise((resolve) => {
    const checkTelegram = () => {
      if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        console.log('Telegram WebApp initialized at load:', Telegram.WebApp);
        console.log('Telegram initData:', Telegram.WebApp.initData);
        console.log('Telegram initDataUnsafe:', Telegram.WebApp.initDataUnsafe);
        telegramReady = true;
        resolve(true);
      } else {
        console.log('Waiting for Telegram WebApp...');
        setTimeout(checkTelegram, 100);
      }
    };
    checkTelegram();
  });
};

waitForTelegram();

window.gameState = "start";
window.playerScore = 0;
window.playerName = "";
window.nameInputVisible = false;

async function showNameInput(score) {
  console.log('showNameInput called with score:', score);
  if (!telegramReady) {
    console.log('Telegram not ready, waiting...');
    await waitForTelegram();
  }

  console.log('Telegram WebApp status at leaderboard:', typeof Telegram !== 'undefined' && Telegram.WebApp ? 'Available' : 'Not Available');
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    try {
      console.log('Calling Telegram.WebApp.ready()...');
      Telegram.WebApp.ready();
      console.log('Telegram.WebApp.ready() completed');
      console.log('Telegram WebApp after ready():', Telegram.WebApp);

      console.log('Fetching Telegram user data...');
      let user = Telegram.WebApp.initDataUnsafe.user || {};
      console.log('Telegram User Data:', user);

      console.log('Determining suggested name...');
      let suggestedName = user.username || user.first_name || "Player";
      console.log('Suggested name:', suggestedName);

      console.log('Telegram WebApp version:', Telegram.WebApp.version);
      console.log('Showing name input prompt...');
      Telegram.WebApp.showAlert("Please update Telegram to the latest version for improved features. Using fallback prompt for now.");
      let name = prompt(`Score: ${score}\nEnter your name (leave blank for "${suggestedName}", max 10 chars):`, suggestedName);
      console.log('Name received from prompt:', name);

      name = (name || "").trim();
      if (name === "") {
        name = suggestedName;
      }
      if (name.length > 10) {
        name = name.substring(0, 10);
        console.log('Name truncated to 10 characters:', name);
        Telegram.WebApp.showAlert("Name truncated to 10 characters.");
      }
      if (name) {
        window.playerName = name;
        console.log('Saving score to Firebase...');
        await window.addToLeaderboard(window.playerName, score);
        console.log('Score saved:', { name: window.playerName, score });
        if (window.loadLeaderboard) {
          console.log('Reloading leaderboard...');
          await window.loadLeaderboard();
          console.log('Leaderboard reloaded');
        }
      } else {
        console.log('No name provided, showing alert');
        Telegram.WebApp.showAlert("No name provided. Score not saved.");
      }
    } catch (error) {
      console.error('Error in showNameInput:', error);
      console.error('Error stack:', error.stack);
      Telegram.WebApp.showAlert("Error saving score. Please try again.");
    }
  } else {
    console.error('Telegram WebApp not available at leaderboard screen');
    alert('Name input requires Telegram. Play via the bot.');
  }
  window.gameState = "nameInput";
  window.nameInputVisible = true;
  setTimeout(() => {
    window.gameState = "gameover";
    window.nameInputVisible = false;
  }, 2000);
}

window.showNameInput = showNameInput;
