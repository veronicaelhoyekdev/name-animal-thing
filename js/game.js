const socket = io();

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get("roomCode");

  console.log("Joining room", roomCode);
  socket.emit("joinRoom", roomCode);

  const response = await fetch(`/api/roominfo?roomCode=${roomCode}`);
  const data = await response.json();
  console.log(data);

  document.querySelector(
    "#roomCode"
  ).textContent = `Game Room #${data.game.roomCode}`;
  document.querySelector("#letter").textContent = `Letter: ${
    data.game.rounds[data.game.currentRound - 1].letter
  }`;

  data.game.categories.forEach((category) => {
    const div = document.createElement("div");
    div.className = "category";

    const label = document.createElement("label");
    label.textContent = category;
    label.htmlFor = category;

    const input = document.createElement("input");
    input.type = "text";
    input.id = category;
    input.name = category;

    div.appendChild(label);
    div.appendChild(input);

    document.querySelector("#categories").appendChild(div);
  });

  const submitForm = async (event) => {
    if (event) event.preventDefault();

    const formData = new FormData(document.querySelector("#gameForm"));
    const answers = Object.fromEntries(formData.entries());

    fetch("/api/submitanswers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomCode, answers }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = `/grading?roomCode=${roomCode}`;
        } else {
          console.error("Failed to submit answers");
        }
      });
  };

  document.querySelector("#gameForm").addEventListener("submit", submitForm);

  socket.on("submitForm", submitForm);
});
