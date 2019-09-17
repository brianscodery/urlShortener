'use strict';

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      autoIncrement = require('mongoose-auto-increment');
const bodyParser = require('body-parser');

const cors = require('cors');

const app = express();
const dns = require('dns');
// Basic Configuration 
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, err => {
  if(err){
    console.error(err);
  }
});
autoIncrement.initialize(mongoose.connection);
mongoose.Promise = global.Promise;
app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

const LinkSchema = new Schema({
  url: String
});
LinkSchema.plugin(autoIncrement.plugin, 'Link');
const Link = mongoose.model('Link', LinkSchema);





const handleLongUrl =  async (req, res) => {
  const url = req.params.url;
  const valid = await checkValid(url)
    .catch(err => {
      res.json({error: 'invalid URL'});    
    });
  if(valid) {
    Link.find({url},(err,link)=>{
      if(link.length === 0){
        const link = new Link({url});
        link.save((err, data) => {
          if(err){
            res.send(err);
          }
          res.json(
            {original_url: data.url,
             short_url: data._id}
          );
        });
      } else {
        res.json(
          {original_url: link[0].url,
          short_url: link[0]._id}
        );
      }
    });
  }  
};

const checkValid = path => {
  return new Promise((resolve, reject)=> {
    let valid = false;
    let hostname;
    if(path.startsWith('http://')){
      valid=true;
      hostname = path.slice(7);
    } else if(path.startsWith('https://')){
      valid = true;
      hostname = path.slice(8);
    }
    if(!valid){reject('invalid');}
    dns.lookup(hostname, null, err => {
      if (err) {
        reject(err);
      }
      resolve(true);
    });
  });
};



const redirectHandler = (req, res) => {
  const id = req.params.id;
  Link.findById(id, async (err, link) => {
    if(err){
      res.send('An error occurred retrieving your url. Nostra culpa.');
      res.end();
    }
    const url = link.url;
    res.redirect(url);
  });
}


app.post('/api/shorturl/new/:url(*)', handleLongUrl);
app.get('/api/shorturl/new/:id(*)', redirectHandler);


app.listen(port, function () {
  console.log('Node.js listening ...');
});