// --- 1. Function to parse URL parameters ---
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? 'DESTINATION_NOT_FOUND' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// --- 2. Get and display URL parameter ---
function displayUrlParameter() {
    const destination = getUrlParameter('dest');
    const urlOutput = document.getElementById('url-output');
    
    urlOutput.innerHTML = `
        <p><span class="label">Parameter Key:</span> **dest**</p>
        <p><span class="label">Parameter Value:</span> **${destination}**</p>
    `;
    
    document.getElementById('status').innerText = 'URL parameter processed.';
}

// --- 3. Get and display current location ---
function displayCurrentLocation() {
    const locationOutput = document.getElementById('location-output');
    
    if (navigator.geolocation) {
        locationOutput.innerHTML = '<p>Attempting to get device location...</p>';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                
                locationOutput.innerHTML = `
                    <p class="label">Status:</p> **Location FOUND!**
                    <p><span class="label">Latitude (Current):</span> ${lat}</p>
                    <p><span class="label">Longitude (Current):</span> ${lon}</p>
                `;
            },
            (error) => {
                locationOutput.innerHTML = `<p class="label">Status:</p> **Location FAILED** (Error: ${error.message}). This might happen if permission is denied or device settings are off.`;
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        locationOutput.innerHTML = '<p class="label">Status:</p> **Geolocation NOT Supported** by this browser/web view.';
    }
}

// --- 4. Run the demo ---
displayUrlParameter();
displayCurrentLocation();
