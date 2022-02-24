const express = require("express");
const axios = require("axios");
const path = require("path");

const { redirect } = require("express/lib/response");
const { nextTick } = require("process");

const app = express();
const port = 3000;

//ASYNC SERVER BUSINESS NOT YET WORKING 1/3
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
  //console.log(`There are ${api_data.length} items in the data array`);

  //for debugging
  //num is the order of each object
  let num = 0;

  //for debugging
  //success is to count to see how many objects has valid idsid and iiifbasreuri
  let success = 0;

  for (let i = 0; i < api_data.length; i++) {
    //for debugging
    //console.log(`There are ${api_data[i].records.length} records in data array num ${i}`);

    for (let j = 0; j < api_data[i].records.length; j++) {
      //for debugging
      //console.log(`Object id for ${num} is ${api_data[i].records[j].id}`);

      if (
        //I had to do this check to make sure image array exists and has at leasy
        //one item in it because I was frequently getting an error and exiting that said:
        //TypeError: Cannot read properties of undefined, triggered both for idsid and iiifbaseuri
        api_data[i].records[j].images &&
        api_data[i].records[j].images.length > 0
      ) {
        /*console.log(
          `ids id for ${num} is ${api_data[i].records[j].images[0].idsid}`
        );
        console.log(
          `iiifbase uri for ${num} is ${api_data[i].records[j].images[0].iiifbaseuri}`
        );*/

        //just a count to see how many objects has valid idsid and iiifbasreuri in total
        //create a new obect with id, idsid, and iiifbaseuri
        success++;
        const newObj = new art_object(
          api_data[i].records[j].id,
          api_data[i].records[j].images[0].idsid,
          api_data[i].records[j].images[0].iiifbaseuri
        );
        art_obj_array.push(newObj);
      } else {
        console.log(`skipping ${num}`);
      }
      num++;
    }
  }
  //for debugging
  //console.log(`number of success is ${success}`);
  console.log(
    `number of objects in art objects array is ${art_obj_array.length}`
  );
  return art_obj_array;
}

const api_url =
  "https://api.harvardartmuseums.org/object?apikey=bc950edf-09f5-4d10-8522-99818d613439&gallery=any&size=100&q=imagepermissionlevel:0 AND images.idsid:>0";

/*const getAll = (api_url, page = 1, posts = []) => {
  axios
    .get(`${api_url}&page=${page}`)
    .then((response) => {
      //baby steps
      if (page <= response.data.info.pages) {
        posts = posts.concat(response.data);
        page++;
        return setTimeout(() => getAll(api_url, page, posts), 300);
      } else {
        console.log(`all done, found ${posts.length} posts`);
        console.log();
        respString = JSON.stringify(posts);
        processData(posts);
        return posts;
      }
    })
    .catch((err) => console.log(err));
};*/

//ASYNC SERVER BUSINESS NOT YET WORKING 2/3
async function getAll(api_url, page = 1, posts = []) {
  axios
    .get(`${api_url}&page=${page}`)
    .then((response) => {
      //baby steps
      if (page <= response.data.info.pages) {
        posts = posts.concat(response.data);
        page++;
        return setTimeout(() => getAll(api_url, page, posts), 300);
      } else {
        console.log(`all done, found ${posts.length} posts`);
        respString = JSON.stringify(posts);
        let processed_data = processData(posts);
        console.log(
          `returning processed_data with ${processed_data.length} items in it`
        );
        //return processed_data;
        return processed_data;
        //Promise.resolve(processed_data);
      }
    })
    .catch((err) => console.log(err));
}

//ASYNC TRIAL NUMERO TWO
async function getAll2(api_url, page = 1, posts = []) {
  try {
    const response = await axios.get(api_url);
    const totalPages = response.data.info.pages;
    const promiseArray = [];
    for (let i = 1; i < totalPages + 1; i++) {
      promiseArray.push(axios.get(`${api_url}&page=${i}`));
    }

    // promise.all allows you to make multiple axios requests at the same time.
    // It returns an array of the results of all your axios requests
    let resolvedPromises = await Promise.all(promiseArray);
    for (let i = 0; i < resolvedPromises.length; i++) {
      // This will give you access to the output of each API call
      //console.log(resolvedPromises[i]);
      posts = posts.concat(resolvedPromises[i].data);
    }
    console.log(`NUMBER OF POSTS : ${posts.length}`);

    //now process the data
    /*
    let art_obj_array = [];
    for (let i = 0; i < posts.length; i++) {
      for (let j = 0; j < posts[i].records.length; j++) {
        if (
          posts[i].records[j].images &&
          posts[i].records[j].images.length > 0
        ) {
          const newObj = new art_object(
            posts[i].records[j].id,
            posts[i].records[j].images[0].idsid,
            posts[i].records[j].images[0].iiifbaseuri
          );
          art_obj_array.push(newObj);
        }
      }
    }
    console.log(`NUMBER OF OBJECTS : ${art_obj_array.length}`);*/

    return posts;
  } catch (err) {
    console.log(err);
  }
}

app.get(
  "/admin",
  asyncHandler(async (req, res, next) => {
    console.log("test 1 working");

    let bar = await getAll2(api_url);
    console.log(`RETURNED FINE WITH BAR ${bar.length}`);
    let foo = processData(bar);
    //getAll(api_url);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write("<h1>Admin Page</h1>");
    console.log("test 2 working");
    res.write("<p>executed</p>");
    res.write(`length POSTS is ${bar.length}<br>`);
    res.write(`length OBJ is ${foo.length}`);
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

//this is working but doesn't have async await
/*app.get("/admin", (req, res) => {
  getAll(api_url);
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write("<h1>Admin Page</h1>");
  res.end();
});*/

/*app.get("/admin", (req, res, next) => {
  getAll(api_url).then(
    posts => {
      processData(posts);
    }).catch(next); // error passed on to the error handling route
});*/

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
