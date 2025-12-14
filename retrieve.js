// --- 1. Function to parse URL parameters ---
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// --- 2. Calculate Distance and Direction (Haversine/Bearing) ---
// (This function remains unchanged from the previous version)
function calculateDistanceAndDirection(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    lat1 = lat1 * (Math.PI / 180);
    lat2 = lat2 * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c; 
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    
    bearing = (bearing + 360) % 360; 

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const direction = directions[Math.round(bearing / 45) % 8];

    const displayDistance = distanceKm < 1 ? 
        (distanceKm * 1000).toFixed(0) + ' m' : 
        distanceKm.toFixed(1) + ' km';

    return {
        distance: displayDistance,
        direction: direction
    };
}

// --- 3. Helper to format the output ---
// (This function remains unchanged from the previous version)
function formatTDPResult(label, name, dist, dir, duration, time, travelType) {
    const resultsContainer = document.getElementById('results');
    const box = document.createElement('div');
    box.className = 'result-box';
    box.innerHTML = `
        <p><span class="label">${label}:</span> **${name}**</p>
        <p><span class="label">Direction/Distance:</span> ${dist} ${dir}</p>
        <p><span class="label">Public Transport:</span> ${travelType}</p>
        <p><span class="label">Departure Time:</span> **${time}**</p>
        <p><span class="label">Journey Duration:</span> ${duration}</p>
    `;
    return box;
}

// --- 4. Core Logic: Process API Steps and Display ---
// (This function remains unchanged from the previous version)
function processSteps(currentLat, currentLon, steps) {
    const transportSteps = steps.filter(step => step.travel_mode === 'TRANSIT');
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<h2>Public Transport Retrieve Options:</h2>'; 

    const tdp1Step = transportSteps[0];
    const tdp2Step = transportSteps[1];
    
    if (tdp1Step) {
        const details = tdp1Step.transit_details;
        const tdp1Loc = details.departure_stop.location;
        
        const { distance, direction } = calculateDistanceAndDirection(
            currentLat, currentLon, tdp1Loc.lat, tdp1Loc.lng
        );
        
        resultsContainer.appendChild(formatTDPResult(
            'TDP1 (First Departure)',
            details.departure_stop.name,
            distance,
            direction,
            tdp1Step.duration.text,
            details.departure_time.text,
            `${details.line.vehicle.name} (${details.line.name})`
        ));
    }
    
    if (tdp2Step) {
        const details = tdp2Step.transit_details;
        const tdp2Loc = details.departure_stop.location;

        const { distance, direction } = calculateDistanceAndDirection(
            currentLat, currentLon, tdp2Loc.lat, tdp2Loc.lng
        );

        resultsContainer.appendChild(formatTDPResult(
            'TDP2 (Second Departure)',
            details.departure_stop.name,
            distance,
            direction,
            tdp2Step.duration.text,
            details.departure_time.text,
            `${details.line.vehicle.name} (${details.line.name})`
        ));
    }

    if (!tdp1Step && !tdp2Step) {
        resultsContainer.innerHTML += '<p>No public transport steps found in the recommended route.</p>';
    }
    
    document.getElementById('status').innerText = 'Route analysis complete.';
}

// --- 5. Call the Directions API (Now requires the API Key) ---
async function calculateRetrieveRoute(currentLat, currentLon, DESTINATION_INPUT, apiKey) {
    const origin = `${currentLat},${currentLon}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
                `origin=${origin}` +
                `&destination=${DESTINATION_INPUT}` +
                `&mode=transit` +
                `&key=${apiKey}`; // Use the dynamic key
    
    document.getElementById('status').innerText = `Searching for route to ${DESTINATION_INPUT}...`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK" && data.routes.length > 0) {
            const bestRoute = data.routes[0].legs[0]; 
            processSteps(currentLat, currentLon, bestRoute.steps);
        } else {
            document.getElementById('status').innerText = `Error: Could not find a public transport route. Status: ${data.status}`;
            document.getElementById('results').innerHTML = `<p>Destination: ${DESTINATION_INPUT}</p><p>Check your destination format (Postcode or Lat,Lon) and ensure your API Key is correct.</p>`;
        }
    } catch (error) {
        document.getElementById('status').innerText = `Fatal Error fetching directions: ${error}`;
    }
}

// --- 6. Main Execution Flow (Triggered by Button Click) ---
function startRetrieveProcess() {
    // 1. Get Destination from URL
    const destinationParam = getUrlParameter('dest');
    
    // 2. Get API Key from Input Field
    const apiKey = document.getElementById('apiKeyInput').value;

    if (!destinationParam) {
        document.getElementById('status').innerText = "ERROR: Destination parameter 'dest' not found in URL. Check XCTrack config.";
        return; 
    }
    
    if (!apiKey) {
        document.getElementById('status').innerText = "ERROR: Please paste your Google Maps API Key and click the button.";
        return;
    }
    
    // 3. Start Geolocation
    if (navigator.geolocation) {
        document.getElementById('status').innerText = "Getting device location...";
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById('status').innerText = `Location found. Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}.`;
                calculateRetrieveRoute(lat, lon, destinationParam, apiKey);
            },
            (error) => {
                document.getElementById('status').innerText = `Error getting location: ${error.message}. Ensure location services are enabled.`;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        document.getElementById('status').innerText = "Geolocation is not supported by this browser/device.";
    }
}

// --- 7. Event Listener (Attaches start process to button) ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startButton').addEventListener('click', startRetrieveProcess);
    document.getElementById('status').innerText = "Waiting for API Key and 'Start' click.";
});
