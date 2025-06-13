// Super basic example without any imports
console.log('Basic example is running!');

// Create a simple board-like object
const testBoard = {
  width: 3,
  height: 3,
  squares: [
    { x: 1, y: 1, value: 'center' }
  ],
  getSquare(x: number, y: number) {
    return this.squares.find(s => s.x === x && s.y === y) || null;
  }
};

console.log('Test board created:');
console.log(`Size: ${testBoard.width}x${testBoard.height}`);
console.log(`Center square: ${testBoard.getSquare(1, 1)?.value}`);
