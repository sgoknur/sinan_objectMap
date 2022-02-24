const express = require("express");
const axios = require("axios");
const path = require("path");

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

//let art_obj_array = [];

let iiifbaseuri_array = [];

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

app.get(
  "/admin",
  asyncHandler(async (req, res, next) => {
    console.log("test 1 working");

    let bar = await getAllData(api_url);
    console.log(`RETURNED FINE WITH BAR ${bar.length}`);
    let foo = processData(bar);
    //getAll(api_url);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write("<h1>Admin Page</h1>");
    console.log("test 2 working");
    res.write("<p>executed</p>");
    res.write(`length POSTS is ${bar.length}<br>`);
    res.write(`length OBJ is ${foo.length}<br>`);
    for (let i = 0; i < foo.length; i++) {
      res.write(`object idsid is ${foo[i].iiif_baseuri} <br>`);
    }
    res.end();
    console.log("test 3 working");
  })
);

app.get("/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write("<h1>Currently Exhibited Works</h1>");
  res.write(`<p>${respString}</p>`);
  res.end();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
