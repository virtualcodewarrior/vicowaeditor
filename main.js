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
		basepath: ViCowaEditorBasePath,
		paths: 
		[
			{ name: "jquery" 						, root: "third_party/jquery/2.1.1/"					, type: 'js'	, file: "jquery.js" 				},
			{ name: "jquery.ui" 					, root: "third_party/jquery-ui/1.10.4/"				, type: 'js'	, file: "js/jquery-ui-1.10.4.js" 	},
			{ name: "ace"							, root: "third_party/ace/20140411/"					, type: 'js'	, file: "lib/ace.js"				},
			{ name: "jquery.jqgrid"  				, root: "third_party/jqgrid/4.6.0/"					, type: 'js'	, file: "js/jquery.jqGrid.js"		},
			{ name: "spin"  						, root: "third_party/spinjs/2.0.1/"					, type: 'js'	, file: "spin.js"					},
			{ name: "jquery.spin"  					, root: "third_party/spinjs/2.0.1/"					, type: 'js'	, file: "jquery.spin.js"			},
			{ name: "jquery.noty"  					, root: "third_party/noty/2.2.4/"					, type: 'js'	, file: "js/noty/packaged/jquery.noty.packaged.js" },
			{ name: "jquery.jstree"  				, root: "third_party/jstree/3.0.0-5aaf257/"			, type: 'js'	, file: "dist/jstree.js"			},
			{ name: "diffview"  					, root: "third_party/jsdifflib/1.0/"				, type: 'js'	, file: "diffview.js"				},
			{ name: "jquery.vicowa.addcss"  		, root: "jquery.vicowa.addcss/"						, type: 'js'	, file: "jquery.vicowa.addcss.js"	},
			{ name: "vicowalogin"  					, root: "authenticate/"								, type: 'js'	, file: "login.js"					},
			{ name: "jquery.vicowa.errorhandling"  	, root: "jquery.vicowa.errorhandling/"				, type: 'js'	, file: "jquery.vicowa.errorhandling.js" },
			{ name: "jquery.i18n"  					, root: "third_party/jquery.i18n/v1.1.1/"			, type: 'js'	, file: "jquery.i18n.js"			},
			{ name: "sha512"  						, root: "third_party/sha512/v2.2/"					, type: 'js'	, file: "sha512.js"					},
			{ name: "amplify"  						, root: "third_party/amplify/v1.1.2/"				, type: 'js'	, file: "amplify.js"				},
			{ name: "purl"  						, root: "third_party/purl/v2.3.1/"					, type: 'js'	, file: "purl.js"					},
			{ name: "jquery.ba-bbq" 				, root: "third_party/jquery.ba-bbq/v1.2.1/"			, type: 'js'	, file: "jquery.ba-bbq.js"			},
			{ name: "mimetypeimages" 				, root: "mimetypeimages/"							, type: 'js'	, file: "mimetypeimages.js"			},
			{ name: "vicowafilesystemaccess" 		, root: "filesystemaccess/"							, type: 'js'	, file: "vicowafilesystemaccess.js"	},
			{ name: "jquery.vicowa.servertree" 		, root: "jquery.vicowa.servertree/"					, type: 'js'	, file: "jquery.vicowa.servertree.js"	},
			{ name: "jquery-ui.css"					, root: "third_party/jquery-ui/1.10.4/"				, type: 'css'	, file: "themes/cupertino/jquery-ui.css" },
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
		shim:
		{
			"jqgrid" : ["jquery", "third_party/jqgrid/js/i18n/grid.locale-en"],
			"jquery.noty" : ["jquery"],
			"jquery.i18n" : ["jquery"],
			"purl" : ["jquery"],
			
			
	//        'library/jquery/jquery.migrate' : ['jquery'],
	/*        'jqueryplugin/jquery.address/jquery.address' : ['jquery'],
			'jqueryplugin/jquery.ba-bbq/jquery.ba-bbq' : ['jquery'],
			'jqueryplugin/jquery.columnizer/jquery.columnizer' : ['jquery'],
			'jqueryplugin/jquery.cookie/jquery.cookie' : ['jquery'],
			'jqueryplugin/jquery.fixedheadertable/jquery.fixedheadertable' : ['jquery'],
			'jqueryplugin/jquery.layout/jquery.layout' : ['jquery'],
			'jqueryplugin/jquery.mousewheel/jquery.mousewheel' : ['jquery'],
			'jqueryplugin/jquery.pirobox/jquery.pirobox' : ['jquery'],
			'jqueryplugin/jquery.rloader/jquery.rloader' : ['jquery'],
			'jqueryplugin/jquery.svg/jquery.svg' : ['jquery'],
			'jqueryplugin/jquery.tablesorter/jquery.tablesorter' : ['jquery'],
			'jqueryplugin/jquery.tree/jquery.tree' : ['jquery'],
			'jqueryplugin/jquery.url/jquery.url' : ['jquery'],
			'jqueryplugin/jquery.ui/js/jquery.ui' : ['jquery'],
			'jqueryplugin/jquery.ui.touch-punch/jquery.ui.touch-punch' : ['jqueryplugin/jquery.ui/js/jquery.ui'],
			'library/amplify/amplify' : ['jquery'],*/
		},
		waitSeconds: 30
	});

	require(["vicowaeditor", "jquery.vicowa.addcss"], function(ViCoWa)
	{
		$.addCSS({ paths: pathmapping.getCSSPaths() });
	});
}());