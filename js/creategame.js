document
  .querySelector(".create-game-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const roundsElement = document.querySelector("#rounds");
    const totalRounds = roundsElement.value;

    const categoryElements = document.querySelectorAll(
      'input[name="category"]:checked'
    );
    const categories = Array.from(categoryElements).map((el) => el.value);

    const response = await fetch("/creategame", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ categories, totalRounds }),
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = data.redirect;
    } else {
      alert("Error creating game: " + data.message);
    }
  });
