document
  .getElementById("signin-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (!email || !password) {
      document.getElementById("error-message").innerText =
        "Please fill in all fields";
      return;
    }

    fetch("/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
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
