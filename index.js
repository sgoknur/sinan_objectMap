const express = require("express");

const { ConcurrencyManager } = require("axios-concurrency");
const axios = require("axios");
const path = require("path");
const Fs = require("fs");

const { redirect } = require("express/lib/response");
const { nextTick } = require("process");

const app = express();
const port = 3000;

const asyncHandler = require("express-async-handler");
const { resolveObjectURL } = require("buffer");

//EJS bizness
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));

//This folder path is needed for re-creating and servicing image URLs to client
const art_images_folder = "./art_images/";

//Middlewar
//app.use(express.static(path.join(__dirname, "./art_images")));
app.use("/art_images", express.static(__dirname + "/art_images"));

let respString = "";

//art object
function art_object(object_ID, ids_ID, iiif_baseuri) {
  this.object_ID = object_ID;
  this.ids_ID = ids_ID;
  this.iiif_baseuri = iiif_baseuri;
}

let display_objects = [];

const thumbnailSize = 40;

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

async function getObject(object_id) {
  try {
    const query_url = `https://api.harvardartmuseums.org/object/${object_id}?apikey=bc950edf-09f5-4d10-8522-99818d613439`;
    const objResponse = await axios.get(query_url);
    return objResponse.data;
  } catch (error) {
    console.log(error);
  }
}

//This is the URL for all the artworks shown in galleries currently that do not have
//image permission restrictions and that have valid idsd
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
//single image was working
/*async function downloadImage() {
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
}*/

//Async download images
//batch images
async function downloadImage(art_objects_array) {
  try {
    //Concurrency test
    // a concurrency parameter of 1 makes all api requests secuential
    const MAX_CONCURRENT_REQUESTS = 10;

    let promArray = [];
    for (let i = 0; i < art_objects_array.length; i++) {
      const url =
        art_objects_array[i].iiif_baseuri +
        "/square/" +
        thumbnailSize +
        ",/0/default.jpg";
      const path_img = path.resolve(
        __dirname,
        "art_images",
        `${art_objects_array[i].object_ID}.jpg`
      );
      const writer = Fs.createWriteStream(path_img);

      const instance = axios.create({
        method: "GET",
        responseType: "stream",
      });

      // init your manager.
      const manager = ConcurrencyManager(instance, MAX_CONCURRENT_REQUESTS);

      const response = await instance.get(url);

      /*
      //THIS WAS WORKING BUT I HAD TO CHANGE IT
      //for CONCURRENCY MANAGER
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });*/

      response.data.pipe(writer);

      let my_promise = new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      promArray.push(my_promise);
    }

    let resolved = await Promise.all(promArray);
    return;
  } catch (error) {
    console.log(error);
  }
}

app.get(
  "/admin",
  asyncHandler(async (req, res, next) => {
    let data = await getAllData(api_url);
    console.log(`RETURNED FROM API CALL WITH DATA ${data.length}`);

    display_objects = processData(data);

    //DOWNLOAD IMAGES -- KEEP WORKING ON THIS
    //let test = await downloadImage(display_objects);
    //console.log("Downloaded image I think");

    res.writeHead(200, { "Content-Type": "text/html" });
    res.write("<h1>Admin Page</h1>");
    res.write(`<p>length POSTS is ${data.length}<br>`);
    res.write(`length OBJ is ${display_objects.length}<br></p>`);
    res.end();
  })
);

app.get("/", (req, res) => {
  //Read in name of files in art_images
  let fileNames = Fs.readdirSync(art_images_folder);

  //TO DO: when I was messing around with the folder, a .DS_Store
  //was introduced, this means urlArray had an element that said
  //../art_images/.DS_Store so of course that was displayed as a
  //broken image link. I think I can check on the extension to make
  //sure it is .jpg to enter it into the urlArray

  //THIS IS WORKING, COMMENTING OUT FOR TESTING SERVING IMAGES W/O DOWNLOADING
  //let urlArray = fileNames.map((x) => "." + art_images_folder + x);
  //Instead I will populate the urlArray with IIIFuri's
  let urlArray = [];
  let objIDs = [];

  let img_url = "";
  let objid = "";

  for (let i = 0; i < display_objects.length; i++) {
    img_url =
      display_objects[i].iiif_baseuri +
      "/square/" +
      thumbnailSize +
      ",/0/default.jpg";

    objid = display_objects[i].object_ID;

    urlArray.push(img_url);
    objIDs.push(objid);
  }

  console.log(`URL ARRAY HAS ${urlArray.length} elements`);
  console.log(`OBJ ID ARRAY HAS ${objIDs.length} elements`);
  console.log(urlArray[0]);
  console.log(objIDs[0]);

  //Renders EJS file, and passes urlArray
  //TO DO: Also Pass an Object ID array that corresponds to the urlArray
  //res.render("index", { urlArray: urlArray });
  res.render("index", { urlArray: urlArray, objIDs: objIDs });

  //res.end();
});

app.get(
  "/object/:objID",
  asyncHandler(async (req, res, next) => {
    console.log(req.params.objID);
    let obj = await getObject(req.params.objID);
    console.log(JSON.stringify(obj));
    res.end();
  })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
