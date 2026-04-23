const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();

//Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Đã kết nối với MongoDB"))
  .catch(err => console.log(err));

// 🔥 1. Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Session
app.use(session({
  secret: "secretkey123",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: { maxAge: 1000 * 60 * 60 } // 1h
}));

//3. Truyền userId ra view + trạng thái login
app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  res.locals.isLoggedIn = !!req.session.userId; // 👈 thêm dòng này
  next();
});

//Config
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(methodOverride("_method"));

//4. Routes
app.use("/", require("./routes/authRoutes"));
app.use("/", require("./routes/photoRoutes"));

//Server
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
