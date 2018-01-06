import { Request, Response, NextFunction } from "express";
import * as bodyParser from "body-parser";
let bcrypt = require('bcrypt');
const saltRounds = 10;
let express = require("express");
let session = require("express-session");
let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var mysql = require('mysql');
let mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'appartementdb'
}



var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("App listening at http://%s:%s", host, port)
})

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(session({ secret: "geheim" }));


 let isAuthenticated = (request: Request, response: Response, next: NextFunction) => {
if (request.session.user){
  next();
}
else {
  response.send({"error": 401, "message": "Unauthorized" });
}
 }

app.put ("/appartement", isAuthenticated, (request: Request, response: Response) => {
  let updatequery="UPDATE appartements SET "
  let connection = mysql.createConnection(mysqlConfig);
  connection.connect();
  for (let key in request.body) {
    if (key !="id"){
    let value = request.body[key];
    updatequery=updatequery + key +"= '" +value +"', ";
    } 
  }
updatequery=updatequery.substr(0,updatequery.length-2);
updatequery=updatequery +" WHERE ID=" + request.body.id;
console.log(updatequery);
connection.query(updatequery,(error,results,fields) =>{
  if (error) {
    console.log("error ocurred", error);
    response.send({
      "code": 400,
      "failed": "error ocurred"
    }) 
  }else {
    response.send({
      "code" : 200,
      "success" : "Appartement updated successfully"
    })
    
    }
  })
});

app.get("/appartement", (request: Request, response: Response)=>{
  let connection = mysql.createConnection(mysqlConfig);
  connection.connect();
  let getappartementquery =" Select * from appartements WHERE ";
  for (let key in request.query){
    if (key !== "limit"){
      if (key !== "offset"){
      let value = request.query[key];
    getappartementquery=getappartementquery + key +" = '" + value +"'" +" AND ";
      }
    }
  }
  getappartementquery=getappartementquery.substr(0,getappartementquery.length-4);

  
    if (request.query.limit){
      getappartementquery=getappartementquery +" LIMIT " + request.query.limit +" " ;
    }
    if (request.query.offset){
      getappartementquery=getappartementquery +"OFFSET " +  request.query.offset; 
    }
  
  
  console.log(getappartementquery);
  connection.query(getappartementquery, (error,rows)=>{
    if (error){
      response.send({
        "code": 400,
        "failed": "error ocurred"
      })
    }else {
    let json =JSON.stringify(rows);
    response.send(json);
    }
  });
  
})

app.post("/postappartement", isAuthenticated, (request: Request, response: Response) => {
  let connection = mysql.createConnection(mysqlConfig);
  connection.connect();
  let sql = "INSERT into appartements (objecttype,rooms,squaremeter,price,extra,plz,ort,contact) VALUES ?";
  let values= [
    [request.body.objecttype,request.body.rooms,request.body.squaremeter,request.body.price,
      request.body.extra,request.body.plz,request.body.ort,request.session.user.id]
  ]
  connection.query(sql,[values],(error,results,fields) =>{
  if (error) {
    console.log("error ocurred", error);
    response.send({
      "code": 400,
      "failed": "error ocurred"
    })
} else {

  console.log ("The Solution is: ",results);
  response.send ({
    "code" : 200,
    "success" : "Appartement added successfully"
  })
}


})
})

app.post("/testpost", (request: Request, response: Response) => {
  console.log(request.body.username);
  request.session.username = request.body.username;
  response.send("Username: " + request.body.username);
})

app.get("/isloggedin",isAuthenticated, (request: Request, response: Response) => {
  let tmp=Object.assign({},request.session.user)
  delete tmp.password;
response.send(tmp);
  });

   

app.post('/logout',isAuthenticated, (request: Request, response: Response) => {
  delete request.session.user;
  response.send("Logout Successfull");

})

app.post('/login', (request: Request, response: Response) => {
  let connection = mysql.createConnection(mysqlConfig);
  connection.connect();
  let user = {
    "username": request.body.username,
    "password": request.body.password
  }
  connection.query("SELECT * from usertable WHERE username = ? ", [user.username], (error, results) => {
    if (error) {
      console.log("error ocurred", error);
      response.send({
        "code": 400,
        "failed": "error ocurred"
      })
    }
    else {
      if (results[0].password.length) {
        bcrypt.compare(user.password, results[0].password, (err, result) => {
          if (result) {
            request.session.user = results[0];
            response.send("Login Successfull");
          }
          else {
            response.send("Login failed");
          }
        })

      }

    }


  })
});



app.post('/register', (request: Request, response: Response) => {
  let connection = mysql.createConnection(mysqlConfig);
  connection.connect();
  let user = {
    "username": request.body.username,
    "password": request.body.password,
    "email": request.body.email

  }
  console.log(user.password);
  bcrypt.hash(user.password, saltRounds, (err, hash) => {
    user.password = hash;
    console.log(user.password);
    connection.query('INSERT INTO usertable SET ?', user, (error, results, fields) => {
      if (error) {
        console.log("error ocurred", error);
        response.send({
          "code": 400,
          "failed": "error ocurred"
        })
      } else {
        console.log('The solution is: ', results);
        response.send({
          "code": 200,
          "success": "user registered sucessfully"
        });
      }
    });
  })



});





