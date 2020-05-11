/*
tipos:
0 - amdin
1 - aluno
2 - tutor
3 - pai
*/

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
var async = require('async');

const app = express();

app.set('view engine', 'ejs');//view engine é ejs

app.use(bodyParser.urlencoded({extended:false}));//nao inserir objeto na url
app.use(bodyParser.json());//parser para json

app.use(express.static("./public"));//funcao para ser possivel renderizar itens estaticos

var pool = mysql.createPool({
  connectionLimit:100,
  connectTimeout: 100000,
  host: 'engsoft2020.mysql.dbaas.com.br',
  user: 'engsoft2020',
  password: 'a123456',
  database: 'engsoft2020'
});

app.get('/', function (req, resp){//get index
  resp.render('index');//renderiza a view correspondente
});
app.get('/login', function(req, resp){//get da view login (render normal)
  resp.render('login', {message: ''});
});

app.post('/login', function(req, resp){//post da view login (consulta o banco)
  var login = req.body.login;//pega variáveis do formulario
  var senha = req.body.senha;
  var user = [];//variavel que vai receber os dados do banco
  var query = mysql.format("SELECT * FROM usuarios where login=?;", [login]);//formatacao da query
  //pool.getConnection(function(err, con) {
    //if(err) throw err;
    pool.query(query, function(err,rows){
      user = rows;//atribuicao dos dados recebidos do banco
      if(user && user.length > 0 && user[0].senha == senha){//Usuario logado
        if(user[0].tipo==0){//tipo administracao
          resp.redirect('/administracao');
          app.get('/administracao', function(req, resp){
            var tutores, alunos;
            var nome = user[0].nome;
            var query = mysql.format("SELECT * FROM usuarios WHERE tipo = 2");
            pool.query(query, (err, results)=>{
              if(err){
                console.log(err);
              };
              tutores = results;
              var query = mysql.format("SELECT * FROM usuarios WHERE tipo = 1");
              pool.query(query, (err, results)=>{
                if(err){
                  console.log(err);
                };
                alunos = results;
                resp.render('administracao/index', {tutores, alunos, nome});
              });
            });
          });
  
          app.get('/administracao/cadastro', function(req, resp){
            var query = mysql.format('SELECT id, nome FROM usuarios WHERE tipo = 2');
            pool.query(query, (err, tutores)=>{
              if(err){
                console.log(err);
              };
              resp.render('administracao/cadastro', {tutores});
            });
          });
  
          app.post('/administracao/cadastro', function(req, resp){
            var nome = req.body.nome;
            var sobrenome = req.body.sobrenome;
            var login = req.body.login;
            var senha = req.body.senha;
            var tipo = parseInt(req.body.tipo);
            var query = mysql.format("INSERT INTO usuarios (nome, sobrenome, login, senha, tipo) VALUES (?, ?, ?, ?, ?);", [nome, sobrenome, login, senha, tipo]);
            pool.query(query, (err,rowsAlu) => {
              if(err){
                console.log(err);
              };
              if(tipo === 1){
                var pNome = req.body.pNome;
                var pSobrenome = req.body.pSobrenome;
                var pLogin = req.body.pLogin;
                var pSenha = req.body.pSenha;
                var idt = req.body.tutores;
                query = mysql.format("INSERT INTO usuarios (nome, sobrenome, login, senha, tipo) VALUES (?, ?, ?, ?, ?);", [pNome, pSobrenome, pLogin, pSenha, 3]);
                pool.query(query, (err,rowsPai) => {
                  if(err){
                    console.log(err);
                  };
                  query = mysql.format("INSERT INTO `relac-pai-alu` (idp, ida) VALUES (?, ?);", [rowsAlu.insertId, rowsPai.insertId]);
                  pool.query(query, (err,rows) => {
                    if(err){
                      console.log(err);
                    };
                    query = mysql.format("INSERT INTO `relac-tutor-alu` (idt, ida) VALUES (?, ?);", [idt, rowsAlu.insertId]);
                    pool.query(query, (err, rows)=>{
                      if(err){
                        console.log(err);
                      };
                    });
                  });
                });
              }
            });
            resp.redirect('/administracao/cadastro');
          });
        }else if(user[0].tipo==1){//tipo aluno
          resp.redirect('/aluno');
          app.get('/aluno', function(req, resp){
            var nome = user[0].nome;
            var query = mysql.format('SELECT * FROM mensagem WHERE destinatario = ?', [user[0].id]);//and lida = 0 (futuramente)
            pool.query(query, (err, mensagens)=>{
              if (err) throw err;
              resp.render('alunos/index', {nome, mensagens});
            });
          });
          app.get('/aluno/mensagem/:id', function(req, resp) {
            var query = mysql.format('SELECT * FROM mensagem WHERE id = ?', req.params.id);
            pool.query(query, (err, mensagemBanco)=>{
              if (err) throw err;
              mensagem = mensagemBanco[0];
              resp.render('alunos/mensagem', {mensagem});
              var query = mysql.format('UPDATE mensagem SET lida = 1 WHERE id = ?', req.params.id);
              pool.query(query, (err)=>{
                if (err) throw err;
              });
            });
          });
          app.post('/aluno/mensagem/:id', function(req, resp){
            var respostaAlu = req.body.resposta;
            var query = mysql.format('SELECT * FROM mensagem WHERE id = ?', req.params.id);
            pool.query(query, (err, mensagem)=>{
              if (err) throw err;
              assunto = "RES: "+  mensagem[0].assunto;
              var query = mysql.format('INSERT INTO mensagem (assunto, corpo, remetente, destinatario, lida) VALUES (?, ?, ?, ?, ?)', [assunto, respostaAlu, mensagem[0].destinatario, mensagem[0].remetente, 0]);
              pool.query(query, (err)=>{
                if (err) throw err;
              });
            });
          });
        }else if(user[0].tipo==2){//tipo tutor
          resp.redirect('/tutor');
  
          app.get('/tutor', function(req, resp){
            var nome = user[0].nome;
            var query = mysql.format('SELECT * FROM mensagem WHERE destinatario = ?', [user[0].id]);//and lida = 0 (futuramente)
            pool.query(query, (err, mensagens)=>{
              if (err) throw err;
              resp.render('tutores/index', {nome, mensagens});
            });
          });

          app.get('/tutor/mensagem/:id', function(req, resp) {
            var query = mysql.format('SELECT * FROM mensagem WHERE id = ?', req.params.id);
            pool.query(query, (err, mensagemBanco)=>{
              if (err) throw err;
              mensagem = mensagemBanco[0];
              resp.render('tutores/mensagem', {mensagem});
              var query = mysql.format('UPDATE mensagem SET lida = 1 WHERE id = ?', req.params.id);
              pool.query(query, (err)=>{
                if (err) throw err;
              });
            });
          });
          app.post('/tutor/mensagem/:id', function(req, resp){
            var respostaAlu = req.body.resposta;
            var query = mysql.format('SELECT * FROM mensagem WHERE id = ?', req.params.id);
            pool.query(query, (err, mensagem)=>{
              if (err) throw err;
              assunto = "RES: "+  mensagem[0].assunto;
              var query = mysql.format('INSERT INTO mensagem (assunto, corpo, remetente, destinatario, lida) VALUES (?, ?, ?, ?, ?)', [assunto, respostaAlu, mensagem[0].destinatario, mensagem[0].remetente, 0]);
              pool.query(query, (err)=>{
                if (err) throw err;
              });
              resp.redirect('/tutor');
            });
          });
          
          app.get('/tutor/add-atv', function(req, resp){
            var query = mysql.format('SELECT id, nome FROM usuarios a, `relac-tutor-alu` b WHERE a.id = b.ida');
            pool.query(query, (err, alunos)=>{
              if (err) throw err;
              resp.render('tutores/add-atv', {alunos});
            });
          });
  
          app.post('/tutor/add-atv', function(req, resp){
            titulo = req.body.titulo; //para o banco é o assunto
            conteudo = req.body.conteudo; //para o banco é o corpo
            ida = req.body.alunosRelacionados;
            var query = mysql.format('INSERT INTO mensagem (assunto, corpo, remetente, destinatario, lida) VALUES (?, ?, ?, ?, ?)', [titulo, conteudo, user[0].id, ida, 0]);
            pool.query(query, (err, results)=>{
              if (err) throw err;
              resp.redirect('/tutor/add-atv');
            });
          });
  
        }else if(user[0].tipo==3){//tipo pai
          resp.redirect('/pai');
  
          app.get('/pai', function(req, resp){
            resp.render('pais/index');
          });
        }else{//caso tenha sido salvo de forma errada, não será nenhum dos anteriores
          console.log("Usuário salvo de forma errada");
        }
      }
      else{
        msg = 'Usuário incorreto ou inesistente';
        resp.render('login', {message: msg});
      }
    });
    //con.release();
  //});    
});


const server = http.createServer(app);//criacao do servidor
server.listen(1000);//definicao da porta do servidor
console.log('Servidor Conectado');
