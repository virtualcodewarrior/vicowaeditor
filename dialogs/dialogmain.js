// main.js - This file is part of the ViCoWa editor
// @author ViCoWa
// @version 0.0.4
// @copyright Copyright (C) 2011-2014 ViCoWa
// @url www.vicowa.com
// @license The MIT License - http://www.opensource.org/licenses/mit-license.php
// -----------------------------------------------------------------------
// Copyright (c) 2011-2014 ViCoWa : www.vicowa.com
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy 
// of this software and associated documentation files (the "Software"), to deal 
// in the Software without restriction, including without limitation the rights to 
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of 
// the Software, and to permit persons to whom the Software is furnished to do 
// so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all 
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
// OTHER DEALINGS IN THE SOFTWARE. 
// -----------------------------------------------------------------------
// Entry point for require
///////////////////////////////////////////////////////////

(function()
{
	"use strict";

	window.pathmapping = 
	{
		basepath: "/",
		paths: 
		[
			{ name: "jquery" 						, root: "third_party/jquery/2.1.1/"					, type: 'js', file: "jquery.js" 				},
			{ name: "jquery.ui" 					, root: "third_party/jquery-ui/1.10.4/"				, type: 'js', file: "js/jquery-ui-1.10.4.js" 	},
			{ name: "jquery.vicowa.addcss"  		, root: "jquery.vicowa.addcss/"						, type: 'js', file: "jquery.vicowa.addcss.js"	},
			{ name: "jquery.jstree"  				, root: "third_party/jstree/3.0.0-5aaf257/"			, type: 'js', file: "dist/jstree.js"			},
			{ name: "vicowafilesystemaccess" 		, root: "filesystemaccess/"							, type: 'js', file: "vicowafilesystemaccess.js"	},
			{ name: "jquery.vicowa.servertree" 		, root: "jquery.vicowa.servertree/"					, type: 'js', file: "jquery.vicowa.servertree.js" },
			{ name: "mimetypeimages"				, root: "mimetypeimages/"							, type: 'js', file: "mimetypeimages.js"			},
			{ name: "jquery-ui.css"					, root: "third_party/jquery-ui/1.10.4/"				, type: 'css', file: "themes/cupertino/jquery-ui.css" },
		],
		getRequirePaths: function getRequirePaths()
		{
			var Result = {};
			
			this.paths.forEach(function(p_Path)
			{
				if (p_Path.type === "js")
				{
					Result[p_Path.name] = this.basepath + p_Path.root + p_Path.file.replace(/\.js$/i, "");
				}
			}, this);
			
			return Result;
		},
		getCSSPaths: function getCSSPaths()
		{
			var Result = {};
			
			this.paths.forEach(function(p_Path)
			{
				if (p_Path.type === "css")
				{
					Result[p_Path.name] = this.basepath + p_Path.root + p_Path.file;
				}
			}, this);
			
			return Result;
		},
		getPath: function getPath(p_Name)
		{
			var Result = null;
			this.paths.forEach(function(p_Path)
			{
				if (p_Path.name === p_Name)
				{
					Result = this.basepath + p_Path.root;
				}
			}, this);
			
			return Result;
		}
	}

	require.config(
	{
		paths: pathmapping.getRequirePaths(),
		waitSeconds: 30
	});

	require(["jquery", "vicowafilesystemaccess", "jquery.vicowa.addcss"], function($, p_FileSystemAccess)
	{
		p_FileSystemAccess.setServerPath("/filesystemaccess");
		$.addCSS({ paths: pathmapping.getCSSPaths() });
		
		require([$("script[dialog]").attr("dialog")], function(p_Dialog)
		{
			p_Dialog.create({}, function(p_Result)
			{
				alert(JSON.stringify(p_Result));
			});
		});
	});
}());

