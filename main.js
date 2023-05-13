const fajrDiv = document.querySelector(".fajr .time");
const duhrDiv = document.querySelector(".dhuhr .time");
const asrDiv = document.querySelector(".asr .time");
const magribDiv = document.querySelector(".maghrib .time");
const ishaDiv = document.querySelector(".isha .time");
const locationForm = document.querySelector("form");
const formCityBar = locationForm.querySelector("#city-name");
const formCityCode = locationForm.querySelector("#city-code");
const searchBtn = locationForm.querySelector(".search-btn");
const autoLocatBtn = document.querySelector(".auto-btn");
const remianingTimeText = document.querySelector(".remain-time-text p");
const setLocation = document.getElementsByClassName("set-location")[0];
const savedLocationDiv = document.querySelector(".saved-location");
const savedLocationText = document.querySelector(".saved-location p");
const removeSavedPlace = document.querySelector("#remove-btn");
const dayLightCheck = document.getElementById("check-daylight");
const nowDate = new Date();
const tommorw = new Date(moment().add(1, "d"));

const apiKey = "df1a690443ab4c84ab2be29075ff8586";

fajrTime = undefined;
let userCity = undefined;
const options = {
  // geolocation options
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

let geolocationHandler;
let userInput = {};

//** first phase determine coordinates **//

function dirGeocodingHandler(userLocation, countryCode) {
  // direct geolocation to return coordinations
  http =
    `http://api.openweathermap.org/geo/1.0/direct?q=${userLocation},,${countryCode}&limit=1&appid=` +
    apiKey;
  return http;
}

function revGeocodingHandler(latitude, longitude) {
  // reverse geolocation to return city name
  http =
    `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=` +
    apiKey;
  fetch(http)
    .then((response) => response.json())
    .then((data) => {
      console.log(data[0]);
      return data[0].local_names.ar;
    })
    .then((result) => {
      setLocation.classList.replace("abled", "disabled");
      savedLocationText.insertAdjacentHTML(
        "afterbegin",
        `<p>مدينتك الحالية هي ${result}</p>`
      );
    });
}

window.addEventListener("load", () => {
  // check if place saved perviously
  if (localStorage.length > 0) {
    locationHandler(true, false, false);
    savedLocationDiv.style.display = "flex";
  }
});

let locationSerachHandler = new Promise((resolve, reject) => {
  //

  searchBtn.addEventListener("click", (event) => {
    event.preventDefault();
    userInput.userLocation = formCityBar.value;
    userInput.countryCode = formCityCode.value.toUpperCase();
    resolve(userInput);
  });

  formCityBar.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchBtn.click();
    }
  });
})
  .then((userInput) => {
    httpReq = dirGeocodingHandler(
      userInput.userLocation,
      userInput.countryCode
    );
  })
  .then(() => {
    locationHandler(false, true, false);
  })
  .catch((message) => {
    console.log(message);
  });

autoLocatBtn.addEventListener("click", (event) => {
  event.preventDefault();
  locationHandler(false, false, true);
});

