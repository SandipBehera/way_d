const User = require("../models/user");
const { check, validationResult } = require("express-validator");
var jwt = require("jsonwebtoken");
var expressJwt = require("express-jwt");
const formidable = require("formidable");
const { Greengrass } = require("aws-sdk");
const { postPinfromUser } = require("./pin_sp");
exports.signup = (data, req, res) => {
  const { username, email, phone_number, location ,pincode,street,area} = req.body;
  if (!username) {
    return res.status(400).json({
      error: "username is required"
    });
  }
  if (!email) {
    return res.status(400).json({
      error: "email is required"
    });
  }
  var regexEmail = /\S+@\S+\.\S+/;
  if (email) {
    if (!regexEmail.test(email)) {
      return res.status(400).json({
        error: "email is invalid"
      });
    }
  }
  if (!phone_number) {
    return res.status(400).json({
      error: "phone_number is required"
    });
  }
  // if (!location) {
  //   return res.status(400).json({
  //     error: "location is required"
  //   });
  // }
  if (!pincode || !street || !area ) {
    return res.status(400).json({
      error: "Pincode,street,area is required",
    });
  }
  

  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  const errors = validationResult(req.body);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg
    });
  }
  User.findOne({ phone_number: phone_number }).then(user => {
    if (user) {
      return res.status(400).json({
        err: "User already exist"
      });
    } else {
      const user = new User(req.body);
      user.photo = data.Location;
      user.address.pincode = req.body.pincode
      user.address.street = req.body.street
      user.address.area = req.body.area
      user.save((err, user) => {
        if (err) {
          console.log(err);
          return res.status(400).json({
            err: "NOT able to save user in DB"
          });
        }
        postPinfromUser(req,res);
        res.json({
          role: user.role,
          username: user.username,
          email: user.email,
          location: user.location,
          id: user._id,
          pincode: user.address.pincode,
          photo: data ? data.Location : ""
        });
      });
    }
  });
};

exports.signin = (req, res) => {
  const errors = validationResult(req);
  const { phone_number, password } = req.body;

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg
    });
  }

  User.findOne({ phone_number }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "USER does not exists"
      });
    }

    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: "phone number and password do not match"
      });
    }

    //create token
    const token = jwt.sign({ _id: user._id }, process.env.SECRET);
    //put token in cookie
    res.cookie("token", token, { expire: new Date() + 9999 });

    //send response to front end
    const {
      _id,
      username,
      phone_number,
      location,
      email,
      role,
      vendor_category
    } = user;
    return res.status(200).json({
      token,
      user: {
        _id,
        username,
        phone_number,
        location,
        email,
        role,
        vendor_category
      }
    });
  });
};

exports.signout = (req, res) => {
  res.clearCookie("token");
  res.json({
    message: "User signedout"
  });
};
exports.getAllUsers = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 8;
  sortBy = req.query.limit ? parseInt(req.query.limit) : "_id";
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  User.find().exec((err, users) => {
    if (err || !users) {
      return res.status(400).json({
        error: "no users found"
      });
    }

    const results = {};
    if (endIndex < users.length) {
      results.next = {
        page: page + 1,
        limit: limit
      };
    }
    results.total = {
      total_records: users.length
    };
    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit
      };
    }

    results.results = users.slice(startIndex, endIndex);
    if (!req.query.limit) {
      res.json(users);
    } else {
      res.json(results);
    }
  });
};

//protected routes
exports.isSignedIn = expressJwt({
  secret: process.env.SECRET,
  algorithms: ["HS256"],
  userProperty: "authentication"
});
exports.isthere = (req, res, next) => {
  let checker = req.headers["authorization"];
  const gg = jwt.verify(req.cookies.token, process.env.SECRET);
  User.findById(gg._id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "user not found in database"
      });
    }
    req.profile = user;
    next();
  });
  if (!checker) {
    return res.status(403).json({
      error: "ACCESS DENIED"
    });
  }
  next();
};
exports.isAuthenticated = (req, res, next) => {
  let auth = req.headers["authorization"];

  const token = auth.substring(7, auth.length);
  const requestAuth = jwt.verify(token, process.env.SECRET);
  User.findById(requestAuth._id).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "user not found in database"
      });
    }
    req.user = user;

    let checker = requestAuth._id && auth && requestAuth._id == user._id;
    if (user.role !== 1) {
      if (!checker) {
        return res.status(403).json({
          error: "ACCESS DENIED"
        });
      }
    }

    next();
  });
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role === 0) {
    return res.status(403).json({
      error: "access denied,You are not an admin"
    });
  }

  next();
};
