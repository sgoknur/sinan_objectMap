const express = require("express");
const axios = require("axios");
const path = require("path");
const Fs = require("fs");

const { redirect } = require("express/lib/response");
const { nextTick } = require("process");

const app = express();
const port = 3000;

const asyncHandler = require("express-async-handler");
const { resolveObjectURL } = require("buffer");

let respString = "";

//art object
function art_object(object_ID, ids_ID, iiif_baseuri) {
  this.object_ID = object_ID;
  this.ids_ID = ids_ID;
  this.iiif_baseuri = iiif_baseuri;
}

let display_objects = [];

function processData(api_data, art_obj_array = []) {
  for (let i = 0; i < api_data.length; i++) {
    for (let j = 0; j < api_data[i].records.length; j++) {
      if (
        //Check for images data to make sure it exists
        api_data[i].records[j].images &&
        api_data[i].records[j].images.length > 0
      ) {
        //create a new obect with id, idsid, and iiifbaseuri
        const newObj = new art_object(
          api_data[i].records[j].id,
          api_data[i].records[j].images[0].idsid,
          api_data[i].records[j].images[0].iiifbaseuri
        );
        art_obj_array.push(newObj);
      }
    }
  }
  console.log(
    `number of objects in art objects array is ${art_obj_array.length}`
  );
  return art_obj_array;
}

const api_url =
  "https://api.harvardartmuseums.org/object?apikey=bc950edf-09f5-4d10-8522-99818d613439&gallery=any&size=100&q=imagepermissionlevel:0 AND images.idsid:>0";

//Async fetch all API data
async function getAllData(api_url, page = 1, posts = []) {
  try {
    const response = await axios.get(api_url);
    const totalPages = response.data.info.pages;
    const promiseArray = [];
    for (let i = 1; i < totalPages + 1; i++) {
      promiseArray.push(axios.get(`${api_url}&page=${i}`));
    }

    // promise.all allows to make multiple axios requests at the same time.
    // It returns an array of the results of all axios requests
    let resolvedPromises = await Promise.all(promiseArray);
    for (let i = 0; i < resolvedPromises.length; i++) {
      // This gives access to the output of each API call
      posts = posts.concat(resolvedPromises[i].data);
    }
    console.log(`NUMBER OF POSTS : ${posts.length}`);
    return posts;
  } catch (err) {
    console.log(err);
  }
}

//Async download images

async function downloadImage() {
  const url = "https://unsplash.com/photos/AaEQmoufHLk/download?force=true";
  const path_img = path.resolve(__dirname, "art_images", "code.jpg");
  const writer = Fs.createWriteStream(path_img);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

//************ */

app.get(
  "/admin",
  asyncHandler(async (req, res, next) => {
    let data = await getAllData(api_url);
    console.log(`RETURNED FROM API CALL WITH DATA ${data.length}`);

    display_objects = processData(data);

    let test = await downloadImage();
    console.log("Downloaded image I think");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.write("<h1>Admin Page</h1>");
    res.write(`<p>length POSTS is ${data.length}<br>`);
    res.write(`length OBJ is ${display_objects.length}<br></p>`);
    res.end();
  })
);

app.get("/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write("<h1>Currently Exhibited Works</h1>");
  let img_url = "";
  for (let i = 0; i < display_objects.length; i++) {
    img_url = display_objects[i].iiif_baseuri + "/square/30,/0/default.jpg";
    res.write(`<img src=${img_url} style="float:left;">`);
  }
  res.end();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
