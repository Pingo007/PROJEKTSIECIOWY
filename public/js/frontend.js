const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');
const WIDTH = 1336;
const HEIGHT = 768;

// Łączy nas z backendem
const socket = io();

const scoreEl = document.querySelector('#scoreEl');

const devicePixelRatio = window.devicePixelRatio || 1;

canvas.width = WIDTH * devicePixelRatio;
canvas.height = HEIGHT * devicePixelRatio;

c.scale(devicePixelRatio, devicePixelRatio);

const x = canvas.width / 2;
const y = canvas.height / 2;

// Obiekt players w frontend
const frontEndPlayers = {};
const frontEndProjectiles = {};
let walls = []; // Tablica przechowująca ściany

// Odbieranie ścian z backendu
socket.on('updateWalls', (backEndWalls) => {
  walls = backEndWalls;
});

// Odbieranie pocisków z backendu
socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    if (frontEndPlayers[socket.id]?.room !== backEndProjectiles[id]?.room) continue;

    const backEndProjectile = backEndProjectiles[id];

    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity,
      });
    } else {
      frontEndProjectiles[id].x += backEndProjectile.velocity.x;
      frontEndProjectiles[id].y += backEndProjectile.velocity.y;
    }
  }

  for (const frontEndProjectileID in frontEndProjectiles) {
    // Jeżeli nie istnieje w backendzie, usuń z frontendu
    if (!backEndProjectiles[frontEndProjectileID]) {
      delete frontEndProjectiles[frontEndProjectileID];
    }
  }
});

