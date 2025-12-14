// =========================================================================
// XCTrack Paraglider Retrieve Planner Script (retrieve.js)
// Uses Google Maps JavaScript API DirectionsService for CORS compliance.
// =========================================================================

// Global variable to store destination read from URL
let DESTINATION_INPUT = '';

// --- 1. Function to parse URL parameters ---
// (Updated with .trim() for robust parameter reading)
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    // Use .trim() to eliminate any possible spaces
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' ')).trim();
}

// --- 2. Calculate Distance and Direction (Haversine/Bearing) ---
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

// --- 3. Helper to format the output (Appends to the #results div) ---
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
function processSteps(currentLat, currentLon, steps) {
    // Filter steps to find only public transport segments
    const transportSteps = steps.filter(step => step.travel_mode === google.maps.TravelMode.TRANSIT.toUpperCase());
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<h2>Public Transport Retrieve Options:</h2>'; 

    const tdp1Step = transportSteps[0];
    const tdp2Step = transportSteps[1];
    
    // The Google Maps JS API uses slightly different object names than the Web Service API.
    
    if (tdp1Step && tdp1Step.transit) {
        const details = tdp1Step.transit;
        const tdp1Loc = details.departure_stop.location;
        
        const { distance, direction } = calculateDistanceAndDirection(
            currentLat, currentLon, tdp1Loc.lat(), tdp1Loc.lng() // Use lat() and lng() methods
        );
        
        resultsContainer.appendChild(formatTDPResult(
            'TDP1 (First Departure)',
            details.departure_stop.name,
            distance,
            direction,
            tdp1Step.duration.text,
            details.departure_time.text,
            `${details.line.vehicle.type} (${details.line.name})`
        ));
    }
    
    if (tdp2Step && tdp2Step.transit) {
        const details = tdp2Step.transit;
        const tdp2Loc = details.departure_stop.location;

        const { distance, direction } = calculateDistanceAndDirection(
            currentLat, currentLon, tdp2Loc.lat(), tdp2Loc.lng() // Use lat() and lng() methods
        );

        resultsContainer.appendChild(formatTDPResult(
            'TDP2 (Second Departure)',
            details.departure_stop.name,
            distance,
            direction,
            tdp2Step.duration.text,
            details.departure_time.text,
            `${details.line.vehicle.type} (${details.line.name})`
        ));
    }

    if (!tdp1Step && !tdp2Step) {
        resultsContainer.innerHTML += '<p>No direct public transport steps found in the recommended route. You may be too far from a stop, or no public transport is currently available.</p>';
    }
    
    document.getElementById('status').innerText = 'Route analysis complete.';
}


// --- 5. New Core: Call the DirectionsService API ---
function calculateRetrieveRoute(currentLat, currentLon) {
    const directionsService = new google.maps.DirectionsService();
    
    document.getElementById('status').innerText = `Searching for route to ${DESTINATION_INPUT} via DirectionsService...`;
    
    directionsService.route({
        origin: { lat: currentLat, lng: currentLon },
        destination: DESTINATION_INPUT,
        travelMode: google.maps.TravelMode.TRANSIT // Request public transport routes
    }, (response, status) => {
        if (status === 'OK') {
            const bestRoute = response.routes[0].legs[0]; 
            processSteps(currentLat, currentLon, bestRoute.steps);
        } else {
            document.getElementById('status').innerText = `Error: Directions request failed. Status: ${status}. Check destination/key/API console.`;
            document.getElementById('results').innerHTML = `<p>Destination: ${DESTINATION_INPUT}</p><p>Error details: ${status}</p>`;
        }
    });
}


// --- 6. Main Execution Flow (Triggered by Google Maps API Load) ---
window.initRetrieve = function() {
    // 1. Get Destination and Key from URL
    DESTINATION_INPUT = getUrlParameter('dest');
    const apiKey = getUrlParameter('key'); 
    
    if (!DESTINATION_INPUT) {
        document.getElementById('status').innerText = "FATAL ERROR: Destination parameter 'dest' not found in URL.";
        return; 
    }
    
    if (!apiKey) {
        document.getElementById('status').innerText = "FATAL ERROR: API Key parameter 'key' not found in URL.";
        return;
    }

    // 2. Start Geolocation
    if (navigator.geolocation) {
        document.getElementById('status').innerText = `Destination: ${DESTINATION_INPUT}. Getting current location...`;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById('status').innerText = `Location found. Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}. Calculating route...`;
                
                calculateRetrieveRoute(lat, lon);
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
