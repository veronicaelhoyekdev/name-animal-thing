const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get("roomCode");

socket.emit("joinRoom", roomCode);

socket.on("playerJoined", (player) => {
  console.log(player);
  const userAvatarDiv = document.createElement("div");
  userAvatarDiv.className = "user-avatar";

  const img = document.createElement("img");
  console.log(player.avatar);
  img.src = player.avatar;
  img.alt = `User Avatar ${player.username}`;
  console.log(player.username);

  const p = document.createElement("p");
  p.textContent = player.username;

  userAvatarDiv.appendChild(img);
  userAvatarDiv.appendChild(p);

  document.querySelector(".user-grid").appendChild(userAvatarDiv);
});

window.addEventListener("load", async () => {
  const response = await fetch(`/api/waitingroom?roomCode=${roomCode}`);
  const data = await response.json();

  console.log(data);
  document.querySelector("h2").textContent = `Room #${data.game.roomCode}`;
  data.game.players.forEach((player) => {
    const userAvatarDiv = document.createElement("div");
    userAvatarDiv.className = "user-avatar";

    const img = document.createElement("img");
    img.src = player.avatar;
    img.alt = `User Avatar ${player.username}`;

    const p = document.createElement("p");
    p.textContent = player.username;

    userAvatarDiv.appendChild(img);
    userAvatarDiv.appendChild(p);

    document.querySelector(".user-grid").appendChild(userAvatarDiv);

    if (data.isCreator) {
      document.querySelector(".button").style.display = "block";
    } else {
      document.querySelector(".button").style.display = "none";
    }
  });
});

document.querySelector(".button").addEventListener("click", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get("roomCode");

  fetch("/api/startgame", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roomCode }),
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        window.location.href = data.redirect;
      } else {
        console.error("Failed to start game");
      }
    });
});

socket.on("gameStarted", () => {
  window.location.href = `/game?roomCode=${roomCode}`;
});
