// vicowafilessystemaccess.js - This file is part of the ViCoWa editor
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

define(["jquery"], function($)
{
	"use strict";

	var retrieveRememberMeData = function(){ return {}; };
    
    function ObjectReviver(p_Key, p_Value)
    {
        return p_Value;
    }
    
    function doSave(p_ServerPath, p_Path, p_Data, p_Callback, p_Append, p_WriteID)
    {
        var BufferSize = 1000000;
        
        if (p_Data.length > BufferSize)
        {
            $.ajax(
            {
                url: p_ServerPath,
                data: $.extend({}, 
                {
                    text: p_Data.substr(0, BufferSize),
                    action: 'save',
                    format: 'json',
                    path: p_Path,
                    writeid: p_WriteID,
                    append: p_Append
                },
                retrieveRememberMeData()),
                dataType: "JSON",
                type: 'post',
                cache: false,
                success: function(p_ResultData)
                {
                    if (p_ResultData.save && p_ResultData.save.result && p_ResultData.save.result == "Success" && p_ResultData.save.writeid)
                    {
                        doSave(p_ServerPath, p_Path, p_Data.substr(BufferSize), p_Callback, true, p_ResultData.writeid);
                    }
                    else
                    {
                        p_Callback(false);
                    }
                },
                error: function()
                {
                    p_Callback(false);
                }
            });         
        }
        else
        {
            $.ajax(
            {
                url: p_ServerPath,
                data: $.extend({}, 
                {
                    text: p_Data,
                    action: 'save',
                    format: 'json',
                    path: p_Path,
                    writeid: '',
                    append: p_Append
                }, retrieveRememberMeData()),
                dataType: "JSON",
                type: 'post',
                cache: false,
                success: function(p_Data)
                {
                    p_Callback(p_Data && p_Data.save && p_Data.save.result == "Success", p_Data);
                },
                error: function()
                {
                    p_Callback(false);
                }
            });         
        }
    }
    
    return {
        serverPath : "",
        setServerPath : function(p_ServerPath){ this.serverPath = p_ServerPath; },
        setRememberMeDataRetriever : function(p_Callback){ retrieveRememberMeData = (typeof p_Callback === "function") ? p_Callback : retrieveRememberMeData; },
        save : function(p_Path, p_Data, p_Callback)
        {
            doSave(this.serverPath, p_Path, p_Data, p_Callback, false, '');
        },
        load : function(p_Path, p_Callback, p_ObjectReviver)
        {
            p_ObjectReviver = p_ObjectReviver || ObjectReviver;
            
            $.ajax(
            {
                url: this.serverPath,
                dataType: "json",
                data: $.extend({},
                {
                    action: 'load',
                    path: p_Path,
                    format: 'json'
                }, retrieveRememberMeData()),
                converters: { "text json" : function(p_Value){ return JSON.parse(p_Value, p_ObjectReviver); } },
                success : function(p_Data)
                {
                    if (p_Data && p_Data.load && p_Data.load.result == "Success" && p_Data.load.paths[p_Path])
                    {
                        p_Callback(p_Data.load.paths[p_Path]);
                    }
                    else
                    {
                        p_Callback(false);                
                    }
                },
                error : function()
                {
                    p_Callback(false);                
                }
            });
        },
        browse: function(p_Path, p_Callback)
        {
            $.ajax(
            {
                url: this.serverPath,
                data: $.extend({},
                {
                    action: 'browse',
                    format: 'json',
                    path: p_Path
                }, retrieveRememberMeData()),
                dataType: "JSON",
                type: 'post',
                cache: false,
                success: function(p_Data)
                {
                    p_Callback(p_Data);
                },
                error: function()
                {
                    p_Callback(false);
                }
            });
        },
        fileexists : function(p_Path, p_Callback)
        {
            $.ajax(
            {
                url: this.serverPath,
                data: $.extend({},
                {
                    action: 'fileexists',
                    format: 'json',
                    path: p_Path
                }, retrieveRememberMeData()),
                dataType: "JSON",
                type: 'post',
                cache: false,
                success: function(p_Data)
                {
                    p_Callback(p_Data && p_Data.fileexists && p_Data.fileexists.paths && p_Data.fileexists.paths[p_Path]);
                },
                error: function()
                {
                    p_Callback(false);
                }
            });         
        },
        create : function(p_Path, p_Callback)
        {
            $.ajax(
            {
                url: this.serverPath,
                data: $.extend({},
                {
                    action: 'create',
                    format: 'json',
                    path: p_Path
                }, retrieveRememberMeData()),
                dataType: "JSON",
                type: 'post',
                cache: false,
                success: function(p_Data)
                {
                    p_Callback(p_Data && p_Data.create && p_Data.create.result == "Success");
                },
                error: function()
                {
                    p_Callback(false);
                }
            });         
        },
        modifytime : function(p_Path, p_Callback)
        {
            $.ajax(
            {
                url: this.serverPath,
                data: $.extend({}, 
                {
                    action: 'modifytime',
                    format: 'json',
                    path: p_Path
                }, retrieveRememberMeData()),
                dataType: "JSON",
                type: 'post',
                cache: false,
                success: function(p_Data)
                {
                    var Matches = null;
                    if (p_Data && p_Data.modifytime && p_Data.modifytime.paths && p_Data.modifytime.paths[p_Path])
                    {
                        Matches = p_Data.modifytime.paths[p_Path].match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
                    }
                    if (Matches && Matches.length > 6)
                    {
                        p_Callback(new Date(parseInt(Matches[3], 10), parseInt(Matches[2], 10) - 1, parseInt(Matches[1], 10), parseInt(Matches[4], 10), parseInt(Matches[5], 10), parseInt(Matches[6], 10), 0));
                    }
                    else
                    {
                        p_Callback(null);
                    }
                },
                error: function()
                {
                    p_Callback(null);
                }
            });         
        }
    };
});