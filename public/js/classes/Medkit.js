class Medkit {
    constructor({ x, y, radius, color, room }) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.color = color || 'green'; // Domyślnie zielony kolor
      this.room = room;
    }
  
    draw() {
      // Rysowanie apteczki z efektem glow
      c.save();
      c.shadowColor = this.color; // Kolor glow
      c.shadowBlur = 20; // Rozmycie glow
      c.beginPath();
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
      c.fillStyle = this.color;
      c.fill();
      c.restore();
  
      // Rysowanie plusika (symbol apteczki)
      c.fillStyle = 'white';
      const plusSize = this.radius * 1; // Rozmiar plusika
      const lineWidth = this.radius * 0.2; // Grubość linii plusika
  
      // Pionowa linia plusika
      c.fillRect(
        this.x - lineWidth / 2,
        this.y - plusSize / 2,
        lineWidth,
        plusSize
      );
  
      // Pozioma linia plusika
      c.fillRect(
        this.x - plusSize / 2,
        this.y - lineWidth / 2,
        plusSize,
        lineWidth
      );
    }
  }