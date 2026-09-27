const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get("roomCode");

window.addEventListener("load", async () => {
  const response = await fetch(`/api/getanswers?roomCode=${roomCode}`);
  const data = await response.json();

  if (data.success) {
    const gradesList = document.querySelector(".grades-list");

    data.playerResponses.forEach((response, index) => {
      const playerGrade = document.createElement("div");
      playerGrade.className = "player-grade";

      const playerName = document.createElement("input");
      playerName.type = "text";
      playerName.value = `Player ${index + 1} - ${response.player}`;
      playerName.disabled = true;

      playerGrade.appendChild(playerName);

      Object.entries(response.answers).forEach(([category, answer]) => {
        const gradeSection = document.createElement("div");
        gradeSection.className = "grade-section";

        const answerInput = document.createElement("input");
        answerInput.type = "text";
        answerInput.value = `${category}: ${answer}`;
        answerInput.disabled = true;

        const gradeSelect = document.createElement("select");
        gradeSelect.name = `${category}Grade${index + 1}`;
        [0, 5, 10].forEach((grade) => {
          const option = document.createElement("option");
          option.value = grade;
          option.textContent = grade;
          gradeSelect.appendChild(option);
        });

        // Disable the grading select if this is not the response to be graded
        if (index !== data.gradingIndex) {
          gradeSelect.disabled = true;
        }

        gradeSection.appendChild(answerInput);
        gradeSection.appendChild(gradeSelect);

        playerGrade.appendChild(gradeSection);
      });

      gradesList.appendChild(playerGrade);
    });
  } else {
    console.error("Failed to fetch answers");
  }
});

async function submitGrades() {
  console.log("submitGrades called"); // Add this line

  const grades = Array.from(document.querySelectorAll("select"))
    .filter((select) => !select.disabled)
    .map((select) => ({
      category: select.name.split("Grade")[0],
      grade: select.value,
    }));

  const response = await fetch("/api/submitgrades", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roomCode, grades }),
  });

  const data = await response.json();
  if (data.success) {
    console.log("Grades submitted successfully");
    socket.emit("gradesSubmitted", { roomCode });
  } else {
    console.error("Failed to submit grades");
  }
}

document
  .getElementById("submitGradesButton")
  .addEventListener("click", submitGrades);

socket.on("nextRound", () => {
  // Redirect to the next round
  console.log("nextRound called"); // Add this line
  window.location.href = `/results?roomCode=${roomCode}`;
});
