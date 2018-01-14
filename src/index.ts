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

/* CORS Requests You need to set Cross Origin Headers to allow
for requests from a certain domain. In our case that is localhost:4200.
If you dont have the CORS Headers set your browser wont allow the requests.
In Methods you see the allowed methods. The other important thing is to send 
Credentials (Thats the Session (when ur logged in)*/ 

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(session({ secret: "geheim" }));

/* Checks whether the usr is logged in or not */
 let isAuthenticated = (request: Request, response: Response, next: NextFunction) => {
if (request.session.user){
  next();
}
else {
  response.send({"error": 401, "message": "Unauthorized" });
}
 }

 /*This function lets you update your appartements. Works fine in backend 
 but isn't used. */
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

/* This function fetches the Data for a specific Appartement 
in a Join with the Usertable to allow display of the Owner and
the email. */
app.get("/appartementdetail",(request : Request,response: Response) => {
  let connection = mysql.createConnection(mysqlConfig);
  connection.connect();
  let value = request.query["id"]
  let query = "Select * from appartements INNER JOIN usertable ON appartements.contact = usertable.id where appartements.id = ?";
  console.log(query, );
  connection.query(query,[value], (error,rows)=>{
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

});

/*This GET Request gets all appartements that match certain attributes
e.g. a specific name or that its from a certain city.
It also allows for Limit and Offset which means you can choose
how many found results you want to displa and from what position on e.g.
5 results displayed starting from the 10th one found */
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


/* This POST Request allows you to add a new entry in your table.
You need to be logged in to do this request. It's a prepared statement which
means it's a fixed query which protects from SQL Injection an you can only enter
the values where the question mark is placed.  */
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

/* Some testpost to check if a post request is working. Can be deleted */
app.post("/testpost", (request: Request, response: Response) => {
  console.log(request.body.username);
  request.session.username = request.body.username;
  response.send("Username: " + request.body.username);
})

/*This return the user specific data when hes logged in except for the PW. 
In our case thats Email and Username. */
app.get("/isloggedin",isAuthenticated, (request: Request, response: Response) => {
  let tmp=Object.assign({},request.session.user)
  delete tmp.password;
response.send(tmp);
  });

   
/*Logs the user out by deleting his session. */
app.post('/logout',isAuthenticated, (request: Request, response: Response) => {
   request.session.user = undefined;
   console.log("User has logged out");
  response.send("Logout Successfull");

})

/*Login function. It checks whether the username exists in the database
and if it does it hashes the entered pw with bicrypt and compares it
with the hashed on in the database. If its a match a new session is created
with the user details */
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
      console.log(results.length);
      if (results.length === 0){
        response.send({
          "code": 400,
          "failed": "Wrong username or password."
        });
      }
      if (results.length !== 0 && results[0].password.length) {
        bcrypt.compare(user.password, results[0].password, (err, result) => {
          if (result) {
            request.session.user = results[0];
            response.send({
              "code": 200,
              "success": "Login successfull"
            });
          }
          else {
            response.send({
              "code": 400,
              "failed": "Wrong username or password."
            });
          }
        })

      }

    }


  })
});


/*This POST Request enters a new user in the DB
It takes the entered values from the request Body and then puts them
in the prepared statement to create a new entry in the DB. Bcrypt also 
hashes the password to make sure it's stored only in the hashed version
in our DB.  */
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





