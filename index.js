const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const port = 3000;

let respString = "";
let urlArray = [];

const api_url =
  "https://api.harvardartmuseums.org/object?apikey=bc950edf-09f5-4d10-8522-99818d613439&gallery=any&size=100";

/*let config = {
  method: "get",
  url: "https://api.harvardartmuseums.org/object?apikey=bc950edf-09f5-4d10-8522-99818d613439&gallery=any&size=100",
  headers: {},
};

axios(config)
  .then(function (response) {
    respString = JSON.stringify(response.data);
    //console.log(JSON.stringify(response.data));
    console.log("Response Successful");
  })
  .catch(function (error) {
    console.log(error);
  });
*/

const getAll = (api_url, page = 1, posts = []) => {
  axios
    .get(`${api_url}&page=${page}`)
    .then((response) => {
      //baby steps
      if (page < 18) {
        posts = posts.concat(response.data);
        page++;
        return setTimeout(() => getAll(api_url, page, posts), 300);
      } else {
        console.log(`all done, found ${posts.length} posts`);
        console.log();
        respString = JSON.stringify(posts);
        return posts;
      }
    })
    .catch((err) => console.log(err));
};

getAll(api_url);

app.get("/", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write("<h1>Currently Exhibited Works</h1>");
  res.write(`<p>${respString}</p>`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
