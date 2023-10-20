const express = require("express");
const bcrypt = require("bcryptjs"); // To encrypt password
const jwt = require("jsonwebtoken"); // To generate token
const bodyParser = require("body-parser"); // To parse JSON Object
const fs = require("fs");
const cloudinary = require("cloudinary");
const multer = require("../middleware/multer");
const User = require("../models/user");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

//Uploading image

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// This route is used to upload picture to cloudinary

router.post(
  "/upload-profile-picture/:id",
  multer.single("image"),
  async (req, res, next) => {
    console.log(`Uploading image for userID: ${req.params.id}`);
    try {
      let user = await User.findById(req.params.id);
      if (!user) {
        throw "User not found.";
      }
      if (user.imagePath) {
        const image = await cloudinary.uploader.destroy(
          user.imagePath.split("/").pop().split(".")[0]
        );
        if (image.result !== "ok") {
          throw "Couldn't delete the picture!";
        }
      }
      const result = await cloudinary.uploader.upload(req.file.path);
      user.imagePath = result.url;
      user = await user.save();
      return res.status(200).json({
        message: "Picture uploaded successfully!",
      });
    } catch (err) {
      console.log(err);
    }
  }
);

// This route is used to upload picture to the backend-server

// router.post(
//   "/upload-profile-picture/:id",
//   multer({ storage: storage }).single("image"),
//   (req, res, next) => {
//     console.log(`Uploading image for userID: ${req.params.id}`);
//     User.findById(req.params.id).then((user) => {
//       if (user.imagePath) {
//         const oldImagePath =
//           "backend/images/" + user.imagePath.split("/").pop();
//         console.log("Old image found: ", oldImagePath);
//         fs.unlink(oldImagePath, (error) => {
//           if (error) {
//             console.log(
//               "Error while deleting file: ",
//               user.imagePath,
//               "\nImage could not be uploaded!"
//             );
//             console.log(error);
//             return;
//           }

//           console.log("File deleted successfully: ", oldImagePath);
//         });
//       }

//       const url = req.protocol + "://" + req.get("host");
//       user.imagePath = url + "/images/" + req.file.filename; //
//       console.log("New ImagePath: ", user.imagePath);
//       user.save();
//     });
//   }
// );

//User Registeration

router.post("/register", bodyParser.json(), async (req, res, next) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      throw "Email already in use. Please try another one.";
    }
    user = await User.findOne({ username: req.body.username });
    if (user) {
      throw "Username already in use. Please try another one.";
    }

    if (req.body.username.includes(" ")) {
      throw "Username cannot contain space(s). Please try again";
    }

    let hash = await bcrypt.hash(req.body.password, 10);

    console.log(hash);
    let new_user = new User({
      email: req.body.email,
      password: hash,
      name: req.body.name,
      username: req.body.username,
      dob: req.body.dob,
      imagePath: "",
      loginStreak: {
        onDate: null,
        nextDate: null,
        streakCount: 0,
      },
    });

    console.log("\n------- CREATING USER ------\n");
    new_user = await new_user.save();
    console.log(new_user);
    console.log("\n------- USER CREATED ------\n");
    return res.status(200).json({
      message: "User Created",
    });

    console.log("\n------- User Created ------\n");
  } catch (err) {
    console.log(err);
    return res.status(406).json({ message: err });
  }

  // User.findOne({ email: req.body.email })
  //   .then((user) => {
  //     if (user) {
  //       throw "Email already in use. Please try another one.";
  //     }
  //   })
  //   .then(() => {
  //     bcrypt.hash(req.body.password, 10).then((hash) => {
  //       console.log(hash);
  //       const user = new User({
  //         email: req.body.email,
  //         password: hash,
  //         name: req.body.name,
  //         username: req.body.username,
  //         dob: req.body.dob,
  //         imagePath: "",
  //         loginStreak: {
  //           onDate: null,
  //           nextDate: null,
  //           streakCount: 0,
  //         },
  //       });

  //       console.log("\n------- SAVING USER ------\n");
  //       console.log(user.username);
  //       console.log("\n------- SAVING USER ------\n");

  //       user
  //         .save()
  //         .then((result) => {
  //           return res.status(200).json({
  //             message: "User Created",
  //             result: result,
  //           });
  //         })
  //         .catch((err) => {
  //           res.status(500).json({
  //             error: err,
  //           });
  //         });
  //     });
  //   })
  //   .catch((err) => {
  //     return res.status(406).json({ message: err });
  //   });
});

//User Login and Token Generation

