const mongoose = require("mongoose");
const UserCar = require("../models/UserCars");

const users = {};

const TEXT = {
  en: {
    welcome: "🚗 Welcome to Car Registry Bot",
    menu: "Choose an option",
    register: "🚗 Register Car",
    mycars: "📋 My Cars",
    edit: "✏ Edit Car",
    delete: "🗑 Delete Car",
    name: "Enter your full name",
    phone: "📱 Enter phone number",
    model: "🚘 Enter car model",
    year: "📅 Enter car year",
    minRent: "Enter minimum renting days",
    maxRent: "Enter maximum renting days",
    rentType: "Select rent type",
    plate: "Enter plate number\nExample: 3AA12345",
    photos: "📷 Send car photos then press /done",
    done: "🚗 Car registered successfully",
    nodata: "❌ You have no registered cars",
    photoSaved: "✅ Photo saved",
    invalidPlate: "❌ Invalid plate format\nExample: 3AA12345",
    invalidName: "❌ Name must be at least 3 characters",
    invalidPhone: "❌ Invalid Ethiopian phone",
    invalidModel: "❌ Invalid car model",
    invalidYear: "❌ Invalid year",
    invalidDays: "❌ Invalid days",
    maxDaysError: "❌ Must be greater than minimum"
  },
  am: {
    welcome: "🚗 ወደ የመኪና መመዝገቢያ ቦት እንኳን ደህና መጡ",
    menu: "አማራጭ ይምረጡ",
    register: "🚗 መኪና መመዝገብ",
    mycars: "📋 የኔ መኪናዎች",
    edit: "✏ መረጃ ማስተካከል",
    delete: "🗑 መኪና ማጥፋት",
    name: "ሙሉ ስም ያስገቡ",
    phone: "📱 ስልክ ቁጥር ያስገቡ",
    model: "🚘 የመኪና ሞዴል ያስገቡ",
    year: "📅 የመኪና ዓመት ያስገቡ",
    minRent: "አነስተኛ የኪራይ ቀን",
    maxRent: "ከፍተኛ የኪራይ ቀን",
    rentType: "የኪራይ አይነት ይምረጡ",
    plate: "የሰሌዳ ቁጥር ያስገቡ\nምሳሌ 3AA12345",
    photos: "📷 የመኪና ፎቶ ይላኩ ከዚያ /done ይጫኑ",
    done: "🚗 መኪናው ተመዝግቧል",
    nodata: "❌ ምንም መኪና የለም",
    photoSaved: "✅ ፎቶ ተቀምጧል",
    invalidPlate: "❌ የሰሌዳ ቁጥር ትክክል አይደለም",
    invalidName: "❌ ስም 3 ፊደል ያህል መሆን አለበት",
    invalidPhone: "❌ የኢትዮጵያ ስልክ ቁጥር አይታወቅም",
    invalidModel: "❌ የመኪና ሞዴል የተሳሳተ ነው",
    invalidYear: "❌ የመኪና ዓመት የተሳሳተ ነው",
    invalidDays: "❌ ቀናት የተሳሳተ ናቸው",
    maxDaysError: "❌ ከአነስተኛ ቀን በላይ መሆን አለበት"
  }
};

/* ------------------- VALIDATION ------------------- */
function validateFullName(name) {
  return typeof name === "string" && name.trim().length >= 3;
}
function validatePhone(phone) {
  return /^(\+251|0)[79]\d{8}$/.test(phone);
}
function validateCarModel(model) {
  return typeof model === "string" && model.trim().length >= 2;
}
function validateCarYear(year) {
  const y = parseInt(year);
  const currentYear = new Date().getFullYear();
  return !isNaN(y) && y >= 1950 && y <= currentYear;
}
function validatePlate(plate) {
  return /^[0-5][A-Z]{2}[0-9]{5}$/.test(plate);
}

