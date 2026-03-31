const mongoose = require("mongoose");
const UserCar = require("../models/UserCars");

const users = {};

// Helper to safely send messages without crashing on ECONNRESET
const safeSend = async (bot, chatId, text, options = {}) => {
  try {
    return await bot.sendMessage(chatId, text, options);
  } catch (e) {
    console.error(`[Message Error] Failed to send to ${chatId}: ${e.message}`);
  }
};

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
    rentDuration: "⏳ How long do you want to rent it for?",
    rentType: "Select rent type",
    withDriver: "With Driver",
    withoutDriver: "Without Driver",
    both: "Both",
    plate: "Enter plate number\nExample: 3AA12345",
    photos: "📷 Send car photos one by one.",
    photoDonePrompt: "✅ Photo received! Send more, or press /done to finish registration.",
    done: "🚗 Car registered successfully",
    nodata: "❌ You have no registered cars",
    photoSaved: "✅ Photo saved",
    invalidPlate: "❌ Invalid plate format\nExample: 3AA12345",
    invalidName: "❌ Name must be at least 3 characters",
    invalidPhone: "❌ Invalid Ethiopian phone",
    invalidModel: "❌ Invalid car model",
    invalidYear: "❌ Invalid year",
    error: "⚠️ An error occurred. Please try /start again.",
    durations: { m1: "1 Month", m3: "3 Months", m6: "6 Months", y1: "Above a year" }
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
    rentDuration: "⏳ መኪናውን ለምን ያህል ጊዜ ማከራየት ይፈልጋሉ?",
    rentType: "የኪራይ አይነት ይምረጡ",
    withDriver: "ከሹፌር ጋር",
    withoutDriver: "ያለ ሹፌር",
    both: "ሁለቱም",
    plate: "የሰሌዳ ቁጥር ያስገቡ\nምሳሌ 3AA12345",
    photos: "📷 የመኪና ፎቶዎችን አንድ በአንድ ይላኩ።",
    photoDonePrompt: "✅ ፎቶው ደርሷል! ተጨማሪ ይላኩ፣ ወይም ምዝገባውን ለመጨረስ /done ይጫኑ።",
    done: "🚗 መኪናው ተመዝግቧል",
    nodata: "❌ ምንም መኪና የለም",
    photoSaved: "✅ ፎቶ ተቀምጧል",
    invalidPlate: "❌ የሰሌዳ ቁጥር ትክክል አይደለም",
    invalidName: "❌ ስም 3 ፊደል ያህል መሆን አለበት",
    invalidPhone: "❌ የኢትዮጵያ ስልክ ቁጥር አይታወቅም",
    invalidModel: "❌ የመኪና ሞዴል የተሳሳተ ነው",
    invalidYear: "❌ የመኪና ዓመት የተሳሳተ ነው",
    error: "⚠️ ስህተት ተፈጥሯል:: እባክዎ በ /start እንደገና ይጀምሩ::",
    durations: { m1: "ለ1 ወር", m3: "ለ3 ወር", m6: "ለ6 ወር", y1: "ከአንድ ዓመት በላይ" }
  }
};

/* ------------------- VALIDATION ------------------- */
function validateFullName(name) { return typeof name === "string" && name.trim().length >= 3; }
function validatePhone(phone) { return /^(\+251|0)[79]\d{8}$/.test(phone); }
function validateCarModel(model) { return typeof model === "string" && model.trim().length >= 2; }
function validateCarYear(year) {
  const y = parseInt(year);
  return !isNaN(y) && y >= 1950 && y <= new Date().getFullYear();
}
function validatePlate(plate) { return /^[0-5][A-Z]{3}[0-9]{5}$/.test(plate); }

