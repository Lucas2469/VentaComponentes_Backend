// middleware/uploadQrCodes.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const PUBLIC_SUBDIR = "/images/imagesPacks";
const DIR = path.join(__dirname, "..", PUBLIC_SUBDIR.replace(/^\//, ""));

fs.mkdirSync(DIR, { recursive: true });   // <- crea la carpeta si falta

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `pack-${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype);
  cb(ok ? null : new Error("Solo se permiten imágenes (JPG/PNG/WEBP)"), ok);
};

module.exports = multer({ storage, fileFilter });