router.post("/login", bodyParser.json(), (req, res, next) => {
  let fetchedUser;
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        throw "Entered email does not exist";
      }
      fetchedUser = user;
      return bcrypt.compare(req.body.password, user.password);
    })
    .then((result) => {
      if (!result) {
        throw "Invalid email or password entered. Please try again";
      }

      // UPADTE USER LOGIN STREAK

      if (
        fetchedUser.loginStreak.streakCount === 0 ||
        fetchedUser.loginStreak.nextDate < Date.now()
      ) {
        fetchedUser.loginStreak.streakCount = 0;
        fetchedUser.loginStreak.onDate = Date.now();
        fetchedUser.loginStreak.nextDate = Date.now() + 24 * 60 * 60 * 1000;
        fetchedUser.loginStreak.streakCount =
          fetchedUser.loginStreak.streakCount + 1;
      } else {
        fetchedUser.loginStreak.onDate = Date.now();
        fetchedUser.loginStreak.nextDate = Date.now() + 24 * 60 * 60 * 1000;
        fetchedUser.loginStreak.streakCount =
          fetchedUser.loginStreak.streakCount + 1;
      }

      fetchedUser.save();

      const token = jwt.sign(
        { email: fetchedUser.email, userId: fetchedUser._id },
        process.env.JWT_KEY,
        { expiresIn: "1h" }
      );
      res.status(200).json({
        token: token,
        expiresIn: 3600,
        userID: fetchedUser._id,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(401).json({
        message: err,
      });
    });
});

router.get(
  "/update-profile/:id",
  checkAuth,
  bodyParser.json(),
  (req, res, next) => {
    User.findById(req.params.id)
      .then((fetchedUser) => {
        if (!fetchedUser) {
          throw "Unable to find the user.";
        }

        let learningProgress = 0;

        if (fetchedUser.qAnswers) {
          fetchedUser.qAnswers.forEach((ans) => {
            if (ans.exercise === "python-topic") {
              learningProgress = learningProgress + 7;
            } else {
              learningProgress = learningProgress + 10;
            }
          });
        }

        let user = {
          email: fetchedUser.email,
          joined: fetchedUser.joinedOn,
          name: fetchedUser.name,
          username: fetchedUser.username,
          dob: fetchedUser.dob,
          loginStreakCount: fetchedUser.loginStreak.streakCount,
          imagePath: fetchedUser.imagePath,
          bioData: fetchedUser.bioData,
          favorites: fetchedUser.favorites,
          recentActivities: fetchedUser.recentActivities,
          learningProgress: learningProgress,
        };

        console.log(`Profile data fetched for userID: ${req.params.id}`);
        return res.status(200).send(user);
      })
      .catch((err) => {
        return res.status(404).json({
          message: err,
        });
      });
  }
);

router.put(
  "/edit-profile/:id",
  checkAuth,
  bodyParser.json(),
  async (req, res, next) => {
    try {
      let fetchedUser = await User.findById(req.params.id);

      if (!fetchedUser) {
        return res
          .status(404)
          .send(`User with ID: ${req.params.id} not found.`);
      }

      console.log(req.body);

      fetchedUser.name = req.body.name;
      fetchedUser.bioData = req.body.bioData;
      fetchedUser.dob = req.body.dob;
      fetchedUser.email = req.body.email;

      fetchedUser.save();
      console.log(`Profile data updated for userID: ${req.params.id}`);

      return res.status(200).send(true);
    } catch (error) {
      console.log(error);
    }
  }
);

router.put("/edit-favorites/:id", (req, res, next) => {
  if (!req.body.courseID) {
    return;
  }

  User.findById(req.params.id).then((fetchedUser) => {
    if (!fetchedUser) {
      return res.status(404).send(`User with ID: ${req.params.id} not found.`);
    }
    let index = fetchedUser.favorites.indexOf(req.body.courseID);
    if (index !== -1) {
      fetchedUser.favorites.splice(index, 1);
    } else {
      fetchedUser.favorites.push(req.body.courseID);
    }

    console.log(fetchedUser.favorites, index);

    fetchedUser.save();
    console.log(`Favorites updated for userID: ${req.params.id}`);
    return res.status(200).json({
      message: `Favorites updated for userID: ${req.params.id}`,
    });
  });
});

router.get("/get-favorites/:id", bodyParser.json(), (req, res, next) => {
  User.findById(req.params.id).then((fetchedUser) => {
    if (!fetchedUser) {
      return res.status(404).send(`User with ID: ${req.params.id} not found.`);
    }
    console.log("Getting favorites... \n" + fetchedUser.favorites);
    return res.status(200).send(fetchedUser.favorites);
  });
});

router.put("/add-recent-activity/:id", bodyParser.json(), (req, res, next) => {
  User.findById(req.params.id).then((fetchedUser) => {
    if (!fetchedUser) {
      return res.status(404).send(`User with ID: ${req.params.id} not found.`);
    }
    console.log(fetchedUser.recentActivities);
    if (fetchedUser.recentActivities.length < 5) {
      fetchedUser.recentActivities.push(req.body.activity);
      console.log("Activity added", fetchedUser.recentActivities);
    } else {
      fetchedUser.recentActivities.shift();
      fetchedUser.recentActivities.push(req.body.activity);
      console.log("Activity added", fetchedUser.recentActivities);
    }
    fetchedUser.save();
    return res.status(200).json({
      message: `Recent activities updated for userID: ${req.params.id}`,
    });
  });
});

router.get(
  "/get-recent-activities/:id",
  bodyParser.json(),
  (req, res, next) => {
    User.findById(req.params.id).then((fetchedUser) => {
      if (!fetchedUser) {
        return res
          .status(404)
          .send(`User with ID: ${req.params.id} not found.`);
      }
      const activities = fetchedUser.activities;
      console.log("Sending activities: ", activities);
      return res.status(200).send(activities);
    });
  }
);

module.exports = router;
