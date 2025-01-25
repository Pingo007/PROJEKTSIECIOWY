// Pobierz elementy audio
const shootSound = document.getElementById('shootSound');
const reloadSound = document.getElementById('reloadSound');
const hitSound = document.getElementById('hitSound');
const dashSound = document.getElementById('dashSound');

// Ustaw głośność domyślną (np. 50%)
shootSound.volume = 0.5; // 50% głośności
reloadSound.volume = 0.5; // 50% głośności
dashSound.volume = 0.5;
hitSound.volume = 0.25;

// Funkcja do odtwarzania dźwięku
function playSound(sound) {
  if (sound === 'shoot') {
    shootSound.currentTime = 0; // Przewiń dźwięk do początku
    shootSound.play(); // Odtwórz dźwięk strzału
  } else if (sound === 'reload') {
    reloadSound.currentTime = 0; // Przewiń dźwięk do początku
    reloadSound.play(); // Odtwórz dźwięk przeładowania
  } else if (sound === 'hit') {
    hitSound.currentTime = 0; // Przewiń dźwięk do początku
    hitSound.play(); // Odtwórz dźwięk przeładowania
  } else  if (sound === 'dash'){
    dashSound.currentTime = 0; // Przewiń dźwięk do początku
    dashSound.play(); // Odtwórz dźwięk przeładowania
  }
}

socket.on('play_sound', (data) => {
  playSound(data.sound); // Odtwórz odpowiedni dźwięk
});

addEventListener('click', (event) => {

    if(!frontEndPlayers[socket.id]) return

    const canvas = document.querySelector('canvas')
    const {top, left} = canvas.getBoundingClientRect()
    const playerPosition = {
        x: frontEndPlayers[socket.id].x,
        y: frontEndPlayers[socket.id].y
    }
    const angle = Math.atan2(
    (event.clientY - top) - playerPosition.y,
    (event.clientX - left) - playerPosition.x
  )

//   const velocity = {
//     x: Math.cos(angle) * 5,
//     y: Math.sin(angle) * 5
//   }

  socket.emit('shoot', {
    x: playerPosition.x,
    y: playerPosition.y,
    angle
  })

//   frontEndProjectiles.push(
//     new Projectile({
//         x:playerPosition.x, 
//         y:playerPosition.y, 
//         radius:5, 
//         color:'white', 
//         velocity})
//   )

})
