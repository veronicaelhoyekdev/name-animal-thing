fetch("/api/user")
    .then((response) => response.json())
    .then((user) => {
        document.getElementById("username").value = user.username;
        document.getElementById("email").value = user.email;
        document.getElementById("username").disabled = true;
        document.getElementById("email").disabled = true;
    })
    .catch((error) => console.error("Error:", error));

document.querySelector(".contact-us-form").addEventListener("submit", function (event) {
    event.preventDefault();

    let username = document.getElementById("username").value;
    let email = document.getElementById("email").value;
    let message = document.getElementById("message").value;

    fetch("/contact", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: username,
            email: email,
            message: message,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                window.location.href = data.redirect;
                console.log("Message sent successfully");
            } else {
                console.error("Failed to send message:", data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
        });
});
