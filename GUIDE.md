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

## Setup: FusionAuth Dashboard
In order to get that login link, we need to register an application with FusionAuth; fire up the FusionAuth dashboard by going [here](http://localhost:9011/admin/application/) (which will require that you log in to the dashboard first), and create an Application by clicking the "+" in the upper-right corner.

The page that comes back is filled with a number of bells, whistles, and options. We want to keep it simple, though, so give the application a name (`hello-world` suffices for our purposes), and hit "Return". (The "Return" is necessary to create the application in the FusionAuth database.) When the application is created, FusionAuth will generate a GUID for the application's "client ID" (which we'll need in code in a second), but we have one more step we need to take--we need to specify a "redirect URL" target for FusionAuth to redirect to when the authentication step completes. That appears on the "OAuth" page in the Application page in the FusionAuth dashboard--first in the list below "Theme" in the Edit Application dashboard--in the entry field labeled "Authorized redirect URLs". This is the URL that FusionAuth will issue to the webserver when authentication is completed (successfully or not); we need to specify a URL that our NodeJS code will recognize and handle.

Let's call it "oauthRedirect":

```js
app.get('/oauth-redirect', (req, res) => {
	console.log('/oauthRedirect')
})
```

and thus, put `http://localhost:3000/oauthRedirect` into that "Authorized redirect URLs" field in the Application page. Click the "Save" icon in the upper-right, and it takes us back to the main list of applications in the FusionAuth dashboard.

## Setup: Capture client application info
With that saved, FusionAuth can now give us the link we need to use to start the login process; from the Applications dashboard page, find the line with our application `hello-world` in it, and to the right, there is a 'View' icon that displays a number of interesting elements we'll need:

(SCREENSHOT GOES HERE)

Of the information displayed here, the parts we're going to need to satisfy our simplest-login-possible scneario is the `Client Id`, `Client Secret`, and `OAuth IdP login URL`. Keep that window open for a second--we'll want to cut-and-paste here in a second.

## Code: Integrate the client application info
The first two client info elements, client id and secret, go into the NodeJS code:

```js
// ...
import fileSystem from 'fs'

const clientId = 'f73b4062-e91c-4037-8027-246fa4786e67'
const clientSecret = 'ahAscxuirNNjtXe0_lQFpn_Jc_0C6TyWhkdEhqgoAc8'

const app = express()
// ...
```

and the last we'll put into the `index.html`:

```html
<!doctype html>
<html>
    <title>FusionAuth: HelloWorld</title>
	<body>
		<p>Hello world! Welcome to our awesome application.</p>
		<p>Please <a href="http://localhost:9011/oauth2/authorize?client_id=f73b4062-e91c-4037-8027-246fa4786e67&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2FoauthRedirect">log in</a> to enjoy the awesome.</p>
	</body>
</html>
```

> **SIDEBAR: Important safety tip!** Let's be very, *very* clear on something: One should never store secrets (like the `clientSecret`, above) directly in code--in addition to being vulnerable in the event your source code repository is ever obtained (assuming it's not open-source to start with!), you will want periodically to "rotate the keys"--that is, change the secret for the application--in case you have a breach, or just choose to do as part of your security policy. In this case, if the secret is part of the code, you'll need to do a code-deploy just to rotate keys, and that is potentially more work than you'd like. Normally, secrets like this would be stored as part of the environment rather than the code, such as an environment variable set in the Docker image, but since this is a simple example and never intended for production use, we can get away with using this code-stored secret. (Seriously, don't ever do this for code you care about. *Caveat emptor.*)

## Code: Respond to the redirect
