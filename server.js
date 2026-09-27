require("dotenv").config();
const bcrypt = require("bcrypt");

for (const name of ["MONGODB_URI", "SESSION_SECRET"]) {
  if (!process.env[name]) throw new Error(`${name} must be set`);
}

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { MongoClient } = require("mongodb");
const session = require("express-session");

const http = require("http");
const socketio = require("socket.io");

const app = express();
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
};
const server = http.createServer(app);
const io = socketio(server);

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "html")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/ressources", express.static(path.join(__dirname, "ressources")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

const db = client.db("nameanimalthing");

app.get("/home", (req, res) => {
  res.sendFile(__dirname + "/html/index.html");
});

app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/html/signup.html");
});

app.post("/signup", asyncHandler(async (req, res) => {
  const { username, email, password, avatar } = req.body;

  if (typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
    res.json({ success: false, message: "Email and password are required; password must be at most 72 bytes" });
    return;
  }

  const user = await db.collection("users").findOne({ email });
  if (user) {
    res.json({ success: false, message: "User already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db
    .collection("users")
    .insertOne({ username, email, password: passwordHash, avatar: avatar });
  if (result.acknowledged) {
    res.json({
      success: true,
      message: "User created successfully",
      redirect: "/signin",
    });
  } else {
    res.json({ success: false, message: "Error creating user" });
  }
}));

app.get("/signin", (req, res) => {
  res.sendFile(__dirname + "/html/signin.html");
});

app.post("/signin", asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
    res.json({ success: false, message: "Email and password are required; password must be at most 72 bytes" });
    return;
  }

  const user = await db.collection("users").findOne({ email });
  if (!user) {
    res.json({ success: false, message: "User does not exist" });
    return;
  }

  const isPasswordMatch = typeof user.password === "string" && await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    res.json({ success: false, message: "Incorrect password" });
    return;
  }

  const { password: storedPassword, ...userSession } = user;

  req.session.user = userSession;
  res.json({
    success: true,
    message: "User signed in successfully",
    redirect: "/dashboard",
  });
}));

app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }
  res.sendFile(__dirname + "/html/dashboard.html");
});

app.get("/viewprofile", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }
  res.sendFile(__dirname + "/html/viewprofile.html");
});

app.get("/api/user", asyncHandler(async (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const user = await db
    .collection("users")
    .findOne({ email: req.session.user.email });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const { password: storedPassword, ...publicUser } = user;
  res.json(publicUser);
}));

app.get("/contact", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }

  res.sendFile(__dirname + "/html/contactus.html");
});

app.post("/contact", asyncHandler(async (req, res) => {
  const { username, email, message } = req.body;

  try {
    // Assuming you have a collection named "contactMessages"
    const result = await db.collection("contactMessages").insertOne({
      username,
      email,
      message,
    });

    if (result.acknowledged) {
      res.json({
        success: true,
        message: "Message sent successfully",
        redirect: "/dashboard",
      });
    } else {
      res.json({
        success: false,
        message: "Failed to send message",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}));

app.put("/api/user", asyncHandler(async (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const updateFields = {};
  for (const key of ["username", "email", "password", "avatar"]) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      if (typeof req.body[key] !== "string" || !req.body[key]) {
        res.status(400).json({ success: false, message: "Invalid profile field" });
        return;
      }
      updateFields[key] = req.body[key];
    }
  }
  if (updateFields.password) {
    if (Buffer.byteLength(updateFields.password, "utf8") > 72) {
      res.status(400).json({ success: false, message: "Password must be at most 72 bytes" });
      return;
    }
    updateFields.password = await bcrypt.hash(updateFields.password, 12);
  }

  const email = req.session.user.email;

  // Check if the email is being updated and if it already exists in the database
  if (updateFields.email && updateFields.email !== email) {
    const existingUser = await db.collection("users").findOne({ email: updateFields.email });
    if (existingUser) {
      res.status(400).json({ message: "Email already in use" });
      return;
    }
  }

  try {
    const updateResult = await db.collection("users").updateOne({ email }, { $set: updateFields });

    if (updateResult.modifiedCount === 1) {
      // Update the user session if avatar is updated
      for (const key of ["username", "email", "avatar"]) {
        if (updateFields[key]) req.session.user[key] = updateFields[key];
      }

      res.json({ success: true, message: "User updated successfully" });
    } else {
      res.status(500).json({ message: "Error updating user" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}));

app.get("/creategame", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }

  res.sendFile(__dirname + "/html/creategame.html");
});

app.post("/creategame", asyncHandler(async (req, res) => {
  const { categories, totalRounds } = req.body;

  const creator = {
    _id: req.session.user._id,
    username: req.session.user.username,
    avatar: req.session.user.avatar,
  };

  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const game = {
    roomCode,
    categories,
    totalRounds,
    currentRound: 0,
    players: [{ ...creator, score: 0 }],
    rounds: [],
    status: "waiting",
    createdAt: new Date(),
  };


  const result = await db.collection("games").insertOne(game);

  if (result.acknowledged) {
    res.json({
      success: true,
      message: "Game created successfully",
      roomCode,
      redirect: `/waitingroom?roomCode=${roomCode}`,
    });
  } else {
    res.json({ success: false, message: "Error creating game" });
  }
}));

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomCode) => {
    socket.join(roomCode);
  });
});

