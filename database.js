//import package
const mysql = require('mysql2')

//create connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Test@12345',
    database: 'node_crud'
})

//connect
db.connect( (err) => {
    if(err){
        console.log('Error connecting to DB: ', err.stack)
        return;
    }

    console.log('Successfully connected to DB')
})

//Export the connection
module.exports = db
