const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Photo = require("../models/Photo");
const auth = require("../middleware/auth");

// form login
router.get("/login", (req, res) => {
  res.render("login", {
    error: null
  });
});

// form register
router.get("/register", (req, res) => {
  res.render("register", {
    error: null,
    oldData: {}
  });
});

// register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // kiểm tra trùng username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render("register", {
        error: "Username đã tồn tại!",
        oldData: { username }
      });
    }

    // validate password
    if (password.length < 6) {
      return res.render("register", {
        error: "Mật khẩu phải >= 6 ký tự",
        oldData: { username }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    res.redirect("/login");

  } catch (err) {
    console.log(err);
    res.render("register", {
      error: "Lỗi server",
      oldData: {}
    });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.render("login", {
        error: "Tài khoản không tồn tại"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        error: "Sai mật khẩu"
      });
    }

    req.session.userId = user._id;

    res.redirect("/");

  } catch (err) {
    console.log(err);
    res.render("login", {
      error: "Lỗi server"
    });
  }
});

// logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const photos = await Photo.find({ user: req.session.userId }).sort({ createdAt: -1 });
    res.render("profile", { user, photos });
  } catch (err) {
    console.log(err);
    res.status(500).send("Lỗi server");
  }
});

module.exports = router;
