import express from 'express'
import fileSystem from 'fs'

const clientId = 'f73b4062-e91c-4037-8027-246fa4786e67';
const clientSecret = 'ahAscxuirNNjtXe0_lQFpn_Jc_0C6TyWhkdEhqgoAc8';

const app = express()
const port = 3000

app.get('/', (req, res) => {
	console.log('/ redirected to /index.html')
	res.writeHead(301, {'Location':'/index.html'})
	res.end('Home page is <a href="index.html">here</a>.')
})
app.get('/:page.html', (req, res) => {
    let filename = './' + req.params["page"] + '.html'
    console.log("User requested", req.params["page"], "to display; sending", filename)
	fileSystem.readFile(filename, function(error, fileContent) {
		if(error){
			res.writeHead(404, {'Content-Type': 'text/plain'})
			res.end('Page not found')
		}
		else{
			res.writeHead(200, {'Content-Type': 'text/html'})
			res.write(fileContent)
			res.end()
		}
	});
})
app.get('/oauthRedirect', (req, res) => {
	// What we get back:
	// code: the authorization code
	// userState: either Authenticated or AuthenticatedNotRegistered
	let code = req.query['code']
	let userState = req.query['userState']

	console.log('/oauthRedirect: code=', code, 'userState=', userState)

	res.end('You have authenticated')
})

app.listen(port, () => {
	console.log(`App listening on port ${port}`)
})