app.get("/joinroom", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }
  res.sendFile(__dirname + "/html/joinroom.html");
});

app.post("/joinroom", asyncHandler(async (req, res) => {

  const { roomCode } = req.body;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.json({ success: false, message: "Room does not exist" });
    return;
  }

  if (game.status !== "waiting") {
    res.json({ success: false, message: "Game has already started" });
    return;
  }

  const player = {
    _id: req.session.user._id,
    username: req.session.user.username,
    score: 0,
    avatar: req.session.user.avatar,
  };

  const result = await db
    .collection("games")
    .updateOne({ roomCode }, { $push: { players: player } });

  if (result.modifiedCount === 1) {
    io.to(roomCode).emit("playerJoined", player);
    res.json({
      success: true,
      message: "Joined room successfully",
      redirect: `/waitingroom?roomCode=${roomCode}`,
    });
  } else {
    res.json({ success: false, message: "Error joining room" });
  }
}));

app.get("/waitingroom", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }
  res.sendFile(__dirname + "/html/waitingroom.html");
});

app.get("/api/waitingroom", asyncHandler(async (req, res) => {
  const { roomCode } = req.query;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.status(404).json({ message: "Room not found" });
    return;
  }

  const isCreator =
    req.session.user._id.toString() === game.players[0]._id.toString();

  res.json({ game, isCreator });
}));

app.get("/api/roominfo", asyncHandler(async (req, res) => {
  const { roomCode } = req.query;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.status(404).json({ message: "Room not found" });
    return;
  }
  res.json({ game });
}));

app.get("/howtoplay", (req, res) => {
  res.sendFile(__dirname + "/html/howtoplay.html");
});

const alphabet = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

app.post("/api/startgame", asyncHandler(async (req, res) => {
  const { roomCode } = req.body;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.json({ success: false, message: "Game does not exist" });
    return;
  }

  if (game.status !== "waiting") {
    res.json({ success: false, message: "Game has already started" });
    return;
  }

  const letter = alphabet[Math.floor(Math.random() * alphabet.length)];

  const round = {
    roundNumber: game.currentRound + 1,
    letter,
    status: "active",
    playerResponses: [],
  };

  const result = await db.collection("games").updateOne(
    { roomCode },
    {
      $set: { status: "active", currentRound: round.roundNumber },
      $push: { rounds: round },
    }
  );

  if (result.modifiedCount === 1) {
    io.to(roomCode).emit("gameStarted", {
      letter,
      categories: game.categories,
    });
    res.redirect(`/game?roomCode=${roomCode}`);
  } else {
    res.json({ success: false, message: "Error starting game" });
  }
}));

app.get("/signout", (req, res) => {

  req.session.destroy((err) => {
    if (err) {
      res.status(500).send("Could not sign out. Please try again.");
    } else {
      res.redirect("/home");

    }
  });
});

