'use strict'

const debug = require('debug')('nodestr:server');
const http = require('http');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const router = express.Router();
const app = express();

const port = 7000;
app.set('port', port);

// SELECIONAR TODOS OS USUARIOS DO BANCO CADASTRADOS
router.get('/users',(req,res,rows)=>{
	execSqlQuery("SELECT * FROM usuarios",res);
});
//SELECIONAR USUARIOS PELO CODIGO
router.get('/users/:id?',(req, res) => { 
    let filter = '';
    if(req.params.id) filter = (req.params.id);
    execSqlQuery(`SELECT * FROM  usuarios where codigo = "${filter}%";`, res);
    
});

//SELECIONAR USUARIOS PELO NOME
router.get('/users/pesquisa/:name?',(req, res) => { 
    let filter = '';
    if(req.params.name) filter = (req.params.name);
    execSqlQuery(`SELECT * FROM  usuarios where nome LIKE "${filter}%";`, res);
    
});

const server = http.createServer(app);

module.exports = router;
app.use('/', router);

server.listen(port);
console.log('Api rodando na porta  ' + port);

function execSqlQuery(sqlInsert, res) {
      const connection = mysql.createConnection({
        host: "localhost",
        port: "3306",
        user: "root",
        password: "root",
        database: "banconodejs"
    });
    connection.query(sqlInsert, function (error, results, fields) {
        if (error)
            console.log('executou!');

        else
            res.json(results);
        connection.end();
        console.log('executou!');
    });
}