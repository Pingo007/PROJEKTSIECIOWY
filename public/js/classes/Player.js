class Player {
  constructor({x, y, radius, color, username, room, health}) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.username = username;
    this.room = room;
    this.health = health;
    this.maxHealth = health; // Maksymalna wartość zdrowia
  }

  draw() {
    // Wyświetlenie nazwy gracza (wyśrodkowane)
    c.font = '12px sans-serif';
    c.fillStyle = 'white';
    const textWidth = c.measureText(this.username).width; // Pomiar szerokości tekstu
    c.fillText(
      this.username,
      this.x - textWidth / 2, // Wyśrodkowanie tekstu względem gracza
      this.y + this.radius + 15 // Pozycja pod graczem
    );
  
    // Pasek zdrowia
    const healthBarWidth = this.radius * 2;
    const healthBarHeight = 6;
    const healthPercentage = this.health / this.maxHealth;
  
    // Biała ramka dla paska zdrowia
    c.fillStyle = 'white';
    c.fillRect(
      this.x - this.radius - 1, 
      this.y - this.radius - 12, 
      healthBarWidth + 2, 
      healthBarHeight + 2
    );
  
    // Tło paska zdrowia (czerwone)
    c.fillStyle = 'red';
    c.fillRect(
      this.x - this.radius, 
      this.y - this.radius - 11, 
      healthBarWidth, 
      healthBarHeight
    );
  
    // Aktualne zdrowie (zielone)
    c.fillStyle = 'hsl(90, 100%, 41%)';
    c.fillRect(
      this.x - this.radius, 
      this.y - this.radius - 11, 
      healthBarWidth * healthPercentage, 
      healthBarHeight
    );
  
    // Rysowanie gracza z efektem glow
    c.save();
    c.shadowColor = this.color; // Kolor glow
    c.shadowBlur = 20; // Rozmycie glow
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();
  }  
}
