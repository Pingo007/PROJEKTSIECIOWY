const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const  io = new Server(server, {pingInterval: 2000,  pingTimeout: 5000})

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}
const backEndRooms = {};

const BASE_HEALTH = 10
const WIDTH = 1336
const HEIGHT = 768
const SPEED = 10
const RADIUS = 20
const PROJECTILE_RADIUS = 5
let projectileId = 0
// event jak ktos sie polaczy
io.on('connection', (socket) => {
  console.log('a user connected')
  //dodawanie gracza o id socket.id w backend
  
  // Dodanie pokoju
  socket.on('addRoom', ({ roomName }) => {
    const roomId = `room${Object.keys(backEndRooms).length + 1}`;
    backEndRooms[roomId] = roomName;

    // Emitowanie zaktualizowanej listy pokoi do wszystkich klientów
    io.emit('updateRooms', backEndRooms);
    console.log(`Pokój dodany: ${roomName} (ID: ${roomId})`);
    console.log(backEndRooms)
  });

  // Przesyłanie istniejących pokoi po połączeniu
  socket.emit('updateRooms', backEndRooms);


  //emimtowanie do wszystkich polaczonych obiekt players
  io.emit('updatePlayers', backEndPlayers)

  socket.on('shoot', ({x, y, angle})=>{
    projectileId++

    const velocity = {
      x: Math.cos(angle) * 20,
      y: Math.sin(angle) * 20
    }

    backEndProjectiles[projectileId] = {
      x,
      y, 
      velocity,
      playerId: socket.id,
      room: backEndPlayers[socket.id].room
    }
  })

  socket.on('initGame', ({username, width, height, room})=>{
    backEndPlayers[socket.id] = {
      x:WIDTH * Math.random(),
      y:HEIGHT * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      room,
      health: BASE_HEALTH
    }

    console.log(backEndPlayers[socket.id])
    //init canvas
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }

    backEndPlayers[socket.id].radius = RADIUS

  })

  //jak sie rozloczy usuwany jest z obiektu players
  socket.on('disconnect', (reason) =>{
    console.log(reason)
    delete backEndPlayers[socket.id]
    //emitowanie obiektu players do wszystkich poniewaz sie zmienil
    io.emit('updatePlayers', backEndPlayers)
  })

  //poruszanie sie
  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    const backEndPlayer = backEndPlayers[socket.id]
    
    if (!backEndPlayers[socket.id]) return

    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED
        break

      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED
        break

      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED
        break

      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED
        break
    }

    const playerSides = {
      left: backEndPlayer.x - backEndPlayer.radius,
      right: backEndPlayer.x + backEndPlayer.radius,
      top: backEndPlayer.y - backEndPlayer.radius,
      bottom: backEndPlayer.y + backEndPlayer.radius
    }

    if(playerSides.left < 0) backEndPlayers[socket.id].x = backEndPlayer.radius

    if(playerSides.right > WIDTH) backEndPlayers[socket.id].x = WIDTH - backEndPlayer.radius

    if(playerSides.top < 0) backEndPlayers[socket.id].y = backEndPlayer.radius

    if(playerSides.bottom > HEIGHT) backEndPlayers[socket.id].y = HEIGHT - backEndPlayer.radius
  })
})

//backend ticker
//co 10ms server emituje dane do frontend
setInterval(() => {
  //update projectile position
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    
    const PROJECTILE_RADIUS = 5
    if (backEndProjectiles[id].x - PROJECTILE_RADIUS >= backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
      backEndProjectiles[id].x - PROJECTILE_RADIUS <= 0 ||
       backEndProjectiles[id].y - PROJECTILE_RADIUS >= backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS <= 0
    ){
      delete backEndProjectiles[id]
      continue
    }

    for (const playerId in backEndPlayers){

      //tylko w tym samym pokoju sprawdza
      if(backEndPlayers[playerId].room !== backEndProjectiles[id].room) continue

      const backEndPlayer = backEndPlayers[playerId]

      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      )
      //detekcja trafienia 
      if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius && backEndProjectiles[id].playerId !== playerId) {
        if(backEndPlayers[backEndProjectiles[id].playerId]){
          backEndPlayer.health--
          backEndPlayers[backEndProjectiles[id].playerId].score++
        }
        delete backEndProjectiles[id]
        if(backEndPlayer.health<=0){
          backEndPlayer.x = WIDTH * Math.random()
          backEndPlayer.y = HEIGHT * Math.random()
          backEndPlayer.health = BASE_HEALTH
          //delete backEndPlayers[playerId]
        }
        break
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles)
  io.emit('updatePlayers', backEndPlayers)
}, 10)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

console.log('server loaded')