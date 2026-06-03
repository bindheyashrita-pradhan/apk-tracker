import './style.css'

// 1. Tell JavaScript to find your HTML elements
const addBtn = document.getElementById('addBtn');
const apkUrlInput = document.getElementById('apkUrl');
const watchlist = document.getElementById('watchlist');
const stableCheck = document.getElementById('stableCheck');
const betaCheck = document.getElementById('betaCheck');
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');

// 2. THE BRAIN: Ask the phone's memory if we have any saved apps.
let mySavedApps = JSON.parse(localStorage.getItem('myWatchlist')) || [];

// 3. Function to draw the saved apps on the screen
function updateScreen() {
    watchlist.innerHTML = ""; // Clear the old text

    if (mySavedApps.length === 0) {
        watchlist.innerHTML = '<p style="color: #888;">No apps added yet.</p>';
        return;
    }

    // Loop through every app saved in the phone and draw a card for it
    mySavedApps.forEach((app) => {
        const listItem = document.createElement('li');
        listItem.className = 'app-item';
        listItem.innerHTML = `
            <div class="app-item-url">${app.url}</div>
            <span class="app-item-tags">Tracking: ${app.types.join(" & ")}</span>
        `;
        watchlist.appendChild(listItem);
    });
}

// Run this function immediately when the app opens to load your saved apps!
updateScreen();

// 4. When the user clicks "Track App"
addBtn.addEventListener('click', () => {
    const newUrl = apkUrlInput.value.trim();
    
    if (newUrl === "") {
        alert("Please paste an APKMirror link first!");
        return;
    }

    let trackingTypes = [];
    if (stableCheck.checked) trackingTypes.push("Stable");
    if (betaCheck.checked) trackingTypes.push("Beta/Alpha");

    // Package the URL and the Checkboxes together into an Object
    const appData = {
        url: newUrl,
        types: trackingTypes
    };

    // Add it to our list
    mySavedApps.push(appData);

    // Save the new list permanently into the phone's local storage
    localStorage.setItem('myWatchlist', JSON.stringify(mySavedApps));

    // Update the screen and clear the input box
    updateScreen();
    apkUrlInput.value = "";
});

// 5. When the user clicks "Check for Updates Now"
checkUpdatesBtn.addEventListener('click', async () => {
    // Check if the watchlist is empty
    if (mySavedApps.length === 0) {
        alert("Your watchlist is empty! Add an app first.");
        return;
    }

    // Change button text so you know it's working
    checkUpdatesBtn.innerText = "⏳ Scanning APKMirror...";
    checkUpdatesBtn.disabled = true;

    // Loop through every app in your Watchlist
    for (let i = 0; i < mySavedApps.length; i++) {
        const app = mySavedApps[i];
        console.log("Currently checking: " + app.url);
        
        try {
            // Fake 2-second delay to simulate web scraping
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log("Error checking " + app.url, error);
        }
    }

    // Reset the button when finished
    checkUpdatesBtn.innerText = "🔄 Check for Updates Now";
    checkUpdatesBtn.disabled = false;
    alert("Scan Complete! (Internet scraping logic moving to v2)");
});