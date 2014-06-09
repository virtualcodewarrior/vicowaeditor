// login.js - This file is part of the ViCoWa editor
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

define(["jquery", 
        "sha512", 
        "amplify"
//    "library/jquery/jquery.migrate", 
		], function()
{
	"use strict";

	var ServerPath = "";
    
    // the vicowa login object
    var ViCoWaLogin = 
    {
        setServerPath: function(p_ServerPath){ ServerPath = p_ServerPath; },
        getRememberMeData : function(){ return { "rememberme": amplify.store("userinfokey") }; },
        // log in
        // pass in a settings object with the following items
        // success: callback function for successfull logins (optional), the callback will receive one result object containing the following items
            // username: name of the logged in user
            // logintime: A date object with the login time and date
            // lastactive: A date object with the time and date of the last activity
            // password: The password that was provided
        // username: user name used for logging in (required)
        // password: password used for logging in (required)
        // timeout: the timeout for this login (optional) default = 30 days
        // error: callback function used that will be called when an error occurs
        // example ViCoWaLogin.login({ username: "user", password: "userpassword", timeout: 2592000, success: function(p_Data){}, error: function(p_Data){}});
        login: function(p_Settings)
        {
            if (typeof p_Settings.timeout === 'undefined')
            {
                p_Settings.timeout = 2592000; // 30 days
            }
        
            $.ajax(
            {
                url: ServerPath,
                type: "POST",
                dataType: "JSON"
            }).success(function(p_Data)
            {
                if (p_Data.authorized && typeof p_Data.username !== "undefined")
                {
                    // user is logged in
                    if (p_Settings.success)
                    {
                        p_Settings.success({ username: p_Data.username, logintime: new Date(p_Data.logintime), lastactive: new Date(p_Data.lastactive ) });
                    }
                }
                else if (p_Data["WWW-Authenticate"] == "vicowa_authenticate")
                {
                    var Password = p_Settings.passwordhash || b64_sha512(p_Settings.password);
                    var UserName = p_Settings.username;
                    var TimeOut = p_Settings.timeout;
                    var nc = "000000001";
                    var Time = new Date();
                    var cnonce = Time.getTime().toString();
        
                    var HA1 = hex_sha512(UserName + ":" + p_Data.realm + ":" + Password);
                    var HA2 = hex_sha512("POST:/userauthenticate");
        
                    var Result = hex_sha512(HA1 + ":" + p_Data.nonce + ":" + nc + ":" + cnonce + ":" + p_Data.qop + ":" + HA2);
        
                    var Header = "username=\"" + UserName + "\"," +  
                    "realm=\"" + p_Data.realm + "\"," +  
                    "nonce=\"" + p_Data.nonce + "\"," +
                    "uri=\"/userauthenticate\"" + "," +
                    "qop=\"" + p_Data.qop + "\"," +
                    "nc=\"" + nc + "\"," +
                    "cnonce=\"" + cnonce + "\"," +
                    "response=\"" + Result + "\"," + 
                    "response2=\"" + Password + "\"," + 
                    "timeout=\"" + TimeOut + "\"," + 
                    "opaque=\"" + p_Data.opaque + "\"";
        
                    $.ajax(
                    {
                        url: ServerPath,
                        type: "POST",
                        dataType: "JSON",
                        data: { vicowa_authenticate: Header }
                    }).success(function(p_ResultData)
                    {
                        if (p_ResultData.authorized)
                        {
                            if (p_ResultData.authorized && typeof p_ResultData.username !== "undefined" && p_Settings.success)
                            {
                                amplify.store("password", Password);
                                amplify.store("username", UserName);
                                amplify.store("userinfokey", p_ResultData.userinfokey);

                                // user is logged in
                                p_Settings.success({ username: UserName, logintime: new Date(p_ResultData.logintime), lastactive: new Date(p_ResultData.lastactive), password: p_Settings.password });
                            }
                        }
                        else if (p_Settings.error)
                        {
                            p_Settings.error(p_ResultData);
                        }
                    });
                }
            });
        },
        // log out
        // pass in a callback function to receive the result
        // p_Callback: callback function for successful logout (optional)
        logout: function(p_Callback)
        {
            $.ajax(
            {
                url: ServerPath,
                type: "POST",
                dataType: "json",
                data: { logout: true }
            }).success(function()
            {
                amplify.store("password", null);
                amplify.store("username", null);
                amplify.store("userinfokey", null);

                if (p_Callback)
                {
                    p_Callback();
                }
            });
        },
        // test if we are logged in
        // pass in a callback function that will receive the result of this query, the callback will receive a parameter, the callback will receive one result object containing the following items
            // authorized: boolean value that is either true if logged in or false if not logged int
            // username: name of the logged in user (only when authorized = true)
            // logintime: A date object with the login time and date (only when authorized = true)
            // lastactive: A date object with the time and date of the last activity (only when authorized = true)
        isLoggedIn: function(p_Callback)
        {
			p_Callback({
				authorized: true,
				username: "user",
				logintime: new Date(),
				lastactive: new Date()	   
			});
/*            var Url = ServerPath;

            $.ajax(
            {
                url: Url,
                type: "POST",
                dataType: "json",
                data: { "rememberme": amplify.store("userinfokey") }
            }).success(function(p_Data)
            {
                if (p_Callback)
                {
                    if (p_Data.authorized && typeof p_Data.username !== "undefined")
                    {
                        // user is logged in
                        p_Callback({ authorized: true, username: p_Data.username, logintime: new Date(p_Data.logintime), lastactive: new Date(p_Data.lastactive) });
                    }
                    else
                    {
                        p_Callback({ authorized: false });
                    }
                }
                else
                {
                    throw "No callback function specified";
                }
            });*/
        },
        ensureLoggedIn: function(p_Callback, p_ErrorCallback, p_UserName, p_Password, p_Timeout, p_PasswordHash)
        {
            ViCoWaLogin.isLoggedIn(function(p_LogCallback)
            {
                function doLogin()
                {
                    if (p_LogCallback.authorized)
                    {
                        p_Callback(p_LogCallback);
                    }
                    else
                    {
                        if (!p_UserName || !p_Password && !p_PasswordHash)
                        {
                            ViCoWaLogin.doLoginDialog(p_Callback, p_ErrorCallback, p_UserName, p_Password, p_Timeout);
                        }
                        else
                        {
                            ViCoWaLogin.login(
                            {
                                username: p_UserName,
                                password: p_Password,
                                passwordhash: p_PasswordHash,
                                timeout: p_Timeout,
                                success: p_Callback,
                                error: function(p_Data)
                                {
                                    alert("Invalid user name");
                                    p_UserName = null;
                                    p_Password = null;
                                    p_PasswordHash = null;
                                    doLogin();
                                }
                            });
                        }
                    }
                }
                
                if (!p_UserName || !p_Password && !p_PasswordHash)
                {
                    require(["amplify"], function()
                    {
                        p_PasswordHash = amplify.store("password");
                        p_UserName = amplify.store("username");
                        doLogin();
                    });
                }
                else
                {
                    doLogin();
                }

            });
        },
        doLoginDialog: function(p_Callback, p_ErrorCallback, p_UserName, p_Password, p_Timeout)
        {
			$.addCSS("third_party/jquery-ui/1.10.4/themes/cupertino/jquery-ui.css");

            require(["jquery.ui"], function()
            {
                var $PasswordDialog = $('<div/>'),
                $Table = $("<table/>").appendTo($PasswordDialog),
                $TBody = $("<tbody/>").appendTo($Table),
                $Row = $("<tr/>").appendTo($TBody);
                $("<td/>").text("User name").appendTo($Row);
                var $UserNameInput = $("<input/>", { type: "text", value: p_UserName}).appendTo($("<td/>").appendTo($Row));
                $Row = $("<tr/>").appendTo($TBody);
                $("<td/>").text("Password").appendTo($Row);
                var $PasswordInput = $("<input/>", { type: "password", value: p_Password}).appendTo($("<td/>").appendTo($Row));
                $Row = $("<tr/>").appendTo($TBody);
                $("<td/>").text("Timeout").appendTo($Row);
                var $TimeoutSelect = $("<select/>").appendTo($("<td/>").appendTo($Row));
                $("<option/>", { value: 1800 }).prop('selected', ((p_Timeout > 0 && p_Timeout <= 2700) ? true : false)).text("30 Minutes").appendTo($TimeoutSelect);
                $("<option/>", { value: 3600 }).prop('selected', ((p_Timeout > 2700 && p_Timeout <= 7200) ? true : false)).text("1 Hour").appendTo($TimeoutSelect);
                $("<option/>", { value: 10800 }).prop('selected', ((p_Timeout > 7200 && p_Timeout <= 10800) ? true : false)).text("3 Hours").appendTo($TimeoutSelect);
                $("<option/>", { value: 21600 }).prop('selected', ((p_Timeout > 10800 && p_Timeout <= 37800) ? true : false)).text("6 Hours").appendTo($TimeoutSelect);
                $("<option/>", { value: 43200 }).prop('selected', ((p_Timeout > 37800 && p_Timeout <= 64800) ? true : false)).text("12 Hours").appendTo($TimeoutSelect);
                $("<option/>", { value: 86400 }).prop('selected', ((p_Timeout > 64800 && p_Timeout <= 345600) ? true : false)).text("1 Day").appendTo($TimeoutSelect);
                $("<option/>", { value: 604800 }).prop('selected', ((p_Timeout > 345600 && p_Timeout <= 1598400) ? true : false)).text("7 Days").appendTo($TimeoutSelect);
                $("<option/>", { value: 2592000 }).prop('selected', ((p_Timeout > 1598400 && p_Timeout <= 16675200) ? true : false)).text("30 Days").appendTo($TimeoutSelect);
                $("<option/>", { value: 30758400 }).prop('selected', ((p_Timeout > 16675200 && p_Timeout <= 61516800) ? true : false)).text("1 Year").appendTo($TimeoutSelect);
                $("<option/>", { value: 2147483648 }).prop('selected', ((p_Timeout > 61516800 || p_Timeout < 0) ? true : false)).text("Infinite").appendTo($TimeoutSelect);
                
                $PasswordDialog.dialog(
                {
                    modal: true,
                    resizable: false,
                    width: "20em",
                    title: 'Authorization required',
                    buttons: 
                    [
                        {
                            text: "Login",
                            click: function()
                            {
                                // ask for username and password
                                p_UserName = $UserNameInput.val();
                                p_Password = $PasswordInput.val();
                                p_Timeout = $TimeoutSelect.val();
                                
                                // call this handler again
                                ViCoWaLogin.ensureLoggedIn(p_Callback, p_ErrorCallback, p_UserName, p_Password, p_Timeout);
                                $PasswordDialog.remove();
                            }
                        },
                        {
                            text: "Cancel",
                            click: function()
                            {
                                $PasswordDialog.remove();
                                if (p_ErrorCallback)
                                {
                                    p_ErrorCallback("user canceled");
                                }
                            }
                        }
                    ]
                });
            });
            
        }
    };
    
    return ViCoWaLogin;
});