/* ------------------- BOT ------------------- */
module.exports = (bot) => {

  bot.on('polling_error', (err) => console.error(`[Polling Error] ${err.code}`));

  bot.onText(/\/start/, (msg) => {
    safeSend(bot, msg.chat.id, "Choose Language / ቋንቋ ይምረጡ", {
      reply_markup: {
        inline_keyboard: [[
          { text: "English 🇬🇧", callback_data: "lang_en" },
          { text: "አማርኛ 🇪🇹", callback_data: "lang_am" }
        ]]
      }
    });
  });

  const showMenu = (chatId, lang) => {
    safeSend(bot, chatId, TEXT[lang].menu, {
      reply_markup: {
        inline_keyboard: [[
          { text: TEXT[lang].register, callback_data: "register" },
          { text: TEXT[lang].mycars, callback_data: "mycars" }
        ]]
      }
    });
  };

  bot.on("callback_query", async (query) => {
    try {
      const chatId = query.message.chat.id;
      const data = query.data;
      if (data.startsWith("lang_")) {
        const lang = data.split("_")[1];
        users[chatId] = { language: lang, photos: [], awaiting: null };
        await safeSend(bot, chatId, TEXT[lang].welcome);
        return showMenu(chatId, lang);
      }
      const user = users[chatId];
      if (!user) return;
      const lang = user.language;

      if (data === "register") {
        users[chatId] = { ...user, photos: [], awaiting: "fullName" };
        return safeSend(bot, chatId, TEXT[lang].name);
      }

      if (data === "mycars") {
        const cars = await UserCar.find({ telegramId: chatId });
        if (!cars.length) return safeSend(bot, chatId, TEXT[lang].nodata);
        for (const [i, car] of cars.entries()) {
          const carDetails = `🚗 Car #${i + 1}\nPlate: ${car.plateNumber}\nModel: ${car.carModel}\nYear: ${car.carYear}`;
          await safeSend(bot, chatId, carDetails, {
            reply_markup: { inline_keyboard: [[{ text: "✏ Edit", callback_data: `edit_${car._id}` }, { text: "🗑 Delete", callback_data: `delete_${car._id}` }]] }
          });
        }
        return showMenu(chatId, lang);
      }

      if (data.startsWith("delete_")) {
        await UserCar.findByIdAndDelete(data.split("_")[1]);
        await safeSend(bot, chatId, "✅ Deleted");
        return showMenu(chatId, lang);
      }

      if (data.startsWith("dur_")) {
        user.maxRentDays = TEXT[lang].durations[data.replace("dur_", "")];
        user.awaiting = "rentType";
        return safeSend(bot, chatId, TEXT[lang].rentType, {
          reply_markup: {
            inline_keyboard: [
              [{ text: TEXT[lang].withDriver, callback_data: "rent_driver" }, { text: TEXT[lang].withoutDriver, callback_data: "rent_no_driver" }],
              [{ text: TEXT[lang].both, callback_data: "rent_both" }]
            ]
          }
        });
      }

      if (data.startsWith("edit_")) {
        const carId = data.split("_")[1];
        const car = await UserCar.findById(carId);
        if (!car) return safeSend(bot, chatId, TEXT[lang].nodata);
        user.editingCarId = carId;
        const fields = ["fullName", "phone", "carModel", "carYear", "maxRentDays", "rentType", "plateNumber"];
        const kbd = fields.map(f => [{ text: `${f}: ${car[f]}`, callback_data: `editfield_${f}` }]);
        return safeSend(bot, chatId, lang === "en" ? "Select field:" : "መስክ ይምረጡ:", { reply_markup: { inline_keyboard: kbd } });
      }

      if (data.startsWith("editfield_")) {
        const field = data.split("_")[1];
        user.editField = field;
        if (field === "rentType") {
          return safeSend(bot, chatId, TEXT[lang].rentType, {
            reply_markup: {
              inline_keyboard: [
                [{ text: TEXT[lang].withDriver, callback_data: "set_rent_driver" }, { text: TEXT[lang].withoutDriver, callback_data: "set_rent_no_driver" }],
                [{ text: TEXT[lang].both, callback_data: "set_rent_both" }]
              ]
            }
          });
        }
        if (field === "maxRentDays") {
          return safeSend(bot, chatId, TEXT[lang].rentDuration, {
            reply_markup: {
              inline_keyboard: [
                [{ text: TEXT[lang].durations.m1, callback_data: "setdur_m1" }, { text: TEXT[lang].durations.m3, callback_data: "setdur_m3" }],
                [{ text: TEXT[lang].durations.m6, callback_data: "setdur_m6" }, { text: TEXT[lang].durations.y1, callback_data: "setdur_y1" }]
              ]
            }
          });
        }
        user.awaiting = "edit_value";
        return safeSend(bot, chatId, lang === "en" ? "Enter new value:" : "አዲስ ያስገቡ:");
      }

      if (data.startsWith("setdur_")) {
        await UserCar.findByIdAndUpdate(user.editingCarId, { maxRentDays: TEXT[lang].durations[data.replace("setdur_", "")] });
        await safeSend(bot, chatId, "✅ Updated");
        return showMenu(chatId, lang);
      }

      if (data.startsWith("set_rent_")) {
        await UserCar.findByIdAndUpdate(user.editingCarId, { rentType: data.replace("set_rent_", "") });
        await safeSend(bot, chatId, "✅ Updated");
        return showMenu(chatId, lang);
      }

      if (["rent_driver", "rent_no_driver", "rent_both"].includes(data)) {
        user.rentType = data.replace("rent_", "");
        user.awaiting = "plateNumber";
        return safeSend(bot, chatId, TEXT[lang].plate);
      }
    } catch (e) { console.error(e); }
  });

  bot.on("message", async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;
      const user = users[chatId];
      if (!user || !user.awaiting || !text || text.startsWith('/')) return;
      const lang = user.language;

      const validate = (field, val) => {
        if (field === "fullName") return validateFullName(val) ? null : TEXT[lang].invalidName;
        if (field === "phone") return validatePhone(val) ? null : TEXT[lang].invalidPhone;
        if (field === "carModel") return validateCarModel(val) ? null : TEXT[lang].invalidModel;
        if (field === "carYear") return validateCarYear(val) ? null : TEXT[lang].invalidYear;
        if (field === "plateNumber") return validatePlate(val.toUpperCase()) ? null : TEXT[lang].invalidPlate;
        return null;
      };

      if (user.awaiting === "edit_value") {
        const error = validate(user.editField, text);
        if (error) return safeSend(bot, chatId, error);
        const updateData = { [user.editField]: (user.editField === "carYear") ? parseInt(text) : text };
        await UserCar.findByIdAndUpdate(user.editingCarId, updateData);
        await safeSend(bot, chatId, "✅ Updated");
        user.awaiting = null;
        return showMenu(chatId, lang);
      }

      switch (user.awaiting) {
        case "fullName":
          if (!validateFullName(text)) return safeSend(bot, chatId, TEXT[lang].invalidName);
          user.fullName = text; user.awaiting = "phone";
          return safeSend(bot, chatId, TEXT[lang].phone);
        case "phone":
          if (!validatePhone(text)) return safeSend(bot, chatId, TEXT[lang].invalidPhone);
          user.phone = text; user.awaiting = "carModel";
          return safeSend(bot, chatId, TEXT[lang].model);
        case "carModel":
          if (!validateCarModel(text)) return safeSend(bot, chatId, TEXT[lang].invalidModel);
          user.carModel = text; user.awaiting = "carYear";
          return safeSend(bot, chatId, TEXT[lang].year);
        case "carYear":
          if (!validateCarYear(text)) return safeSend(bot, chatId, TEXT[lang].invalidYear);
          user.carYear = parseInt(text); user.awaiting = "rentDuration";
          return safeSend(bot, chatId, TEXT[lang].rentDuration, {
            reply_markup: { inline_keyboard: [[{ text: TEXT[lang].durations.m1, callback_data: "dur_m1" }, { text: TEXT[lang].durations.m3, callback_data: "dur_m3" }], [{ text: TEXT[lang].durations.m6, callback_data: "dur_m6" }, { text: TEXT[lang].durations.y1, callback_data: "dur_y1" }]] }
          });
        case "plateNumber":
          const plate = text.toUpperCase();
          if (!validatePlate(plate)) return safeSend(bot, chatId, TEXT[lang].invalidPlate);
          if (await UserCar.findOne({ plateNumber: plate })) return safeSend(bot, chatId, "❌ Already exists");
          user.plateNumber = plate; user.awaiting = "photos";
          return safeSend(bot, chatId, TEXT[lang].photos);
      }
    } catch (e) { console.error(e); }
  });

  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || user.awaiting !== "photos") return;
    try {
      const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
      user.photos.push(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`);
      safeSend(bot, chatId, TEXT[user.language].photoDonePrompt);
    } catch (e) { safeSend(bot, chatId, "❌ Photo upload failed."); }
  });

  bot.onText(/\/done/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];
    if (!user || user.awaiting !== "photos") return;
    try {
      await new UserCar({ ...user, telegramId: chatId, carPhotos: user.photos, minRentDays: 1 }).save();
      await safeSend(bot, chatId, TEXT[user.language].done);
      users[chatId] = { language: user.language, photos: [], awaiting: null };
      showMenu(chatId, user.language);
    } catch (e) { safeSend(bot, chatId, TEXT[user.language].error); }
  });
};