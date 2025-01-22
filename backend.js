const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Klasa Wall
class Wall {
  constructor({ x, y, width, height }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

// Tworzenie ścian
const walls = [
  new Wall({ x: 200, y: 150, width: 40, height: 150 }),
  new Wall({ x: 200, y: 150, width: 150, height: 40 }),
  new Wall({ x: 550, y: 250, width: 100, height: 100 }),
  new Wall({ x: 250, y: 500, width: 400, height: 40 }),
  new Wall({ x: 800, y: 600, width: 250, height: 40 }),
  new Wall({ x: 1010, y: 200, width: 40, height: 400 }),
  // Dodaj więcej ścian według potrzeb
];

const backEndPlayers = {};
const backEndProjectiles = {};
const backEndRooms = {};

const BASE_HEALTH = 1;
const WIDTH = 1336;
const HEIGHT = 768;
const SPEED = 5;
const RADIUS = 25;
const PROJECTILE_RADIUS = 5;
let projectileId = 0;

// Funkcja sprawdzająca kolizję gracza ze ścianami
function checkPlayerWallCollision(player, walls) {
  for (const wall of walls) {
    if (
      player.x - player.radius < wall.x + wall.width &&
      player.x + player.radius > wall.x &&
      player.y - player.radius < wall.y + wall.height &&
      player.y + player.radius > wall.y
    ) {
      return true; // Kolizja wykryta
    }
  }
  return false;
}

// Funkcja sprawdzająca kolizję pocisku ze ścianami
function checkProjectileWallCollision(projectile, walls) {
  for (const wall of walls) {
    if (
      projectile.x - PROJECTILE_RADIUS < wall.x + wall.width &&
      projectile.x + PROJECTILE_RADIUS > wall.x &&
      projectile.y - PROJECTILE_RADIUS < wall.y + wall.height &&
      projectile.y + PROJECTILE_RADIUS > wall.y
    ) {
      return true; // Kolizja wykryta
    }
  }
  return false;
}

io.on('connection', (socket) => {
  console.log('a user connected');

  // Dodanie pokoju
  socket.on('addRoom', ({ roomName }) => {
    const roomId = `room${Object.keys(backEndRooms).length + 1}`;
    backEndRooms[roomId] = roomName;

    io.emit('updateRooms', backEndRooms);
    console.log(`Pokój dodany: ${roomName} (ID: ${roomId})`);
  });

  // Przesyłanie istniejących pokoi po połączeniu
  socket.emit('updateRooms', backEndRooms);

  // Emitowanie ścian do klienta
  socket.emit('updateWalls', walls);

  // Emitowanie graczy
  io.emit('updatePlayers', backEndPlayers);

  // Obsługa strzelania
  socket.on('shoot', ({ x, y, angle }) => {
    projectileId++;

    const velocity = {
      x: Math.cos(angle) * 35,
      y: Math.sin(angle) * 35,
    };

    backEndProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id,
      room: backEndPlayers[socket.id].room,
    };
  });
  let SpawnX = 0 
  // Inicjalizacja gry
  socket.on('initGame', ({ username, width, height, room }) => {
    //Lokalizacja
    
    if(Math.random() >= 0.5){
      SpawnX = Math.random() * 150
    }else
    {
      SpawnX = SpawnX = WIDTH - Math.random() * 150
    }
    
    backEndPlayers[socket.id] = {
      x: SpawnX,
      y: HEIGHT * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      room,
      health: BASE_HEALTH,
      radius: RADIUS,
    };

    console.log(backEndPlayers[socket.id]);
  });

  // Rozłączenie gracza
  socket.on('disconnect', (reason) => {
    console.log(reason);
    delete backEndPlayers[socket.id];
    io.emit('updatePlayers', backEndPlayers);
  });

  // Obsługa ruchu gracza
  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    const backEndPlayer = backEndPlayers[socket.id];

    if (!backEndPlayer) return;

    backEndPlayer.sequenceNumber = sequenceNumber;

    // Zapisz poprzednią pozycję
    const prevX = backEndPlayer.x;
    const prevY = backEndPlayer.y;

    switch (keycode) {
      case 'KeyW':
        backEndPlayer.y -= SPEED;
        break;
      case 'KeyA':
        backEndPlayer.x -= SPEED;
        break;
      case 'KeyS':
        backEndPlayer.y += SPEED;
        break;
      case 'KeyD':
        backEndPlayer.x += SPEED;
        break;
    }

    // Sprawdź kolizję ze ścianami
    if (checkPlayerWallCollision(backEndPlayer, walls)) {
      console.log("Kolizja gracza ze ścianą");
      backEndPlayer.x = prevX;
      backEndPlayer.y = prevY;
    }

    // Ograniczenia ruchu do granic canvas
    const playerSides = {
      left: backEndPlayer.x - backEndPlayer.radius,
      right: backEndPlayer.x + backEndPlayer.radius,
      top: backEndPlayer.y - backEndPlayer.radius,
      bottom: backEndPlayer.y + backEndPlayer.radius,
    };

    if (playerSides.left < 0) backEndPlayer.x = backEndPlayer.radius;
    if (playerSides.right > WIDTH) backEndPlayer.x = WIDTH - backEndPlayer.radius;
    if (playerSides.top < 0) backEndPlayer.y = backEndPlayer.radius;
    if (playerSides.bottom > HEIGHT) backEndPlayer.y = HEIGHT - backEndPlayer.radius;
  });
});

// Backend ticker
setInterval(() => {
  // Aktualizacja pozycji pocisków
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y;

    // Sprawdź kolizję pocisku ze ścianami
    if (checkProjectileWallCollision(backEndProjectiles[id], walls)) {
      console.log(`Pocisk ${id} uderzył w ścianę`); // Debugowanie
      delete backEndProjectiles[id];
      continue;
    }

    // Sprawdź kolizję pocisku z graczami
    for (const playerId in backEndPlayers) {
      if (backEndPlayers[playerId].room !== backEndProjectiles[id].room) continue;

      const backEndPlayer = backEndPlayers[playerId];
      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      );

      if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius && backEndProjectiles[id].playerId !== playerId) {
        if (backEndPlayers[backEndProjectiles[id].playerId]) {
          backEndPlayer.health--;
          backEndPlayers[backEndProjectiles[id].playerId].score++;
        }
        delete backEndProjectiles[id];
        if (backEndPlayer.health <= 0) {
          if(Math.random() >= 0.5){
            SpawnX = Math.random() * 150
          }else
          {
            SpawnX = WIDTH - Math.random() * 150
          }
          backEndPlayer.x = SpawnX
          backEndPlayer.y = HEIGHT * Math.random();
          backEndPlayer.health = BASE_HEALTH;
        }
        break;
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
}, 15);

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});