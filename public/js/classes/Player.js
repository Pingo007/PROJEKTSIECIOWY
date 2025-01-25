class Player {
  constructor({x, y, radius, color, username, room, health, ammo, maxAmmo, canDash = false}) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.username = username;
    this.room = room;
    this.health = health;
    this.maxHealth = health; // Maksymalna wartość zdrowia
    this.ammo = ammo; // Aktualna ilość amunicji
    this.maxAmmo = maxAmmo; // Maksymalna ilość amunicji
    this.canDash = canDash; // Czy gracz może dashować
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
      this.y - this.radius - 18, 
      healthBarWidth + 2, 
      healthBarHeight + 2
    );
  
    // Tło paska zdrowia (czerwone)
    c.fillStyle = 'red';
    c.fillRect(
      this.x - this.radius, 
      this.y - this.radius - 17, 
      healthBarWidth, 
      healthBarHeight
    );
  
    // Aktualne zdrowie (zielone)
    c.fillStyle = 'hsl(90, 100%, 41%)';
    c.fillRect(
      this.x - this.radius, 
      this.y - this.radius - 17, 
      healthBarWidth * healthPercentage, 
      healthBarHeight
    );

    // Pasek amunicji
    const ammoBarWidth = this.radius * 2;
    const ammoBarHeight = 6;
    const ammoPercentage = this.ammo / this.maxAmmo;

    // Biała ramka dla paska amunicji
    c.fillStyle = 'white';
    c.fillRect(
      this.x - this.radius - 1, 
      this.y - this.radius - ammoBarHeight - 3, // Pozycja pod paskiem zdrowia
      ammoBarWidth + 2, 
      ammoBarHeight + 2
    );

    // Tło paska amunicji (szare)
    c.fillStyle = 'hsl(0, 0%, 80%)';
    c.fillRect(
      this.x - this.radius, 
      this.y - this.radius - ammoBarHeight - 2, // Pozycja pod paskiem zdrowia
      ammoBarWidth, 
      ammoBarHeight
    );

    // Aktualna amunicja (ciemniejszy szary)
    c.fillStyle = 'hsl(0, 0%, 35%)';
    c.fillRect(
      this.x - this.radius, 
      this.y - this.radius - ammoBarHeight - 2, // Pozycja pod paskiem zdrowia
      ammoBarWidth * ammoPercentage, 
      ammoBarHeight
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

    // Wyświetlenie litery "D" jeśli gracz może dashować
    // Wyświetlenie litery "D" jeśli gracz może dashować
    if (this.canDash) {
      c.font = 'bold 18px sans-serif'; // Grubsza i większa czcionka
      c.fillStyle = 'white';
      c.fillText(
        'D',
        this.x + this.radius -10 , // Pozycja po prawej stronie gracza
        this.y - this.radius - ammoBarHeight +20 // Pozycja pod paskiem amunicji
      );
    }
  }  
}