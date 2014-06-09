var page = new WebPage(),
address;

page.settings.loadImages = false;
page.settings.loadPlugins = true;

// this code is copied from the waitfor.js example file provided with PhantomJS
function waitFor(testFx, onReady, timeOutMillis) 
{
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
    start = new Date().getTime(),
    condition = false,
    interval = setInterval(function() 
	{
        if ((new Date().getTime() - start < maxtimeOutMillis) && !condition) 
		{
            // If not time-out yet and condition not yet fulfilled
            condition = testFx(); // test for condition
        } 
		else 
		{
            // Condition fulfilled (timeout or condition is 'true')
            clearInterval(interval); //< Stop this interval
            onReady(); //< Do what it's supposed to do once the condition is fulfilled
        }
    }, 250); //< repeat check every 250ms
}

// make sure enough parameters were specified when calling this script, we expect the url to be specified as the first parameter and only parameter
if (phantom.args.length === 0) 
{
    console.log("Usage: snapshot.js <some URL>");
    // alwyas make sure that PhantomJS is exited, else it will sit around waiting for more input
    phantom.exit();
} 
else 
{
    // retrieve the url from the command line arguments
    address = phantom.args[0];
	
	var resources = [];
    // to keep track of additional files that still need to be loaded
    page.onResourceRequested = function(request) 
	{
        resources[request.id] = request.stage;
    };
    // to keep track of which files have already been loaded
    page.onResourceReceived = function(response) 
	{
        resources[response.id] = response.stage;
    };
	
    // open our page
    page.open(address, function(status) 
	{
        // make sure we succeeded
        if (status !== "success") 
		{
            console.log("Failed to load the address");
        } 
		else 
		{
            // wait until all resources are loaded or until 10 seconds have passed
			waitFor(function()
			{
				// check if all resource have been loaded
                // if you want to use some other indicator to see if the page has finished loading and executed its scripts, insert the test for that here
                for (var Index = 1; Index < resources.length; ++Index) 
				{
                    if (resources[Index] != "end") 
					{
                        // if any resource still needs to be loaded we wait
                        return false;
                    }
                }
                // else we are done
                return true;
			}, function()
			{
                // console.log will output the results to the console in this case the whole page content is returned.
				console.log(page.content);
                // alwyas make sure that PhantomJS is exited, else it will sit around waiting for more input
				phantom.exit();
			}, 10000);
        }
    });
}