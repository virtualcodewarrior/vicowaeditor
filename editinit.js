// editinit.js - This file is part of the ViCoWa editor
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

// Assign the vicowa editor to the right domain
//////////////////////////////////////////////////////////////////////////////////

// if we are not nested the vicowa editor must come from the production domain else it must come from develop domain
// this is so we can edit the vicowa editor itself without breaking the production version
(function()
{
	"use strict";
	
	// this will replace the production name in case we are editing the editor itself
    var DevelopHost = "http://localhost",	
    Script = document.createElement("script"),
	Path = document.location.pathname.substring(0, document.location.pathname.lastIndexOf("/") + 1);
	
    // this code will use the items that have been set to replace the items in the hostname for development
    window.ViCowaEditorBasePath = ((parent && parent.ViCoWaEditor) ? DevelopHost : document.location.protocol + "//" + document.location.host) + Path;
    
    Script.src = ViCowaEditorBasePath + "third_party/requirejs/2.1.14/requirejs.js";
    Script.setAttribute("data-main", ViCowaEditorBasePath + "main.js");
    
    document.getElementsByTagName("head")[0].appendChild(Script);
})();

