document
  .querySelector(".join-room-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const roomCode = document.querySelector("#room-code").value;
    const errorMessageDiv = document.querySelector("#error-message");

    const response = await fetch("/joinroom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomCode }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("Joined room successfully");
      errorMessageDiv.textContent = "";
      window.location.href = data.redirect;
    } else {
      if (data.message === "Game has already started") {
        errorMessageDiv.textContent =
          "The game has already started. Please join another room.";
      } else {
        errorMessageDiv.textContent = data.message;
      }
    }
  });