/* ------------------- BOT ------------------- */
module.exports = (bot) => {

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Choose Language / ቋንቋ ይምረጡ", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "English 🇬🇧", callback_data: "lang_en" },
            { text: "አማርኛ 🇪🇹", callback_data: "lang_am" }
          ]
        ]
      }
    });
  });

  const showMenu = (chatId, lang) => {
    bot.sendMessage(chatId, TEXT[lang].menu, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: TEXT[lang].register, callback_data: "register" },
            { text: TEXT[lang].mycars, callback_data: "mycars" }
          ]
        ]
      }
    });
  };

  /* ---------------- CALLBACK QUERY ---------------- */
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // LANGUAGE SELECTION
    if (data.startsWith("lang_")) {
      const lang = data.split("_")[1];
      users[chatId] = { language: lang, photos: [], awaiting: null };
      bot.sendMessage(chatId, TEXT[lang].welcome);
      return showMenu(chatId, lang);
    }

    const user = users[chatId];
    if (!user) return;
    const lang = user.language;

    // REGISTER NEW CAR
    if (data === "register") {
      users[chatId] = { language: lang, photos: [], awaiting: "fullName" };
      return bot.sendMessage(chatId, TEXT[lang].name);
    }

    // SHOW MY CARS
    if (data === "mycars") {
      const cars = await UserCar.find({ telegramId: chatId });
      if (!cars.length) return bot.sendMessage(chatId, TEXT[lang].nodata);

      cars.forEach((car, i) => {
        const msg = `🚗 Car #${i + 1}\nPlate: ${car.plateNumber}\nModel: ${car.carModel}\nYear: ${car.carYear}`;
        bot.sendMessage(chatId, msg, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✏ Edit", callback_data: `edit_${car._id}` },
                { text: "🗑 Delete", callback_data: `delete_${car._id}` }
              ]
            ]
          }
        });
      });
      return showMenu(chatId, lang);
    }

    // DELETE CAR
    if (data.startsWith("delete_")) {
      const carId = data.split("_")[1];
      if (!mongoose.Types.ObjectId.isValid(carId)) return bot.sendMessage(chatId, TEXT[lang].nodata);
      await UserCar.findByIdAndDelete(carId);
      bot.sendMessage(chatId, "✅ Car deleted successfully");
      return showMenu(chatId, lang);
    }

    // ---------------- EDIT CAR ----------------
    if (data.startsWith("edit_")) {
      const carId = data.split("_")[1];
      if (!mongoose.Types.ObjectId.isValid(carId)) return bot.sendMessage(chatId, "❌ Invalid car selected");
      const car = await UserCar.findById(carId);
      if (!car) return bot.sendMessage(chatId, TEXT[lang].nodata);

      users[chatId].editingCarId = carId;

      const fields = [
        "fullName", "phone", "carModel", "carYear",
        "minRentDays", "maxRentDays", "rentType", "plateNumber"
      ];

      const inlineKeyboard = fields.map(f => [ { text: `${f} : ${car[f]}`, callback_data: `editfield_${f}` } ]);

      return bot.sendMessage(chatId, lang === "en"
        ? "Select the field you want to edit:"
        : "ይምረጡ ማስተካከል የሚፈልጉትን መስክ:", {
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    }

    // ---------------- EDIT FIELD ----------------
    if (data.startsWith("editfield_")) {
      const field = data.split("_")[1];
      users[chatId].editField = field;

      if (field === "rentType") {
        users[chatId].awaiting = null;
        return bot.sendMessage(chatId, TEXT[lang].rentType, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "With Driver", callback_data: `set_rent_driver` },
                { text: "Without Driver", callback_data: `set_rent_no_driver` }
              ],
              [{ text: "Both", callback_data: `set_rent_both` }]
            ]
          }
        });
      }

      users[chatId].awaiting = "edit_value";
      const car = await UserCar.findById(users[chatId].editingCarId);
      return bot.sendMessage(chatId, lang === "en"
        ? `Current value of ${field}: ${car[field]}\nEnter new value:`
        : `${field} ያሁን ዋጋ: ${car[field]}\nአዲስ ዋጋ ያስገቡ:`);
    }

    // ---------------- SET RENT TYPE DURING EDIT ----------------
    if (data.startsWith("set_rent_")) {
      const carId = users[chatId].editingCarId;
      if (!carId || !mongoose.Types.ObjectId.isValid(carId)) return bot.sendMessage(chatId, TEXT[lang].nodata);
      const car = await UserCar.findById(carId);
      car.rentType = data.replace("set_rent_", "");
      await car.save();

      bot.sendMessage(chatId, lang === "en"
        ? "✅ Rent type updated successfully"
        : "✅ የኪራይ አይነት ተሻሽሏል");

      delete users[chatId].editingCarId;
      delete users[chatId].editField;
      return showMenu(chatId, lang);
    }

    // ---------------- SET RENT TYPE DURING REGISTRATION ----------------
    if (["rent_driver", "rent_no_driver", "rent_both"].includes(data)) {
      user.rentType = data.replace("rent_", "");
      user.awaiting = "plateNumber";
      return bot.sendMessage(chatId, TEXT[lang].plate);
    }
  });

  /* ---------------- MESSAGE HANDLER ---------------- */
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    const user = users[chatId];
    if (!user || !user.awaiting) return;
    const lang = user.language;

    switch (user.awaiting) {
      case "fullName":
        if (!validateFullName(text)) return bot.sendMessage(chatId, TEXT[lang].invalidName);
        user.fullName = text;
        user.awaiting = "phone";
        return bot.sendMessage(chatId, TEXT[lang].phone);

      case "phone":
        if (!validatePhone(text)) return bot.sendMessage(chatId, TEXT[lang].invalidPhone);
        user.phone = text;
        user.awaiting = "carModel";
        return bot.sendMessage(chatId, TEXT[lang].model);

      case "carModel":
        if (!validateCarModel(text)) return bot.sendMessage(chatId, TEXT[lang].invalidModel);
        user.carModel = text;
        user.awaiting = "carYear";
        return bot.sendMessage(chatId, TEXT[lang].year);

      case "carYear":
        if (!validateCarYear(text)) return bot.sendMessage(chatId, TEXT[lang].invalidYear);
        user.carYear = parseInt(text);
        user.awaiting = "minRentDays";
        return bot.sendMessage(chatId, TEXT[lang].minRent);

      case "minRentDays":
        const min = parseInt(text);
        if (isNaN(min) || min < 1) return bot.sendMessage(chatId, TEXT[lang].invalidDays);
        user.minRentDays = min;
        user.awaiting = "maxRentDays";
        return bot.sendMessage(chatId, TEXT[lang].maxRent);

      case "maxRentDays":
        const max = parseInt(text);
        if (isNaN(max) || max < user.minRentDays) return bot.sendMessage(chatId, TEXT[lang].maxDaysError);
        user.maxRentDays = max;
        user.awaiting = "rentType";
        return bot.sendMessage(chatId, TEXT[lang].rentType, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "With Driver", callback_data: "rent_driver" },
                { text: "Without Driver", callback_data: "rent_no_driver" }
              ],
              [{ text: "Both", callback_data: "rent_both" }]
            ]
          }
        });

      case "plateNumber":
        const plate = text.toUpperCase();
        if (!validatePlate(plate)) return bot.sendMessage(chatId, TEXT[lang].invalidPlate);
        const existing = await UserCar.findOne({ plateNumber: plate });
        if (existing) return bot.sendMessage(chatId, "❌ Plate already registered");
        user.plateNumber = plate;
        user.awaiting = "photos";
        return bot.sendMessage(chatId, TEXT[lang].photos);

      case "edit_value":
        const car = await UserCar.findById(user.editingCarId);
        if (!car) return bot.sendMessage(chatId, TEXT[lang].nodata);

        let value = text;
        const field = user.editField;

        switch (field) {
          case "fullName":
            if (!validateFullName(value)) return bot.sendMessage(chatId, TEXT[lang].invalidName);
            break;
          case "phone":
            if (!validatePhone(value)) return bot.sendMessage(chatId, TEXT[lang].invalidPhone);
            break;
          case "carModel":
            if (!validateCarModel(value)) return bot.sendMessage(chatId, TEXT[lang].invalidModel);
            break;
          case "carYear":
            value = parseInt(value);
            if (!validateCarYear(value)) return bot.sendMessage(chatId, TEXT[lang].invalidYear);
            break;
          case "minRentDays":
            value = parseInt(value);
            if (isNaN(value) || value < 1) return bot.sendMessage(chatId, TEXT[lang].invalidDays);
            if (car.maxRentDays && value > car.maxRentDays) return bot.sendMessage(chatId, TEXT[lang].maxDaysError);
            break;
          case "maxRentDays":
            value = parseInt(value);
            if (isNaN(value) || value < car.minRentDays) return bot.sendMessage(chatId, TEXT[lang].maxDaysError);
            break;
          case "rentType":
            if (!["driver", "no_driver", "both"].includes(value)) return bot.sendMessage(chatId, lang === "en" ? "Invalid rent type" : "የኪራይ አይነት የተሳሳተ ነው");
            break;
          case "plateNumber":
            value = value.toUpperCase();
            if (!validatePlate(value)) return bot.sendMessage(chatId, TEXT[lang].invalidPlate);
            break;
        }

        car[field] = value;
        await car.save();
        bot.sendMessage(chatId, lang === "en" ? `✅ ${field} updated successfully` : `✅ ${field} ተሻሽሏል`);

        delete user.editField;
        delete user.editingCarId;
        user.awaiting = null;
        return showMenu(chatId, lang);
    }
  });

   // PHOTO HANDLER
  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || user.awaiting !== "photos") return;
    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    user.photos.push(url);
    bot.sendMessage(chatId, TEXT[user.language].photoSaved);
  });

  bot.onText(/\/done/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || user.awaiting !== "photos") return bot.sendMessage(chatId, "❌ No car registration in progress");

    const car = new UserCar({
      telegramId: chatId,
      fullName: user.fullName,
      phone: user.phone,
      carModel: user.carModel,
      carYear: user.carYear,
      minRentDays: user.minRentDays,
      maxRentDays: user.maxRentDays,
      rentType: user.rentType,
      plateNumber: user.plateNumber,
      carPhotos: user.photos
    });

    await car.save();
    bot.sendMessage(chatId, TEXT[user.language].done);

    users[chatId] = { language: user.language, photos: [], awaiting: null };
    showMenu(chatId, user.language);
  });
};
