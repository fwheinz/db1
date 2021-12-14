// Setup node js application with "express"
const express = require('express')
const app = express()
const port = 80
// Serve static files from folder 'static'
app.use(express.static('static'))
app.use(require('body-parser').urlencoded({ extended: false }))

// Setup handlebars template engine
const { engine } = require('express-handlebars')
app.set('views', __dirname + '/views')
app.set('view engine', 'hbs')
app.engine('hbs', engine({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs' }))

// Setup database connection
const connuri = process.env["DBCONN"];
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const { Pool, Client } = require('pg')
const connectionString = connuri + '?sslmode=require'
const client = new Client ({ connectionString })
client.connect()

/**********************************************************************/
/*                                                                    */
/*             Routes and views for the webshop application           */
/*                                                                    */
/**********************************************************************/ 


// Render the page views/index.hbs
app.get('/', (req, res) => {
  res.render("index");
})

// Render a list of all customers
app.get('/customers', (req, res) => {
  var q = 'SELECT cno, nddame, count(id) as nrorders FROM customers '+
          'LEFT JOIN orders USING (cno) GROUP BY cno'
  doQuery(res, q, 'customers')
})

// Render customer search result
app.get('/customersearch', (req, res) => {
  var q = 'SELECT cno, name FROM customers '+
          'WHERE name like \'%'+req.query.search+'%\''
  doQuery(res, q, 'customers');
})

// Show the items of the webshop at a given offset
app.get('/shop/:offset', (req, res) => {
  var offset = Number(req.params.offset || 0);
  var q = 'SELECT * FROM products LIMIT 4 OFFSET '+offset;
  doQuery(res, q, 'shop', { next: offset+4, 
                            prev: offset-4})
})



// Perform a database query
// res:      the response context
// query:    the database query to perform 
// template: the template file to render (in directory "views")
// params:   further parameters to pass to the template
function doQuery (res, query, template, params = {}) {
  client.query(query, 
    (err, data) => {
      if (err) {
        err.query = query;
        err.msg = String(err);
        res.render('error', err);
      } else {
        for (var key in params) {
          data[key] = params[key];
        }
        res.render(template, data)
      }
    }
  )
}

// Open listen port and serve requests
app.listen(port, () => {
  console.log(`App listening on ${port}`)
})