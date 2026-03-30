  const UserCar = require("../models/UserCars");

  const users = {};

  /* -------------------
  VALIDATION
  ------------------- */

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
    return /^[0-5][A-Z]{3}[0-9]{5}$/.test(plate);
  }

  /* -------------------
  BOT
  ------------------- */

  module.exports = (bot) => {

  /* START */

  bot.onText(/\/start/, (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
  `🚗 Welcome to Car Registry Bot

  Commands:
  /register - Register new car
  /mycars - View your cars
  /editcar PLATE
  /deletecar PLATE

  Plate format example:
  3AA12345`
  );

  });


  /* REGISTER */

  bot.onText(/\/register/, (msg) => {

  const chatId = msg.chat.id;

  users[chatId] = {
  photos:[],
  awaitingPhotos:false
  };

  bot.sendMessage(chatId,"Enter your full name:");

  });


  /* VIEW CARS */

  bot.onText(/\/mycars/, async (msg)=>{

  const chatId = msg.chat.id;

  const cars = await UserCar.find({telegramId:chatId});

  if(cars.length===0){
  return bot.sendMessage(chatId,"❌ You have no registered cars");
  }

  let message="🚗 Your Cars\n\n";

  cars.forEach((car,index)=>{

  message += `${index+1}.
  Plate: ${car.plateNumber}
  Model: ${car.carModel}
  Year: ${car.carYear}

  `;

  });

  bot.sendMessage(chatId,message);

  });


  /* DELETE */

  bot.onText(/\/deletecar (.+)/, async (msg,match)=>{

  const chatId = msg.chat.id;

  const plate = match[1].toUpperCase();

  const car = await UserCar.findOneAndDelete({
  telegramId:chatId,
  plateNumber:plate
  });

  if(!car) return bot.sendMessage(chatId,"❌ Car not found");

  bot.sendMessage(chatId,"🗑 Car deleted successfully");

  });


  /* EDIT */

  bot.onText(/\/editcar (.+)/, async (msg,match)=>{

  const chatId = msg.chat.id;
  const plate = match[1].toUpperCase();

  const car = await UserCar.findOne({
  telegramId:chatId,
  plateNumber:plate
  });

  if(!car){
  return bot.sendMessage(chatId,"❌ Car not found");
  }

  users[chatId] = {
  editCarId:car._id
  };

  bot.sendMessage(chatId,
  `Send updated info in this format:

  Name, Phone, Model, Year

  Example:
  Natnael, 0912345678, Corolla, 2018`
  );

  });


  /* MESSAGE HANDLER */

  bot.on("message", async (msg)=>{

  const chatId = msg.chat.id;
  const text = msg.text;

  if(!users[chatId]) return;

  const user = users[chatId];


  /* EDIT FLOW */

  if(user.editCarId && text && !text.startsWith("/")){

  const parts = text.split(",");

  if(parts.length!==4){
  return bot.sendMessage(chatId,"❌ Invalid format");
  }

  const [name,phone,model,year] = parts.map(v=>v.trim());

  if(!validateFullName(name))
  return bot.sendMessage(chatId,"❌ Invalid name");

  if(!validatePhone(phone))
  return bot.sendMessage(chatId,"❌ Invalid phone");

  if(!validateCarModel(model))
  return bot.sendMessage(chatId,"❌ Invalid model");

  if(!validateCarYear(year))
  return bot.sendMessage(chatId,"❌ Invalid year");

  await UserCar.findByIdAndUpdate(user.editCarId,{
  fullName:name,
  phone:phone,
  carModel:model,
  carYear:year
  });

  bot.sendMessage(chatId,"✅ Car updated");

  delete users[chatId];

  return;

  }


  /* REGISTRATION FLOW */

  if(!user.fullName && text){
  if(!validateFullName(text))
  return bot.sendMessage(chatId,"❌ Name must be at least 3 characters");

  user.fullName=text;

  return bot.sendMessage(chatId,"📱 Enter phone number");
  }


  if(!user.phone && text){

  if(!validatePhone(text))
  return bot.sendMessage(chatId,"❌ Invalid Ethiopian phone");

  user.phone=text;

  return bot.sendMessage(chatId,"🚘 Enter car model");
  }


  if(!user.carModel && text){

  if(!validateCarModel(text))
  return bot.sendMessage(chatId,"❌ Invalid car model");

  user.carModel=text;

  return bot.sendMessage(chatId,"📅 Enter car year");

  }


  if(!user.carYear && text){

  if(!validateCarYear(text))
  return bot.sendMessage(chatId,"❌ Invalid year");

  user.carYear=parseInt(text);

  return bot.sendMessage(chatId,
  "🔢 Enter plate number\nExample: 3AA12345");

  }


  if(!user.plateNumber && text){

  const plate = text.toUpperCase();

  if(!validatePlate(plate))
  return bot.sendMessage(chatId,
  "❌ Invalid plate format.\nExample: 3AA12345");

  const existing = await UserCar.findOne({
  plateNumber:plate
  });

  if(existing)
  return bot.sendMessage(chatId,
  "❌ This plate is already registered");

  user.plateNumber = plate;

  user.awaitingPhotos = true;

  return bot.sendMessage(chatId,
  "📷 Send car photos.\nSend multiple photos if needed.\nType /done when finished");

  }

  });


  /* PHOTO HANDLER */

  bot.on("photo", async (msg)=>{

  const chatId = msg.chat.id;

  const user = users[chatId];

  if(!user || !user.awaitingPhotos) return;

  const photo = msg.photo[msg.photo.length-1];

  const file = await bot.getFile(photo.file_id);

  const url=`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

  user.photos.push(url);

  bot.sendMessage(chatId,"✅ Photo saved");

  });


  /* DONE */

  bot.onText(/\/done/, async (msg)=>{

  const chatId = msg.chat.id;

  const user = users[chatId];

  if(!user)
  return bot.sendMessage(chatId,"❌ No registration in progress");

  try{

  await UserCar.create({

  telegramId:chatId,
  fullName:user.fullName,
  phone:user.phone,
  plateNumber:user.plateNumber,
  carModel:user.carModel,
  carYear:user.carYear,
  carPhotos:user.photos

  });

  bot.sendMessage(chatId,"🚗 Car registered successfully");

  delete users[chatId];

  }catch(err){

  console.log(err);

  bot.sendMessage(chatId,"❌ Error saving car");

  }

  });

  };