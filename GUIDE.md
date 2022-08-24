# A Guide to the Hello World of FusionAuth
In this post, we're going to explore how to add authentication to your existing application using the FusionAuth system. Assuming you have already downloaded-and-configured FusionAuth on your local machine (downloads [here](https://fusionauth.io/download) if you haven't already; I prefer the Docker install since that requires the least amount of configuration on my part), we begin by looking at our existing, sample application.

And oh, boy, is it simple. It's a NodeJS application that doubles as a simple web server to present some HTML files when we need to:

```js
import express from 'express'
import fileSystem from 'fs'

const app = express()
const port = 3000

app.get('/', (req, res) => {
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
app.listen(port, () => {
	console.log(`App listening on port ${port}`)
})
```

Note that this is `index.mjs`, so that we can make use of ES5 modules, rather than the more traditional `require` syntax used with CommonJS. (We may be simple, but let's at least be modern about this, shall we?)

We have a home page, which will present a login link:

```html
<!doctype html>
<html>
    <title>FusionAuth: HelloWorld</title>
	<body>
		<p>Hello world! Welcome to our awesome application.</p>
		<p>Please <a href="LOGIN_PAGE">log in</a> to enjoy the awesome.</p>
	</body>
</html>
```

Normally, that would go to our home-grown authentication page, but we want to use FusionAuth to secure our authentication. FusionAuth will present a login screen, capture the user's password, and redirect back to our application when that's all done.

In order to get that login link, we need to register an application with FusionAuth; fire up the FusionAuth dashboard by going [here](http://localhost:9011/admin/application/) (which will require that you log in to the dashboard first), and create an Application by clicking the "+" in the upper-right corner.

The page that comes back is filled with a number of bells, whistles, and options. We want to keep it simple, though, so give the application a name (`hello-world` suffices for our purposes), and hit "Return". (The "Return" is necessary to create the application in the FusionAuth database.) When the application is created, FusionAuth will generate a GUID for the application's "client ID" (which we'll need in code in a second), but we have one more step we need to take--we need to specify a "redirect URL" target for FusionAuth to redirect to when the authentication step completes. That 