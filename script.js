'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const Workout = class {
  constructor(distance, duration, coords) {
    this.id = Date.now().toString().slice(-8);
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _setDescriptions(type) {
    const uppercaseFirstLetter =
      type.split('')[0].toUpperCase() + type.slice(1);
    const now = new Date();
    const getMonth = months[now.getMonth()];
    const getDay = now.getDate();
    const emoji = type === 'running' ? '🏃‍♂️' : '🚴‍♀️';
    return (this.description = `${emoji} ${uppercaseFirstLetter} ${getMonth} ${getDay}`);
  }
};

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);

    this.cadence = cadence;
    this.calcPace();
    this._setDescriptions(this.type);
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevation) {
    super(distance, duration, coords);

    this.elevation = elevation;
    this.calcSpeed();
    this._setDescriptions(this.type);
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const App = class {
  #map;
  #mapE;
  #workouts = [];
  constructor() {
    // current position
    this._getCurrentPosition();
    // event handler
    inputType.addEventListener('change', this._toggleElevationField);
    form.addEventListener('submit', this._newWorkout.bind(this));
    this._getLocalstorage();
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getCurrentPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), null);
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    this.#map = L.map('map').setView([latitude, longitude], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // on click map ==> call method (show form)
    this.#map.on('click', this._showForm.bind(this));

    // render a marker on the map
    this.#workouts.forEach(work => {
      this._renderWorkoutMark(work);
    });
  }
  _showForm(e) {
    //set as a global event to get the current coords when click at map
    this.#mapE = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  // hide form
  _hideForm() {
    // clear inputs
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    //hide form
    form.classList.add('hidden');
  }

  // create a new workout
  _newWorkout(e) {
    // coords
    const { lat, lng } = this.#mapE.latlng;
    // get inputs value
    const distance = +inputDistance.value,
      duration = +inputDuration.value,
      cadence = +inputCadence.value,
      elevation = +inputElevation.value,
      type = inputType.value;

    let workout;
    // helper function
    const isNumbers = (...input) => {
      const checkNum = input.every(n => isFinite(n));

      return checkNum;
    };

    const isPositiveNum = (...input) => {
      const checkNum = input.every(n => n > 0);
      return checkNum;
    };

    // remove prevent default
    e.preventDefault();

    //if the type is "running" create a new running obj
    if (type === 'running') {
      if (
        !isNumbers(distance, duration, cadence) ||
        !isPositiveNum(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running(distance, duration, [lat, lng], cadence);
    }
    // if the type is "cycling" create a new cycling obj
    if (type === 'cycling') {
      if (
        !isNumbers(distance, duration, elevation) ||
        !isPositiveNum(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }
    // add new obj to array list
    this.#workouts.push(workout);
    // display mark on screen
    this._renderWorkoutMark(workout);
    // hide form
    this._hideForm();
    // display workouts
    this._renderWorkout(workout);
    // set localstorage
    this._setLocalstorage(this.#workouts);
  }
  // create a new marker on the map
  _renderWorkoutMark(workout) {
    // const { lat, lng } = this.#mapE.latlng;
    // add mark
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${inputType.value}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }
  // render workouts
  _renderWorkout(workout) {
    const markup = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description} </h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${
            workout.type === 'running'
              ? workout.pace.toFixed(1)
              : workout.speed.toFixed(1)
          }</span>
          <span class="workout__unit">${
            workout.type === 'running' ? 'min/km' : 'km/h'
          }</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🦶🏼' : '⛰'
          }</span>
          <span class="workout__value">${
            workout.type === 'running' ? workout.cadence : workout.elevation
          }</span>
          <span class="workout__unit">${
            workout.type === 'running' ? 'spm' : 'm'
          }</span>
        </div>
      </li>
  `;

    containerWorkouts.insertAdjacentHTML('beforeend', markup);
  }
  // when type of input is changed toggle another inputs
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  // set localstorage
  _setLocalstorage(workouts) {
    localStorage.setItem('workoutsList', JSON.stringify(workouts));
  }
  _getLocalstorage() {
    if (localStorage.getItem('workoutsList')) {
      console.log(localStorage.getItem === null);
      // return the value from string to array and get array list
      this.#workouts = JSON.parse(localStorage.getItem('workoutsList'));
      // get an object from the array list to send to renderWorkouts method
      this.#workouts?.forEach(workout => {
        this._renderWorkout(workout);
      });
    } else {
      this.#workouts = [];
    }
  }
  _moveToPopup(e) {
    const liElement = e.target.closest('.workout');
    if (!liElement) return;
    const workout = this.#workouts.find(
      work => work.id === liElement.dataset.id
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
};

const app = new App();
