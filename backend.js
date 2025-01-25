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

class Wall {
  constructor({ x, y, width, height }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

const walls = [
  new Wall({ x: 200, y: 150, width: 50, height: 150 }),
  new Wall({ x: 200, y: 450, width: 50, height: 200 }),
  new Wall({ x: 200, y: 150, width: 150, height: 50 }),
  new Wall({ x: 550, y: 250, width: 125, height: 125 }),
  new Wall({ x: 400, y: 550, width: 250, height: 50 }),
  new Wall({ x: 800, y: 700, width: 200, height: 50 }),
  new Wall({ x: 950, y: 450, width: 50, height: 250 }),
  new Wall({ x: 750, y: 0, width: 50, height: 100 }),
  new Wall({ x: 400, y: 750, width: 50, height: 400 }),
  new Wall({ x: 1300, y: 300, width: 50, height: 200 }),
  new Wall({ x: 1150, y: 600, width: 150, height: 50 }),
  new Wall({ x: 1000, y: 150, width: 125, height: 125 }),
];

const backEndPlayers = {};
const backEndProjectiles = {};
const backEndRooms = {};
const roomActivityTimers = {};
const backEndMedkits = {};

MAX_AMMO = 6;
const BASE_HEALTH = 5;
const WIDTH = 1600;
const HEIGHT = 900 ;
const SPEED = 5;
const RADIUS = 25;
const PROJECTILE_RADIUS = 6;
const DASH_COOLDOWN = 8;
let projectileId = 0;

function checkPlayerWallCollision(player, walls) {
  for (const wall of walls) {
    if (
      player.x - player.radius < wall.x + wall.width &&
      player.x + player.radius > wall.x &&
      player.y - player.radius < wall.y + wall.height &&
      player.y + player.radius > wall.y
    ) {
      return true;
    }
  }
  return false;
}

function checkProjectileWallCollision(projectile, walls) {
  for (const wall of walls) {
    if (
      projectile.x - PROJECTILE_RADIUS < wall.x + wall.width &&
      projectile.x + PROJECTILE_RADIUS > wall.x &&
      projectile.y - PROJECTILE_RADIUS < wall.y + wall.height &&
      projectile.y + PROJECTILE_RADIUS > wall.y
    ) {
      return true;
    }
  }
  return false;
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('addRoom', ({ roomName }) => {
    const roomId = `room${Object.keys(backEndRooms).length + 1}`;
    backEndRooms[roomId] = roomName;

    roomActivityTimers[roomId] = setTimeout(() => {
      const playersInRoom = Object.values(backEndPlayers).filter((player) => player.room === roomId);
      if (playersInRoom.length === 0) {
        delete backEndRooms[roomId];
        delete roomActivityTimers[roomId];
        io.emit('updateRooms', backEndRooms);
        console.log(`Pokój ${roomName} (ID: ${roomId}) został usunięty z powodu nieaktywności.`);
      }
    }, 20000);

    io.emit('updateRooms', backEndRooms);
    console.log(`Pokój dodany: ${roomName} (ID: ${roomId})`);
  });

  socket.emit('updateRooms', backEndRooms);

  socket.emit('updateWalls', walls);

  io.emit('updatePlayers', backEndPlayers);

  socket.on('shoot', ({ x, y, angle }) => {
    if(!backEndPlayers[socket.id].canShoot) return

    projectileId++;

    const velocity = {
      x: Math.cos(angle) * 34.99,
      y: Math.sin(angle) * 34.99,
    };

    if(backEndPlayers[socket.id].ammo>0){  
      for(id in backEndPlayers){
        if(backEndPlayers[id].room == backEndPlayers[socket.id].room){
          io.to(id).emit('play_sound', { sound: 'shoot' });
        }
      }
      backEndProjectiles[projectileId] = {
        x,
        y,
        velocity,
        playerId: socket.id,
        room: backEndPlayers[socket.id].room,
        radius: PROJECTILE_RADIUS
      };
      backEndPlayers[socket.id].ammo--

      setTimeout(()=>{
        backEndPlayers[socket.id].canShoot = true;
      },90)
    }

    backEndPlayers[socket.id].canShoot = false

    if(backEndPlayers[socket.id].ammo<=0 && backEndPlayers[socket.id].isReloading == false){ 
      //reload
      io.to(socket.id).emit('play_sound', { sound: 'reload' });
      setTimeout(() => {
        backEndPlayers[socket.id].ammo = MAX_AMMO; // Przeładuj amunicję
        backEndPlayers[socket.id].isReloading = false;
        backEndPlayers[socket.id].canShoot = true;
      }, 500); // 500 milisekund = 0.5 sekundy

      backEndPlayers[socket.id].isReloading = true;
    }
  });

  let SpawnX = 0;
  socket.on('initGame', ({ username, room }) => {
    if (Math.random() >= 0.5) {
      SpawnX = Math.random() * 150;
    } else {
      SpawnX = WIDTH - Math.random() * 150;
    }

    if(Object.entries(backEndPlayers).length === 0) generateMedkit(room)
    
    let foundRoom = false;

    for(const id in backEndPlayers){
      if(backEndPlayers[id].room === room){
        foundRoom = true;
        break;
      }
    }

    if(!foundRoom) generateMedkit(room)

    backEndPlayers[socket.id] = {
      x: SpawnX,
      y: HEIGHT * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      room,
      health: BASE_HEALTH,
      maxHealth: BASE_HEALTH,
      radius: RADIUS,
      ammo: MAX_AMMO,
      maxAmmo: MAX_AMMO,
      isReloading: false,
      canShoot: true,
      canDash: true,
    };
    
    io.emit('updatePlayers', backEndPlayers)
    io.emit('updateMedkits',backEndMedkits)

    if (roomActivityTimers[room]) {
      clearTimeout(roomActivityTimers[room]);
    }

    roomActivityTimers[room] = setTimeout(() => {
      const playersInRoom = Object.values(backEndPlayers).filter((player) => player.room === room);
      if (playersInRoom.length === 0) {
        delete backEndRooms[room];
        delete roomActivityTimers[room];
        io.emit('updateRooms', backEndRooms);
        console.log(`Pokój ${room} został usunięty z powodu nieaktywności.`);
      }
    }, 20000);

    console.log(backEndPlayers[socket.id]);
  });

  socket.on('disconnect', (reason) => {
    console.log(reason);
    const player = backEndPlayers[socket.id];
    if (player) {
      const room = player.room;
      delete backEndPlayers[socket.id];
      io.emit('updatePlayers', backEndPlayers);

      const playersInRoom = Object.values(backEndPlayers).filter((p) => p.room === room);
      if (playersInRoom.length === 0) {
        if (roomActivityTimers[room]) {
          clearTimeout(roomActivityTimers[room]);
        }
        roomActivityTimers[room] = setTimeout(() => {
          delete backEndRooms[room];
          delete roomActivityTimers[room];
          io.emit('updateRooms', backEndRooms);
          console.log(`Pokój ${room} został usunięty z powodu nieaktywności.`);
        }, 20000);
      }
    }
  });

  socket.on('dash', (keys)=>{
    if(!backEndPlayers[socket.id].canDash) return

    let direction = { x: 0, y: 0 };

    if (keys.w.pressed) direction.y -= 1; // Góra
    if (keys.s.pressed) direction.y += 1; // Dół
    if (keys.a.pressed) direction.x -= 1; // Lewo
    if (keys.d.pressed) direction.x += 1; // Prawo

    // Normalizacja wektora kierunku
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length > 0) {
        direction.x /= length;
        direction.y /= length;
    }

    if(length == 0) return

    for(let dashAmount = 75; dashAmount > 0; dashAmount -= 1){
      if(length == 1){
        targetPosition = {  
          x:backEndPlayers[socket.id].x + direction.x * dashAmount + direction.x*20,
          y:backEndPlayers[socket.id].y + direction.y * dashAmount + direction.y*20,
          radius:backEndPlayers[socket.id].radius
        }
      }else {
        targetPosition = {  
          x:backEndPlayers[socket.id].x + direction.x * dashAmount + Math.sign(direction.x)*20,
          y:backEndPlayers[socket.id].y + direction.y * dashAmount + Math.sign(direction.y)*20,
          radius:backEndPlayers[socket.id].radius
        }
      }
      if(!checkPlayerWallCollision(targetPosition,walls)){
        for(id in backEndPlayers){
          if(backEndPlayers[id].room == backEndPlayers[socket.id].room){
            io.to(id).emit('play_sound', { sound: 'dash' });
          }
        }
        backEndPlayers[socket.id].x += direction.x * dashAmount/3;
        backEndPlayers[socket.id].y += direction.y * dashAmount/3;
        setTimeout(()=>{
          backEndPlayers[socket.id].x += direction.x * dashAmount/3;
          backEndPlayers[socket.id].y += direction.y * dashAmount/3
        },30)
        setTimeout(()=>{
          backEndPlayers[socket.id].x += direction.x * dashAmount/3;
          backEndPlayers[socket.id].y += direction.y * dashAmount/3
        },60)

        backEndPlayers[socket.id].canDash = false;

        setTimeout(()=>{
          backEndPlayers[socket.id].canDash = true;
        },DASH_COOLDOWN*1000)
        const playerSides = {
          left: backEndPlayers[socket.id].x - backEndPlayers[socket.id].radius,
          right: backEndPlayers[socket.id].x + backEndPlayers[socket.id].radius,
          top: backEndPlayers[socket.id].y - backEndPlayers[socket.id].radius,
          bottom: backEndPlayers[socket.id].y + backEndPlayers[socket.id].radius,
        };
    
        if (playerSides.left < 0) backEndPlayers[socket.id].x = backEndPlayers[socket.id].radius;
        if (playerSides.right > WIDTH) backEndPlayers[socket.id].x = WIDTH - backEndPlayers[socket.id].radius;
        if (playerSides.top < 0) backEndPlayers[socket.id].y = backEndPlayers[socket.id].radius;
        if (playerSides.bottom > HEIGHT) backEndPlayers[socket.id].y = HEIGHT - backEndPlayers[socket.id].radius;
        break
      }
    }
  })

  socket.on('keydown', ({ keycode, sequenceNumber, normalizedSpeed }) => {
    const backEndPlayer = backEndPlayers[socket.id];

    if (!backEndPlayer) return;

    backEndPlayer.sequenceNumber = sequenceNumber;

    const prevX = backEndPlayer.x;
    const prevY = backEndPlayer.y;

    switch (keycode) {
      case 'KeyW':
        backEndPlayer.y -= normalizedSpeed;
        break;
      case 'KeyA':
        backEndPlayer.x -= normalizedSpeed;
        break;
      case 'KeyS':
        backEndPlayer.y += normalizedSpeed;
        break;
      case 'KeyD':
        backEndPlayer.x += normalizedSpeed;
        break;
    }

    if (checkPlayerWallCollision(backEndPlayer, walls)) {
      //console.log("Kolizja gracza ze ścianą");
      backEndPlayer.x = prevX;
      backEndPlayer.y = prevY;
    }

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

let randomX
let randomY

setInterval(() => {
  for (const id in backEndPlayers){
    if(!backEndMedkits[backEndPlayers[id].room]) continue

    const DISTANCE = Math.hypot(
      backEndPlayers[id].x - backEndMedkits[backEndPlayers[id].room].x,
      backEndPlayers[id].y - backEndMedkits[backEndPlayers[id].room].y
    );
    if(DISTANCE < backEndPlayers[id].radius + backEndMedkits[backEndPlayers[id].room].radius ){
      backEndPlayers[id].health = BASE_HEALTH
      delete backEndMedkits[backEndPlayers[id].room]
      io.emit('updateMedkits',backEndMedkits)

      setTimeout(()=>{
        if(backEndPlayers[id].room) generateMedkit(backEndPlayers[id].room)
      },10000)
    }
  }

  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x;
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y;

    // Sprawdź, czy pocisk wyleciał poza mapę
    if (
      backEndProjectiles[id].x < 0 ||
      backEndProjectiles[id].x > WIDTH ||
      backEndProjectiles[id].y < 0 ||
      backEndProjectiles[id].y > HEIGHT
    ) {
      delete backEndProjectiles[id];
      continue;
    }

    if (checkProjectileWallCollision(backEndProjectiles[id], walls)) {
      delete backEndProjectiles[id];
      continue;
    }

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
          //hit sound
          //console.log('playing hit')
          io.to(backEndProjectiles[id].playerId).emit('play_sound', { sound: 'hit' });
          io.to(playerId).emit('play_sound', { sound: 'hit' });
        }

        if (backEndPlayer.health <= 0) {
          backEndPlayers[backEndProjectiles[id].playerId].score++;
          if (Math.random() >= 0.5) {
            SpawnX = Math.random() * 150;
          } else {
            SpawnX = WIDTH - Math.random() * 150;
          }
          backEndPlayer.x = SpawnX;
          backEndPlayer.y = HEIGHT * Math.random();
          backEndPlayer.health = BASE_HEALTH;
        }

        delete backEndProjectiles[id];
        break;
      }
    }
  }
  //console.log(backEndPlayers)
  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
}, 15);

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function generateMedkit(room){
  while(true){
    medkitSpawn = {
      x:randomX = 200 + Math.random() * (WIDTH - 400),
      y:randomY = 200 + Math.random() * (HEIGHT - 400),
      radius: 20
    }
    if(!checkPlayerWallCollision(medkitSpawn,walls)){
      break
    } 
  }
  backEndMedkits[room] = {
    x: randomX,
    y: randomY,
    radius: 20,
    room: room
  }
  io.emit('updateMedkits',backEndMedkits)
}