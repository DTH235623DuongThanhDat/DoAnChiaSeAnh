const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Photo = require("../models/Photo");
const User = require("../models/User");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const upload = multer({ dest: "uploads/" });
// Trang chủ
router.get("/", async (req, res) => {
  const searchQuery = req.query.q || "";
  let query = {};
  let usersQuery = {};
  let foundUsers = [];

  if (searchQuery) {
    query.title = { $regex: searchQuery, $options: "i" };
    usersQuery.username = { $regex: searchQuery, $options: "i" };
    foundUsers = await User.find(usersQuery);
  }

  const photos = await Photo.find(query).sort({ createdAt: -1 });
  res.render("index", { photos, searchQuery, foundUsers });
});
router.get("/photo/:id", async (req, res) => {
  try {
    // 1. Kiểm tra ID có đúng định dạng MongoDB không
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send("ID ảnh không đúng định dạng (phải là 24 ký tự hex)");
    }

    const photo = await Photo.findById(req.params.id).populate("user", "username");

    if (!photo) {
      return res.status(404).send("Không tìm thấy ảnh trong Database");
    }

    res.render("detail", { photo });
  } catch (err) {
    console.error("Lỗi server:", err);
    res.status(500).send("Có lỗi xảy ra trên server");
  }
});
router.get("/edit/:id", auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    // Kiểm tra quyền: chỉ chủ ảnh mới được sửa
    if (!photo || photo.user.toString() !== req.session.userId) {
      return res.send("Bạn không có quyền sửa ảnh này!");
    }

    res.render("edit", { photo });
  } catch (err) {
    console.log(err);
    res.status(500).send("Lỗi server");
  }
});
router.post("/edit/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo || photo.user.toString() !== req.session.userId) {
      return res.send("Không có quyền!");
    }

    // Cập nhật tiêu đề
    photo.title = req.body.title;

    // Nếu người dùng có chọn ảnh mới để thay thế
    if (req.file) {
      // 1. Xóa ảnh cũ trên Cloudinary
      if (photo.cloudinaryId) {
        await cloudinary.uploader.destroy(photo.cloudinaryId);
      }
      // 2. Upload ảnh mới
      const result = await cloudinary.uploader.upload(req.file.path);
      photo.imageUrl = result.secure_url;
      photo.cloudinaryId = result.public_id;

      // Xóa file tạm sau khi upload xong
      fs.unlinkSync(req.file.path);
    }

    await photo.save();
    res.redirect("/photo/" + photo._id); // Quay về trang chi tiết
  } catch (err) {
    console.log(err);
    res.send("Lỗi khi cập nhật");
  }
});
// Upload (phải login)
router.post("/upload", auth, upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path);

    const newPhoto = new Photo({
      title: req.body.title,
      imageUrl: result.secure_url,
      cloudinaryId: result.public_id,
      user: req.session.userId
    });

    await newPhoto.save();

    // Xóa file tạm sau khi upload xong
    fs.unlinkSync(req.file.path);

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// Delete (chỉ chủ ảnh)
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) return res.send("Không tìm thấy ảnh");

    if (!photo.user || photo.user.toString() !== req.session.userId) {
      return res.send("Không có quyền xóa ảnh này");
    }

    if (photo.cloudinaryId) {
      await cloudinary.uploader.destroy(photo.cloudinaryId);
    }

    await Photo.findByIdAndDelete(req.params.id);

    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});
router.get("/photo/:id", async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id)
      .populate("user", "username");

    if (!photo) return res.send("Không tìm thấy ảnh");

    res.render("detail", { photo });

  } catch (err) {
    console.log(err);
  }
});

// Xem hồ sơ người khác
router.get("/user/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).send("ID người dùng không hợp lệ");
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("Không tìm thấy người dùng");

    const photos = await Photo.find({ user: user._id }).sort({ createdAt: -1 });
    res.render("profile", { user, photos });
  } catch (err) {
    console.log(err);
    res.status(500).send("Lỗi server");
  }
});

module.exports = router;