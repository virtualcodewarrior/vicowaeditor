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

require.config(
{
    paths:
    {
        "jquery": "third_party/jquery/2.1.1/jquery",
		"jquery.ui": "third_party/jquery-ui/1.10.4/js/jquery-ui-1.10.4",
        "ace": "third_party/ace/20140411/lib/ace",
		"jqgrid" : "third_party/jqgrid/4.6.0/js/jquery.jqGrid",
		"spin" : "third_party/spinjs/2.0.1/spin",
		"jquery.spin" : "third_party/spinjs/2.0.1/jquery.spin",
		"jquery.noty" : "third_party/noty/2.2.4/js/noty/packaged/jquery.noty.packaged",
		"jstree" : "third_party/jstree/3.0.0-5aaf257/dist/jstree",
		"diffview" : "third_party/jsdifflib/1.0/diffview",
		"jquery.vicowa.addcss" : "jquery.vicowa.addcss/jquery.vicowa.addcss",
		"vicowafilesystemaccess" : "filesystemaccess/vicowafilesystemaccess",
		"vicowalogin" : "authenticate/login",
		"mimetypeimages" : "mimetypeimages/mimetypeimages",
		"jquery.vicowa.errorhandling" : "jquery.vicowa.errorhandling/jquery.vicowa.errorhandling",
		"jquery.i18n" : "third_party/jquery.i18n/v1.1.1/jquery.i18n",
		"sha512" : "third_party/sha512/v2.2/sha512",
		"amplify" : "third_party/amplify/v1.1.2/amplify",
		"purl" : "third_party/purl/v2.3.1/purl",
		"jquery.ba-bbq": "third_party/jquery.ba-bbq/v1.2.1/jquery.ba-bbq",
    },
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

require(["vicowaeditor"], function(ViCoWa)
{
	"use strict";
});
