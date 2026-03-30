const mongoose = require("mongoose");

const UserCarSchema = new mongoose.Schema({

  telegramId: {
    type: String,
    required: true
  },

  fullName: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  plateNumber: {
    type: String,
    required: true,
    uppercase: true
  },

  carModel: {
    type: String,
    required: true
  },

  carYear: {
    type: Number,
    required: true
  },

  carPhotos: [
    {
      type: String
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("UserCar", UserCarSchema);