app.post("/api/submitanswers", asyncHandler(async (req, res) => {
  const { roomCode, answers } = req.body;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.json({ success: false, message: "Game does not exist" });
    return;
  }

  try {
    const result = await db.collection("games").updateOne(
      {
        roomCode,
        "rounds.playerResponses.player": { $ne: req.session.user.username },
      },
      {
        $push: {
          "rounds.$[round].playerResponses": {
            player: req.session.user.username,
            answers,
            gradesSubmitted: false, // Initialize gradesSubmitted to false
          },
        },
      },
      {
        arrayFilters: [{ "round.roundNumber": game.currentRound }],
      }
    );

    if (result.modifiedCount === 1) {
      console.log("Submitted answers");
      io.in(roomCode).emit("submitForm");
      res.json({ success: true });
    } else {
      console.log("Failed to submit answers");
      res.json({ success: false });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
}));

app.get("/api/getanswers", asyncHandler(async (req, res) => {
  const { roomCode } = req.query;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.json({ success: false, message: "Game does not exist" });
    return;
  }

  const round = game.rounds.find((round) => round.status === "active");
  if (!round) {
    res.json({ success: false, message: "No active round" });
    return;
  }

  const currentUserIndex = round.playerResponses.findIndex(
    (response) => response.player === req.session.user.username
  );
  const nextUserIndex = (currentUserIndex + 1) % round.playerResponses.length;

  res.json({
    success: true,
    playerResponses: round.playerResponses,
    gradingIndex: nextUserIndex,
  });
}));

app.get("/grading", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");

    return;
  }
  res.sendFile(__dirname + "/html/grading.html");
});

app.get("/game", (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }
  res.sendFile(__dirname + "/html/game.html");
});

let nb = 0;

app.post("/api/submitgrades", asyncHandler(async (req, res) => {
  const { roomCode, grades } = req.body;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.json({ success: false, message: "Game does not exist" });
    return;
  }

  const round = game.rounds.find((round) => round.status === "active");
  if (!round) {
    res.json({ success: false, message: "No active round" });
    return;
  }

  const currentUserIndex = round.playerResponses.findIndex(
    (response) => response.player === req.session.user.username
  );
  const nextUserIndex = (currentUserIndex + 1) % round.playerResponses.length;
  const nextUser = round.playerResponses[nextUserIndex].player;

  const playerResponse = round.playerResponses.find(
    (response) => response.player === nextUser
  );
  if (playerResponse && playerResponse.gradesSubmitted) {
    res.json({
      success: false,
      message: "You have already submitted grades for this round",
    });
    return;
  }

  const result = await db.collection("games").updateOne(
    { roomCode, "rounds.roundNumber": round.roundNumber },
    {
      $push: {
        "rounds.$.playerResponses.$[playerResponse].grades": {
          grader: req.session.user.username,
          grades,
        },
      },
      $set: {
        "rounds.$.playerResponses.$[playerResponse].gradesSubmitted": true,
      },
    },
    {
      arrayFilters: [{ "playerResponse.player": nextUser }],
    }
  );

  if (result.modifiedCount === 1) {
    nb++;

    if (nb === 2) {
      nb = 0;
      io.emit("nextRound");
    }

    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Error submitting grades" });
  }
}));

app.get("/results", asyncHandler(async (req, res) => {
  if (!req.session.user) {
    res.redirect("/signin");
    return;
  }

  const { roomCode } = req.query;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.redirect("/dashboard");
    return;
  }

  res.sendFile(__dirname + "/html/results.html");
}));

app.get("/api/getresults", asyncHandler(async (req, res) => {
  const { roomCode } = req.query;

  const game = await db.collection("games").findOne({ roomCode });
  if (!game) {
    res.json({ success: false, message: "Game does not exist" });
    return;
  }

  const round = game.rounds.find((round) => round.status === "active");
  if (!round) {
    res.json({ success: false, message: "No active round" });
    return;
  }

  const playerResponses = round.playerResponses.map((response) => {
    const player = game.players.find(
      (player) => player.username === response.player
    );
    return {
      player: response.player,
      avatar: player.avatar,
      totalGrade: response.grades[0],
    };
  });
  res.json({ success: true, playerResponses });
}));

app.put("/api/updateuser", asyncHandler(async (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const { won, username } = req.body;

  const updateFields = {
    $inc: { gamesPlayed: 1 },
  };

  if (won) {
    updateFields.$inc.gamesWon = 1;
  }

  const updateResult = await db
    .collection("users")
    .updateOne({ username: username }, updateFields);

  if (updateResult.modifiedCount === 1) {
    res.json({ success: true, message: "User updated successfully" });
  } else {
    res.status(500).json({ message: "Error updating user" });
  }
}));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

server.listen(3001, () => {
  console.log("Server is running at port 3001");
});
