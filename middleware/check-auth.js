const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    console.log("Checking for authentication...");
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { email: decodedToken.email, userID: decodedToken.userID };
    console.log("Authenticated!");
    next();
  } catch (err) {
    res.status(401).json({ message: "Authorization failed!" });
  }
};
