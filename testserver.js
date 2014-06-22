#!/usr/bin/env node

var http = require("http")
  , path = require("path")
  , mime = require("mime")
  , url = require("url")
  , fs = require("fs")
  , qs = require("querystring")
  , port = process.env.PORT || 8888
  , ip = process.env.IP || "0.0.0.0";

function doPHP(p_Command, p_Response)
{
	var exec = require("child_process").exec;
	
	exec(p_Command, function (error, stdout, stderr) 
	{ 
		if (error)
		{
			p_Response.writeHead(200, {"Content-Type": "text/plain"});
			p_Response.write(error.toString());		
			p_Response.end();
		}
		else
		{
			p_Response.writeHead(200, {"Content-Type": "text/plain"});
			
			if (typeof stdout === "string")
			{
				p_Response.write(stdout);		
			}
			else
			{
				p_Response.write(stdout.toString());		
			}
			p_Response.end();
		}
	}); 
}
  
http.createServer(function(request, response) 
{
	var urlParts = url.parse(request.url),
	uri = urlParts.pathname, 
	filename = path.join(process.cwd(), uri),
	body = "";
	
	if (/^\/filesystemaccess$/.test(urlParts.pathname))
	{
		Command = "php filesystemaccess/filesystemaccesswrap.php 'filesystemaccess.php";
		Command += "?server|" + "HTTP_ORIGIN=" + ((request.headers.origin) ? request.headers.origin : request.headers.host) + "&HTTP_HOST=" + request.headers.host + "&REMOTE_ADDR=" + request.connection.remoteAddress + "&HTTP_USER_AGENT=" + request.headers["user-agent"];

		if (request.method === 'POST')
		{
			request.on('data', function(p_Data)
			{
				body += p_Data;
				if (body.length > 1e6)
				{
					request.connection.destroy();
				}
			});
			request.on('end', function()
			{
				Command += "?post|" + body + "'";
				doPHP(Command, response);
			})
		}
		else 
		{
			Command += "?get|" + urlParts.query + "'";
			doPHP(Command, response);
		}
	}
	else
	{
		fs.exists(filename, function(exists) 
		{
			if(!exists) 
			{
				response.writeHead(404, {"Content-Type": "text/plain"});
				response.write("404 Not Found\n");
				response.end();
			}
			else 
			{
				if (fs.statSync(filename).isDirectory()) 
				{
					filename += '/vicowaeditor.html';
				}

				fs.readFile(filename, "binary", function(err, file) 
				{
					if(err) 
					{
						response.writeHead(500, {"Content-Type": "text/plain"});
						response.write(err + "\n");
						response.end();
					}
					else
					{
						var contentType = mime.lookup(filename) || "text/plain";
						response.writeHead(200, {"Content-Type": contentType});
						response.write(file, "binary");
						response.end();
					}
				});
			}
		});
	}
}).listen(port, ip);

console.log("http://localhost:" + port);
