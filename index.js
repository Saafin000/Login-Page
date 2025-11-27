require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("./config/passport");
const bodyParser = require("body-parser");
const path = require("path");
const flash = require("connect-flash");

const User = require("./models/User");

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Session (ONLY ONCE — your previous code had 2 session() blocks)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// Flash middleware
app.use(flash());

// Inject flash messages into all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error"); // Passport-specific errors
  next();
});

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✔ MongoDB Atlas Connected"))
  .catch((err) => console.log(err));

// Routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

// REGISTER POST
app.post("/register", async (req, res) => {
  const bcrypt = require("bcryptjs");
  const { username, email, password } = req.body;

  const userExist = await User.findOne({ email });
  if (userExist) {
    req.flash("error_msg", "❌ User already exists!");
    return res.redirect("/register");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
  });

  await newUser.save();
  req.flash("success_msg", "✔ Registration successful! Please login.");
  res.redirect("/login");
});

// LOGIN POST
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,  // Show flash if login fails
  })
);

// GOOGLE LOGIN
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GOOGLE CALLBACK
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

// PROTECTED ROUTE
function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash("error_msg", "Please login first.");
  res.redirect("/login");
}

app.get("/dashboard", isAuth, (req, res) => {
  req.flash("success_msg", ""); // clear success flash
  req.flash("error_msg", "");   // clear error flash
  req.flash("error", "");       // clear passport error

  res.render("dashboard", { user: req.user });
});


// LOGOUT
app.get("/logout", (req, res) => {
  req.logout(() => {
    req.flash("success_msg", "Logged out successfully.");
    res.redirect("/login");
  });
});

// Start Server
app.listen(3000, () =>
  console.log("🔥 Server running at http://localhost:3000")
);
