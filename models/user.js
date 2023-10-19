const mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");

const userAnsSchema = mongoose.Schema({
  exercise: {
    type: String,
    required: false,
  },
  qID: {
    type: String,
    required: false,
  },
  qName: {
    type: String,
    required: false,
  },
  userAnswer: {
    type: String,
    required: false,
  },
  gptAnswer: {
    type: String,
    required: false,
  },
  ansCorrect: {
    type: Boolean,
    required: false,
  },
  completedOnce: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    minLength: 7,
    validate: {
      validator: (e) => {
        const emailRegex = /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
        return emailRegex.test(e);
      },
      message: "Email entered is not valid.",
    },
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    minLength: 2,
  },
  username: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  imagePath: {
    type: String,
    default: null,
  },
  joinedOn: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
  loginStreak: {
    nextDate: Date,
    onDate: Date,
    streakCount: Number,
  },
  bioData: {
    type: String,
    maxLength: 1000,
  },
  coursesCompleted: {
    type: [String],
    default: [],
  },
  certificates: {
    type: [
      {
        title: {
          type: String,
          required: true,
        },
      },
    ],
  },
  favorites: {
    type: [Number],
    default: [],
  },
  recentActivities: {
    type: [String],
    default: [],
  },
  qAnswers: [userAnsSchema],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
