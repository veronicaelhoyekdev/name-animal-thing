function isStrongPassword(password) {
  if (password.length < 8) {
    return "Password should be at least 8 characters long.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password should contain at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password should contain at least one uppercase letter.";
  }
  if (!/\d/.test(password)) {
    return "Password should contain at least one number.";
  }
  if (!/[@$!%*?&]/.test(password)) {
    return "Password should contain at least one special character.";
  }
  return "";
}

let originalUsername, originalEmail, originalAvatar;

fetch("/api/user")
  .then((response) => response.json())
  .then((user) => {
    originalUsername = user.username;
    originalEmail = user.email;
    originalAvatar = user.avatar;

    document.getElementById("username").value = originalUsername;
    document.getElementById("email").value = originalEmail;
    document.getElementById("profile-pic").src =
      originalAvatar || "../ressources/pfp.png";
    document.getElementById("games-played").innerText = user.gamesPlayed || 0;
    document.getElementById("games-won").innerText = user.gamesWon || 0;
    document.getElementById("games-lost").innerText =
      user.gamesPlayed - user.gamesWon || 0;
    document.getElementById("winning-percentage").innerText =
      (user.gamesWon / user.gamesPlayed) * 100 || "0%";
  })
  .catch((error) => console.error("Error:", error));

document
  .getElementById("edit-avatar-button")
  .addEventListener("click", function () {
    const buttonLabel = this.textContent;
    const avatarSelection = document.getElementById("avatar-selection");

    if (buttonLabel === "Edit") {
      // Show avatar selection when clicking "Edit"
      avatarSelection.style.display = "block";
      this.textContent = "Save";
    } else if (buttonLabel === "Save") {
      // Save the new avatar when clicking "Save"
      avatarSelection.style.display = "none";
      this.textContent = "Edit";
      const newAvatar = document.getElementById("profile-pic").src;
      if (originalAvatar !== newAvatar) {
        updateAvatar(newAvatar);
      }
    }
  });

function updateAvatar(newAvatar) {
  // Assuming newAvatar is the URL or identifier of the selected avatar
  fetch("/api/user", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ avatar: newAvatar }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("User updated successfully.");
        originalAvatar = newAvatar; // Update the originalAvatar variable
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((error) => console.error("Error:", error));
}

// ... rest of your code ...

document.querySelectorAll("#avatar-selection .avatar").forEach((avatarEl) => {
  avatarEl.addEventListener("click", function () {
    document
      .querySelectorAll("#avatar-selection .avatar")
      .forEach((av) => av.classList.remove("selected"));
    this.classList.add("selected");
    originalAvatar = this.getAttribute("data-avatar"); // Use data-avatar attribute
    document.getElementById("profile-pic").src = this.src; // Update profile picture preview

    // Hide the avatar selection list after an avatar is selected
    document.getElementById("avatar-selection").style.display = "none";
    document.getElementById("edit-avatar-button").textContent = "Save"; // Change the button text to 'Save'
  });
});

document.querySelectorAll(".edit-button").forEach((button) => {
  button.addEventListener("click", (event) => {
    const input = event.target.parentElement.querySelector("input");
    input.disabled = !input.disabled;

    if (!input.disabled) {
      event.target.textContent = "Save";
    } else {
      event.target.textContent = "Edit";

      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      if (input.type === "password" && password !== "********") {
        const passwordStrengthMessage = isStrongPassword(password);
        if (passwordStrengthMessage !== "") {
          alert(passwordStrengthMessage); // Display the validation message
          input.value = "********"; // Reset to the original password placeholder
          input.focus(); // Set focus back to the password input for correction
          return; // Stop further processing
        }
      }

      const requestBody = {};

      if (username !== originalUsername && username !== "") {
        requestBody.username = username;
      }

      if (email !== originalEmail && email !== "") {
        requestBody.email = email;
      }

      if (password !== "********" && password !== "") {
        requestBody.password = password;
      }

      if (Object.keys(requestBody).length > 0) {
        fetch("/api/user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              alert(data.message);
            } else {
              alert("Error: " + data.message);
            }
          })
          .catch((error) => console.error("Error:", error));
      } else {
        alert("No changes made");
      }
    }
  });
});
