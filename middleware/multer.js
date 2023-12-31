const multer = require("multer");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
};

const storage = multer.diskStorage({
  filename: (req, file, callback) => {
    const name = file.originalname.toLowerCase().split(" ").join("-");
    const ext = MIME_TYPE_MAP[file.mimetype];
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error = new Error("Invalid mime type");
    if (isValid) {
      error = null;
    }
    callback(error, name + "-" + Date.now() + "." + ext);
  },
});

const upload = multer({ storage: storage });

module.exports = upload;

// const MIME_TYPE_MAP = {
//   "image/png": "png",
//   "image/jpg": "jpg",
//   "image/jpeg": "jpg",
// };

// const storage = multer.diskStorage({
//   destination: (req, file, callback) => {
//     const isValid = MIME_TYPE_MAP[file.mimetype];
//     let error = new Error("Invalid mime type");
//     if (isValid) {
//       error = null;
//     }
//     callback(error, "images");
//   },
//   filename: (req, file, callback) => {
//     const name = file.originalname.toLowerCase().split(" ").join("-");
//     const ext = MIME_TYPE_MAP[file.mimetype];
//     callback(null, name + "-" + Date.now() + "." + ext);
//   },
// });
