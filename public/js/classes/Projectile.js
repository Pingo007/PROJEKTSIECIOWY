class Projectile {
  constructor({ x, y, radius, color = 'white', velocity, room }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.room = room;
  }

  draw() {
    c.save();
    c.shadowColor = this.color;
    c.shadowBlur = 20;

    // Rysowanie wypełnienia pocisku
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();

    // Rysowanie białej obwódki
    c.strokeStyle = 'white'; // Kolor obwódki
    c.lineWidth = 1; // Grubość obwódki
    c.stroke();

    c.restore();
  }

  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}