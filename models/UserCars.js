const mongoose = require("mongoose");

const UserCarSchema = new mongoose.Schema({

  telegramId: {
    type: String,
    required: true
  },
    language: {
    type: String,
    enum: ["en", "am"],
    default: "en"
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
      type: String,
      required: true
    }
  ],

  minRentDays: {
    type: Number,
    default: 1
  },
  maxRentDays: {
    type: Number,
    default: 730
  },

  rentType: {
    type: String,
    required: true,
  },
  

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("UserCar", UserCarSchema);