// Odbieranie graczy z backendu
socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id];

    if (backEndPlayers[socket.id]?.room !== backEndPlayers[id]?.room) continue;

    // Jeżeli w frontend nie istnieje gracz z id z backend, dodaj nowego gracza
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: backEndPlayer.radius,
        color: backEndPlayer.color,
        username: backEndPlayer.username,
        room: backEndPlayer.room,
        health: backEndPlayer.health,
      });

      document.querySelector('#playerLabels').innerHTML += `<div data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`;
    } else {
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`;
      document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score);

      const parentDiv = document.querySelector('#playerLabels');
      const childDivs = Array.from(parentDiv.querySelectorAll('div'));
      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'));
        const scoreB = Number(b.getAttribute('data-score'));
        return scoreB - scoreA;
      });

      // Usuń stare elementy
      childDivs.forEach((div) => {
        parentDiv.removeChild(div);
      });

      // Dodaj posortowane elementy
      childDivs.forEach((div) => {
        parentDiv.appendChild(div);
      });

      frontEndPlayers[id].health = backEndPlayer.health;
      frontEndPlayers[id].target = {
        x: backEndPlayer.x,
        y: backEndPlayer.y,
      };

      if (id === socket.id) {
        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber;
        });

        if (lastBackendInputIndex > -1) playerInputs.splice(0, lastBackendInputIndex + 1);

        playerInputs.forEach((input) => {
          frontEndPlayers[id].target.x += input.dx;
          frontEndPlayers[id].target.y += input.dy;
        });
      }
    }
  }

  // Usuwanie graczy w frontend
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      const divToDelete = document.querySelector(`div[data-id="${id}"]`);
      if (divToDelete) divToDelete.parentNode.removeChild(divToDelete);

      if (id === socket.id) {
        document.querySelector('#usernameForm').style.display = 'block';
      }

      delete frontEndPlayers[id];
    }
  }
});

const keys = {
  w: { pressed: false },
  a: { pressed: false },
  s: { pressed: false },
  d: { pressed: false },
};

const SPEED = 5;
const playerInputs = [];
let sequenceNumber = 0;
let lastTime = 0;
let animationId;

function animate(time) {
  const deltaTime = time - lastTime; // Różnica czasu od ostatniej klatki
  lastTime = time;

  const normalizedSpeed = SPEED * (deltaTime / 16.67);

  if (keys.w.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: 0, dy: -normalizedSpeed });
    frontEndPlayers[socket.id].y -= normalizedSpeed;
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber });
  }

  if (keys.a.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: -normalizedSpeed, dy: 0 });
    frontEndPlayers[socket.id].x -= normalizedSpeed;
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber });
  }

  if (keys.s.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: 0, dy: normalizedSpeed });
    frontEndPlayers[socket.id].y += normalizedSpeed;
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber });
  }

  if (keys.d.pressed) {
    sequenceNumber++;
    playerInputs.push({ sequenceNumber, dx: normalizedSpeed, dy: 0 });
    frontEndPlayers[socket.id].x += normalizedSpeed;
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber });
  }

  // Czyszczenie canvas
  c.clearRect(0, 0, canvas.width, canvas.height);

  // Rysowanie ścian
  walls.forEach((wall) => {
    c.fillStyle = 'gray';
    c.fillRect(wall.x, wall.y, wall.width, wall.height);
  });

  // Rysowanie graczy
  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id];

    if (frontEndPlayer.target) {
      frontEndPlayers[id].x += (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5;
      frontEndPlayers[id].y += (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5;
    }

    frontEndPlayer.draw();
  }

  // Rysowanie pocisków
  for (const id in frontEndProjectiles) {
    frontEndProjectiles[id].draw();
  }

  animationId = requestAnimationFrame(animate);
}

animate();

window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return;

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true;
      break;
    case 'KeyA':
      keys.a.pressed = true;
      break;
    case 'KeyS':
      keys.s.pressed = true;
      break;
    case 'KeyD':
      keys.d.pressed = true;
      break;
  }
});

window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return;

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false;
      break;
    case 'KeyA':
      keys.a.pressed = false;
      break;
    case 'KeyS':
      keys.s.pressed = false;
      break;
    case 'KeyD':
      keys.d.pressed = false;
      break;
  }
});

// Obsługa formularza "username"
document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const usernameInput = document.querySelector('#usernameInput');
  const username = usernameInput.value.trim();

  if (username === '') {
    alert('Wprowadź nazwę użytkownika!');
    return;
  }

  const selectedRoom = document.querySelector('#roomSelect').value;

  if (!selectedRoom) {
    alert('Wybierz pokój przed rozpoczęciem!');
    return;
  }

  // Ukrywanie całego overlay
  document.querySelector('.overlay').style.display = 'none';

  console.log(`Wybrany pokój: ${selectedRoom}`);
  console.log(`Gracz ${username} rozpoczął grę.`);

  // Emitowanie zdarzenia initGame do serwera
  socket.emit('initGame', {
    username: username,
    room: selectedRoom,
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  });
});

// Tworzenie pokoi
const frontEndRooms = {};

// Funkcja do aktualizacji listy rozwijanej
function updateRoomSelect() {
  const roomSelect = document.querySelector('#roomSelect');

  // Wyczyszczenie obecnych opcji
  roomSelect.innerHTML = '';

  // Dodanie opcji z obiektu frontEndRooms
  for (const [key, value] of Object.entries(frontEndRooms)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value;
    roomSelect.appendChild(option);
  }
}

// Dodanie event listenera do przycisku "Stwórz Pokój"
document.querySelector('#createRoomButton').addEventListener('click', () => {
  const roomName = document.querySelector('#roomNameInput').value.trim();

  if (roomName === '') {
    alert('Wprowadź nazwę pokoju!');
    return;
  }

  // Wysłanie nazwy pokoju na backend
  socket.emit('addRoom', { roomName });

  console.log(`Żądanie utworzenia pokoju: ${roomName}`);
});

// Odbieranie zaktualizowanej listy pokoi z backendu
socket.on('updateRooms', (backEndRooms) => {
  // Aktualizacja frontEndRooms
  Object.assign(frontEndRooms, backEndRooms);

  // Aktualizacja listy rozwijanej
  updateRoomSelect();

  console.log('Zaktualizowana lista pokoi:', frontEndRooms);
});