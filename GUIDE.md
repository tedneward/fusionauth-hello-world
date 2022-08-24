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
		// Purely for those clients who don't follow 301s
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
When the user clicks that "log in" link, FusionAuth takes over and presents the page that contains the form asking for username and password. Assuming the user enters the credentials correctly, FA will then send a "code" and "userState" values to your URL of choice--that's what we entered in the "OAuth Redirect" field earlier. We can capture those values and do something with them, but for now it's sufficient to simply display that we got them:

```js
app.get('/oauthRedirect', (req, res) => {
	console.log('/oauth-redirect: code=', req.query['code'], 'userState=', req.query['userState'])
	// What we get back:
	// code: the authorization code
	// userState: either Authenticated or AuthenticatedNotRegistered
	let code = req.query['code']
	let userState = req.query['userState']

	res.end('You have authenticated')
})
```

## Browser: Try it out using your admin creds
At this point, assuming the application is registered in the FusionAuth database and you have at least one user in that database (which you have to--you created one when you configured the FusionAuth server to be the admin, remember?), you can test what we've got. Run the NodeJS application (`node index.mjs`), [pop open a browser](http://localhost:3000) when that's started, and click the log in link. Fill in your admin creds, and assuming you typed everything correctly, "You are authenticated" should appear.

(SCREENSHOT)

***This ends the 5-minute intro***

This is all great, but obviously it doesn't scale well: if everybody has to share the same credentials as our security administrator, something's going to break down pretty quickly. Let's add a (non-admin) user to the database.

## Dashboard: Add a User
To add users by hand to the FusionAuth database, bring up the Dashboard again, and click on "Users" in the left well. Again, the "+" icon in the upper-right adds a new user. Let's add everybody's favorite sitcom hero, Fred Flintstone, to our application. He makes use of the Bedrock community email system, so his email is `fred@bedrock.gov`, but working at the quarry hasn't let him afford a mobile phone yet. On top of that, since we don't have email configured in FusionAuth (yet), turn off "Send email to set up password", and let's give him a password already, one he'll easily remember: `pebblesflintstone`.

> **SIDEBAR: Get culture!** If you have no idea who I'm referring to in this section, Fred Flintsone was the main character of "The Flintstones", a popular animated television show in the US back in the halcyon days of black-and-white TV. It was basically the same kind of family sitcom that was popular back in the day, except set in prehistoric times in the fictional town of Bedrock, and everybody's last name and everything else's name had something to do with geology: Fred worked for Mr Slate, his best friend was Barney Rubble, and so on. And his daughter, of course, was Pebbles.

We can fill out the bottom half of the user profile (first name, Fred, last name, Flintstone, and so on), and if we're truly feeling industrious, we can find an image for him. With all that data thus specified, we can click "Save" in the upper-right again, and lo, we have created a user.

Now for the important part: Fred is a user in our system, but he's not yet *registered* for our hello-world application. He needs to be registered so that FusionAuth knows what applications he's allowed to authenticate into (and, by extension, which ones he can't). To register him, click on the "Registrations" link in the far-left of his user profile display. (If you just clicked "Save" to save him, it should already be displayed.) Click "+ Add registration", select `hello-world` from the dropdown, give him a username for this application, and click "Save" again.

> **SIDEBAR: Roles.** Astute readers following along will note that there's a field we skipped, called "roles", which--you guessed it--would be where we'd configure the roles that Fred would have while working in our application. For now, we're just doing simple authentication, without any sort of role-based access control, so we just leave it blank.

Note that we gave Fred a username for this application because there are scenarios in which different applications will have different usernames--although this won't be quite such a concern for a greenfield application, when migrating from existing systems to FusionAuth, it may be necessary (critical, even) to keep existing usernames.

## Browser: Let Fred in!
So Fred seems to be in our database, fire up the browser, point it at [our home page](http://localhost:3000) again, and click "log in". Whoops! There's a strong chance that you're taken directly to the "You have been authenticated" message, because by default the "Keep me logged in" checkbox on the login page is turned on--cookies have been set, and the session hasn't timed out yet, so you're still authenticated. Convenient for users, less so for developers!

In a later step, we'll talk about how to enable a "logout" link to allow us (and those users who are using a public/insecure browser, such as a public library or hotel's business center) to clear those settings, but for now, you can fire up an "incognito window" in your favorite browser and try again. Enter "fred" and "pebblesflintstone", and voila! Fred is now authenticated.


