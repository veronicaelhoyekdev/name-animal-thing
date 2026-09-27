const container = document.querySelector('.home-container');
let colorIndex = 1;

function changeColor() {
    container.className = `home-container color-${colorIndex}`;
    colorIndex = colorIndex < 10 ? colorIndex + 1 : 1;
}

// You can trigger this function using setInterval or any event as needed
// Example with setInterval
setInterval(changeColor, 100); // Change color every 3 seconds
