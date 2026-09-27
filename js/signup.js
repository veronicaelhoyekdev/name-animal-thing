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

document.querySelectorAll(".avatar").forEach((avatar) => {
  avatar.addEventListener("click", function () {
    document
      .querySelectorAll(".avatar")
      .forEach((av) => av.classList.remove("selected"));
    this.classList.add("selected");
  });
});

document
  .getElementById("signup-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    let username = document.getElementById("username").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      document.getElementById("error-message").innerText =
        "Passwords do not match";
      return;
    }

    let passwordStrengthMessage = isStrongPassword(password);
    if (passwordStrengthMessage !== "") {
      document.getElementById("error-message").innerText =
        passwordStrengthMessage;
      return;
    }

    let selectedAvatar = document.querySelector(".avatar.selected");
    let avatar = selectedAvatar ? selectedAvatar.getAttribute("src") : null;

    fetch("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        email: email,
        password: password,
        avatar: avatar,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          document.getElementById("error-message").innerText =
            "Error: " + data.message;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });
