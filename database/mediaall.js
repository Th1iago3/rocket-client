const fs = require("fs");
const url = `https://mmg.whatsapp.net/v/t62.7118-24/32470197_785049840915960_4007222068566348825_n.enc?ccb=11-4&oh=01_Q5Aa2gFBtzMMBVUZ2Yytcxb0OT5XA1W9vGQc4O5HLAD6c_c6Vg&oe=68F4015B&_nc_sid=5e03e0&mms3=true`
const mimetype = `image/jpeg`
const fileSha256 = `ERkXzryNoUqXxrCytYuZL8Ap3GFecOdG1VuVWtH66Ss=`
const fileLength = `277082`
const height = `1035`
const width = `1049`
const mediaKey = `U0SRIyrjiI6RsnPR5QMA4JWjT4SAl8+eGHrE8wzw1/o=`
const fileEncSha256 = `DRvOfdfhnmzntO/s3ChIG6BLyPbfS3W8WClJSj/IDRU=`
const directPath = `/v/t62.7118-24/32470197_785049840915960_4007222068566348825_n.enc?ccb=11-4&oh=01_Q5Aa2gFBtzMMBVUZ2Yytcxb0OT5XA1W9vGQc4O5HLAD6c_c6Vg&oe=68F4015B&_nc_sid=5e03e0`
const mediaKeyTimestamp = `1758232803`
const jpegThumbnail = `/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEEAQgMBIgACEQEDEQH/xAAwAAEBAQEBAQEAAAAAAAAAAAAAAQIDBAUGAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAA/NVoiiKMzUMqNWUtvWdeE9XKXlLNcYDSU17PDc9voeblmdGd4154Llc00gu+ab1hEC5AoAIAD//EAB4QAAICAgMBAQAAAAAAAAAAAAABAhEgIQMSQBBB/9oACAEBAAE/APJRRWaJONLWzjjCVnLDpkhKEo0KEIo5ae7wX22dpP8ATZWh5IsbH5P/xAAZEQACAwEAAAAAAAAAAAAAAAABEQACICH/2gAIAQIBAT8A04LdWLBwVRbjwRFv/8QAGxEAAgIDAQAAAAAAAAAAAAAAAQIDEQASIEH/2gAIAQMBAT8A6VAVu8aEhN/OIpdLtbBySYOmqpQwqQL4V9cLE9//2Q==`
const scansSidecar = ``
const scanLengths = []
const midQualityFileSha256 = ``
const thumbnailDirectPath = ``
const thumbnailSha256 = ``
const thumbnailEncSha256 = ``
module.exports = {
  url, mimetype, fileSha256, fileLength, height, width,
  mediaKey, fileEncSha256, directPath, mediaKeyTimestamp,
  jpegThumbnail, scansSidecar, scanLengths,
  midQualityFileSha256, thumbnailDirectPath,
  thumbnailSha256, thumbnailEncSha256
}
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log("Updated");
  delete require.cache[file];
  require(file);
});
