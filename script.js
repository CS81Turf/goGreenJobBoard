// ================== CLOCK FUNCTION ==================
function updateClock() {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  document.getElementById('clock').textContent = `${dayName}, ${monthName} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

setInterval(updateClock, 1000);
updateClock(); // Initial call

// ================== WEATHER FETCHING ==================
const WEATHER_FETCH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const WEATHER_API_KEY = CONFIG.WEATHER_API_KEY;
const lat = 38.2527;
const lon = -85.7585;
const WEATHER_API_URL = `https://api.tomorrow.io/v4/timelines?location=${lat},${lon}&fields=temperatureMax,temperatureMin,weatherCode,windSpeed&units=imperial&timesteps=1d&apikey=${WEATHER_API_KEY}`;

if (!localStorage.getItem("requestLog")) {
  localStorage.setItem("requestLog", JSON.stringify([]));
}

function logRequest() {
  let logs = JSON.parse(localStorage.getItem("requestLog")) || [];
  logs.push({ time: new Date().toISOString() });

  if (logs.length > 10) logs.shift();
  localStorage.setItem("requestLog", JSON.stringify(logs));
  console.log("Logged API Request:", logs);
}

async function fetchWeather() {
  const lastFetchTime = localStorage.getItem("lastFetchTime") || 0;
  const currentTime = Date.now();

  if (currentTime - lastFetchTime < WEATHER_FETCH_INTERVAL) {
    console.log("Skipping API call, using cached data.");
    loadCachedWeather();
    return;
  }

  try {
    console.log("Fetching new weather data...");
    const response = await fetch(WEATHER_API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const jsonData = await response.json();
    localStorage.setItem("cachedWeatherData", JSON.stringify(jsonData));
    localStorage.setItem("lastFetchTime", Date.now());
    logRequest();

    displayCurrentWeather(jsonData.data.timelines[0].intervals[0]);
    displayForecast(jsonData.data.timelines[0].intervals.slice(1, 6));
  } catch (error) {
    console.error("Error fetching weather data:", error);
    document.getElementById("weather").textContent = "Weather data unavailable";
  }
}

function loadCachedWeather() {
  const cachedWeatherData = localStorage.getItem("cachedWeatherData");
  if (cachedWeatherData) {
    const parsedData = JSON.parse(cachedWeatherData);
    displayCurrentWeather(parsedData.data.timelines[0].intervals[0]);
    displayForecast(parsedData.data.timelines[0].intervals.slice(1, 6));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.visibilityState === "visible") {
    setTimeout(fetchWeather, Math.random() * 5000); // Random 0-5 sec delay
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    fetchWeather();
  }
});

// ================== GOOGLE SHEETS FETCHING ==================
const SHEET_ID = '1XFYRaB50QGaE8MJ-xUVrvvZDnqVu-QpZCvty0o-cjK4'; // Extracted from URL
const SHEETS_API_KEY = CONFIG.SHEETS_API_KEY; // Separate from weather API key
const RANGE = 'Sheet1!A1:C100';
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${SHEETS_API_KEY}`;

const NOTES_FETCH_INTERVAL = 30 * 60 * 1000; // 30 minutes
let notesFetchCount = 0;

async function fetchNotes() {
  try {
    notesFetchCount++;
    console.log(`Fetching Notes... Count: ${notesFetchCount}, Time: ${new Date().toLocaleTimeString()}`);

    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    console.log("Notes:", data.values);

    // Assuming the notes are in columns A, B, and C of the sheet
    const fieldNotes = data.values.map(row => row[0]);
    const shopNotes = data.values.map(row => row[1]);
    const upcomingNotes = data.values.map(row => row[2]);

    // Update the "Field Notes" section with the fetched notes
    const fieldNotesList = document.getElementById('field-notes').querySelector('ul');
    fieldNotesList.innerHTML = ''; // Clear existing notes
    fieldNotes.forEach(note => {
      if (note && note !== 'Field Notes') { // Avoid adding the header again
        const listItem = document.createElement('li');
        listItem.textContent = note;
        fieldNotesList.appendChild(listItem);
      }
    });

    // Update the "Shop/Office Notes" section with the fetched notes
    const shopNotesList = document.getElementById('shop-notes').querySelector('ul');
    shopNotesList.innerHTML = ''; // Clear existing notes
    shopNotes.forEach(note => {
      if (note && note !== 'Shop/Office Notes') { // Avoid adding the header again
        const listItem = document.createElement('li');
        listItem.textContent = note;
        shopNotesList.appendChild(listItem);
      }
    });

    // Update the "Upcoming" section with the fetched notes
    const upcomingNotesList = document.getElementById('upcoming').querySelector('ul');
    upcomingNotesList.innerHTML = ''; // Clear existing notes
    upcomingNotes.forEach(note => {
      if (note && note !== 'Upcoming') { // Avoid adding the header again
        const listItem = document.createElement('li');
        listItem.textContent = note;
        upcomingNotesList.appendChild(listItem);
      }
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
  }
}

// Initial fetch and set interval for fetching notes
fetchNotes();
setInterval(fetchNotes, NOTES_FETCH_INTERVAL);

// ================== WEATHER DISPLAY FUNCTIONS ==================
function displayCurrentWeather(currentDay) {
  const weatherDescriptions = {
    "1000": { description: "Clear, Sunny", icon: "☀️" },
    "1100": { description: "Mostly Clear", icon: "🌤️" },
    "1101": { description: "Partly Cloudy", icon: "⛅" },
    "1102": { description: "Mostly Cloudy", icon: "🌥️" },
    "1001": { description: "Cloudy", icon: "☁️" },
    "4001": { description: "Rain", icon: "🌧️" },
    "5000": { description: "Snow", icon: "❄️" },
    "8000": { description: "Thunderstorm", icon: "⛈️" },
    "5100": { description: "Flurries", icon: "❄️" },
    "5001": { description: "Light Snow", icon: "❄️" }
  };

  const weatherCode = currentDay.values.weatherCode;
  const weatherInfo = weatherDescriptions[weatherCode]?.description || "Unknown Weather";
  const weatherIcon = weatherDescriptions[weatherCode]?.icon || "❓";
  const currentTemp = `High: ${currentDay.values.temperatureMax}°F, Low: ${currentDay.values.temperatureMin}°F`;
  const windInfo = `Wind: ${currentDay.values.windSpeed} mph`;

  document.getElementById("weather").innerHTML = `
    <h2>Current Weather</h2>
    <p>${weatherIcon} ${weatherInfo}</p>
    <p>${currentTemp}</p>
    <p>${windInfo}</p>
  `;
}

function displayForecast(forecastDays) {
  const forecastContainer = document.getElementById('forecast');
  forecastContainer.innerHTML = ''; // Clear existing content

  const forecastBoxes = document.createElement('div');
  forecastBoxes.className = 'forecast-boxes';

  forecastDays.forEach(day => {
    const date = new Date(day.startTime);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const maxTemp = day.values.temperatureMax;
    const minTemp = day.values.temperatureMin;
    const windSpeed = day.values.windSpeed;
    const weatherCode = day.values.weatherCode;
    const weatherDescriptions = {
      "1000": { description: "Clear", icon: "☀️" },
      "1100": { description: "Mostly Clear", icon: "🌤️" },
      "1001": { description: "Cloudy", icon: "☁️" },
      "4001": { description: "Rain", icon: "🌧️" },
      "5000": { description: "Snow", icon: "❄️" },
      "8000": { description: "Thunderstorm", icon: "⛈️" },
      "5100": { description: "Flurries", icon: "❄️" },
      "5001": { description: "Light Snow", icon: "❄️" }
    };

    const forecastBox = document.createElement('div');
    forecastBox.className = 'forecast-box';
    forecastBox.innerHTML = `
      <h4>${dayName}</h4>
      <p>${weatherDescriptions[weatherCode]?.icon || "❓"} ${weatherDescriptions[weatherCode]?.description || "Unknown"}</p>
      <p>High: ${maxTemp}°F, Low: ${minTemp}°F</p>
      <p>Wind: ${windSpeed} mph</p>
    `;
    forecastBoxes.appendChild(forecastBox);
  });

  forecastContainer.appendChild(forecastBoxes);
}
