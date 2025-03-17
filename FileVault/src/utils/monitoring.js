const client = require("prom-client");

const fileUploadCounter = new client.Counter({
  name: "file_upload_total",
  help: "Total number of file uploads",
  labelNames: ["status"], // success/failure
});

const fileDownloadCounter = new client.Counter({
  name: "file_download_total",
  help: "Total number of file downloads",
  labelNames: ["status"],
});

module.exports = { fileUploadCounter, fileDownloadCounter };