function locationHandler(localStorageMethod, userInputMethod, navigatorMethod) {
  geolocationHandler = new Promise((resolve, reject) => {
    if (localStorageMethod) {
      // restore saved location
      let savedLocation = {};
      savedLocation.latitude = localStorage.getItem("latitude");
      savedLocation.longitude = localStorage.getItem("longitude");
      savedLocation.dst = localStorage.getItem("dst");
      revGeocodingHandler(savedLocation.latitude, savedLocation.longitude);
      resolve(savedLocation);
    } else if (userInputMethod) {
      // search for location by user input
      fetch(httpReq)
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            reject("city name is empty you can try again or put it AUTO");
          }
        })
        .then((data) => {
          resolve(data[0]);
          location.reload();
        });
    } else if (navigatorMethod) {
      // automatic location decetion by browser
      if (navigator.geolocation)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            let crds;
            crds = pos.coords;
            resolve(crds);
            location.reload();
          },
          undefined,
          options
        );
      else {
        reject("can't catch location");
      }
    }
  })

    //** second phase handling the coordinates by library **//
    .then((crds) => {
      // crds = coordinates which get from first phase
      let fajrTime;
      let duhrTime;
      let asrTime;
      let magribTime;
      let ishaTime;

      if (crds.latitude === undefined && crds.longitude === undefined) {
        // to avoid clash between output from autonavigator method and api output
        crds.latitude = crds.lat;
        crds.longitude = crds.lon;
      }

      if (localStorage.length === 0) {
        // sotre coordinates in local storge
        localStorage.setItem("latitude", JSON.stringify(crds.latitude));
        localStorage.setItem("longitude", JSON.stringify(crds.longitude));
        localStorage.setItem("dst", `${dayLightCheck.checked}`);
      }

      function prayesFunction(day, timeFormat) {
        console.log(crds);
        return prayTimes.getTimes(
          day,
          [crds.latitude, crds.longitude],
          "auto",
          crds.dst === "true" ? 1 : 0,
          timeFormat
        );
      }

      function showPrayTime() {
        prayTimes.setMethod("Egypt"); // configre time claculation method
        const prayes = prayesFunction(nowDate, "12h");
        fajrTime = prayes.fajr;
        duhrTime = prayes.dhuhr;
        asrTime = prayes.asr;
        magribTime = prayes.maghrib;
        ishaTime = prayes.isha;

        fajrDiv.textContent = fajrTime;
        duhrDiv.textContent = duhrTime;
        asrDiv.textContent = asrTime;
        magribDiv.textContent = magribTime;
        ishaDiv.textContent = ishaTime;
      }

      let item = undefined;
      let nextPrayItem = document.getElementsByClassName(`${item}`)[0]; // track the next pray in dom
      const prayDurObj = {};

      function calcRemaingTime() {
        // get the remaing time to pray time
        const prayModifing = prayesFunction(nowDate, "24h");
        const prayMomentObj = {};
        let handlePrTime;

        for (const key in prayModifing) {
          if (Object.hasOwnProperty.call(prayModifing, key)) {
            // to avoid (imsak,sunrise,sunset,midnight) times
            if (
              key === "fajr" ||
              key === "dhuhr" ||
              key === "asr" ||
              key === "maghrib" ||
              key === "isha"
            ) {
              const pTime = prayModifing[key];
              const nowTime = moment(
                // make now time as a moment object
                `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`,
                "HH:mm:ss"
              );
              handlePrTime = moment(pTime, "HH:mm"); // make the pray time as a moment opject
              const duration = moment.duration(handlePrTime.diff(nowTime));
              prayDurObj[key] = `${duration.get("h")}:${duration.get("m")}`;

              if (handlePrTime.diff(nowTime) > 0) {
                // remaining prays in the day
                prayMomentObj[key] = handlePrTime.diff(nowTime);
              }
            }
          }
        }

        let nextPrayesArr = Object.values(prayMomentObj); // array of remaining time for next prayes
        let nextPrayesKeys = Object.keys(prayMomentObj); // array of prayes names

        //* calculate time between isha and next fajr *//

        if (nextPrayesKeys.length === 0) {
          // check if the prayers of this day end
          const prayModifing = prayesFunction(tommorw, "24h"); // 24h format to calculate
          const prayMod = prayesFunction(tommorw, "12h"); // 12h format to preview

          const pTime = prayModifing.fajr;
          fajrDiv.textContent = prayMod.fajr;
          handlePrTime = moment(pTime, "HH:mm").add(1, "d");
          const nowTime = moment(
            // make now time as a moment object
            `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`,
            "HH:mm:ss"
          );
          const duration = moment.duration(handlePrTime.diff(nowTime));
          prayDurObj["fajr"] = `${duration.get("h")}:${duration.get("m")}`;
          prayMomentObj["fajr"] = handlePrTime.diff(nowTime);
          nextPrayesArr = Object.values(prayMomentObj);
          nextPrayesKeys = Object.keys(prayMomentObj);
        }

        const sortedArr = nextPrayesArr.sort((a, b) => a - b); // sort next prays
        const nextPrayVal = sortedArr[0]; // remaining time for the next pray

        for (const key of nextPrayesKeys) {
          if (prayMomentObj[key] === nextPrayVal) {
            item = key;
            nextPrayItem = document.getElementsByClassName(`${item}`)[0];
            if (nextPrayItem.className === `${item}`) {
              // add the box around the next pray
              nextPrayItem.classList.add("nextpray");
            } else if (prayMomentObj[item] < 2000) {
              // remove box from the previous pray
              nextPrayItem.classList.remove("nextpray");
            }
            const nextprayMomDur = moment.duration(prayMomentObj[key]);
            remianingTimeText.parentElement.style.display = "block";
            remianingTimeText.textContent = `بقي على ${
              nextPrayItem.querySelector(".pray-name").textContent
            }\xa0\xa0\xa0
              ${nextprayMomDur.hours()} س : ${nextprayMomDur.minutes()} د : ${nextprayMomDur.seconds()} ث `;
          }
        }
      }

      showPrayTime();
      setInterval(calcRemaingTime, 1000);
    })
    .catch((message) => {
      alert(message);
    });
}

removeSavedPlace.addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});
