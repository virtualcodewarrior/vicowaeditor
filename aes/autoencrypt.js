// A new encryption class used for auto encryption, this class
// will depend on jquery because of that it will be handled seperatly from aes.js
/////////////////////////////////////////////////////////////////////////////

define([
		"jquery", 
	    "aes/aes", 
	    "amplify",
		"jquery.vicowa.addcss"
		], function()
{
	$.addCSS("aes/aes.css");
    
    return {
        m_defaultSettings : 
        {
            decrypttag : "vicowa_decryptsection",
            manualdecrypttag : "vicowa_decrypt",
            encrypttag : "vicowa_encryptsection",
            manualencrypttag : "vicowa_encrypt",
            decryptchecktag : "vicowa_decryptcheck",
            decryptcheckcontent: "decryption check content",
            salt: "vicowa salt",
            iterations: 1221,
            password: null,
            pass: 0,
            timeout: 0,
            bUseTimeout: true,
            bTimeoutSet: false,
            manualencryptpasswords: {}
        },
        getTags : function(p_Tag, p_Content)
        {
            var Matcher = new RegExp("<" + p_Tag + "[^>]*>((?:(?:(?!<" + p_Tag + ">)[^\\0])*?))<\/" + p_Tag + ">", "g"),
            Match, 
            Matches = [];
            
            while ((Match = Matcher.exec(p_Content)) !== null)
            {
                Matches.push(
                {
                    full: Match[0],
                    content: Match[1]
                });
            }
            
            return Matches;
        },
        hasEncryptTargets: function(p_Content)
        {
            return this.getTags(this.m_defaultSettings.encrypttag, p_Content).length || this.getTags(this.m_defaultSettings.manualencrypttag, p_Content).length;            
        },
        doDecrypt : function(p_Content, p_Settings, p_Callback)
        {
            var Settings = $.extend(true, {}, this.m_defaultSettings, p_Settings);

            // use the given password or retrieve the stored password
            var Password = Settings.password || amplify.store("password");
            var Failed = false;
            
            if (Password)
            {
                var Tags = this.getTags(Settings.decrypttag, p_Content);
                var OriginalContent = "";
                Failed = Password.length < 5 && Tags.length !== 0;
                
                if (!Failed && Tags.length)
                {
                    while (Tags.length > 0 && OriginalContent != p_Content)
                    { 
                        var DecryptInfo = [],
                        DecryptStrings = [];
                        
                        OriginalContent = p_Content;
        
                        for (var Index = 0; Index < Tags.length; Index++)
                        {
                            DecryptInfo.push(
                            {  
                                original:       Tags[Index].full,
                                decryptsource:  Tags[Index].content,
                                decrypttarget:  "",
                                failed: false
                            });
                            
                            DecryptStrings.push(Tags[Index].content);
                        }
        
                        var Data = DoArrayDecryptDirect(DecryptStrings, Password, Settings.salt, Settings.iterations);
                        
                        if (DecryptInfo.length == Data.length)
                        {
                            for (Index = 0; Index < Data.length; Index++)
                            {
                                DecryptInfo[Index].decrypttarget = Data[Index];
                            }
                        }   
                        
                        for (Index = 0; Index < DecryptInfo.length; Index++)
                        {
                            Tags = this.getTags(Settings.decryptchecktag, DecryptInfo[Index].decrypttarget);
                            
                            if (Tags.length == 1 && Tags[0].content == Settings.decryptcheckcontent)
                            {
                                var TestTagReplacer = new RegExp(Tags[0].full, "g");
                                DecryptInfo[Index].decrypttarget = DecryptInfo[Index].decrypttarget.replace(TestTagReplacer, "");
                                var EncryptedReplacer = new RegExp(DecryptInfo[Index].original, "g");
                                p_Content = p_Content.replace(DecryptInfo[Index].original, DecryptInfo[Index].decrypttarget);
                            }
                            else
                            {
                                Failed = true;
                            }
                        }
                        Tags = this.getTags(Settings.decrypttag, p_Content);
                    }
                }
            }
            // some items failed to decrypt, we have to ask for an alternate password
            if (Failed)
            {
                // failed to decrypt have to put up dialog                    
                this.doDialog(true, Settings, p_Content, p_Callback);
            }
            else
            {
                if (Settings.decrypttag != Settings.manualdecrypttag)
                {
                    // handle manual encrypted data 
                    this.doDecrypt(p_Content, $.extend({}, Settings, 
                        { 
                            password: "1", // force the dialog
                            timeout: 5,
                            decrypttag : Settings.manualdecrypttag 
                        }), function(p_UnencryptedContent, p_Result, p_DecryptInfo)
                    {
                        p_Callback(p_UnencryptedContent, p_Result, p_DecryptInfo);
                    });
                }
                else
                {
                    p_Callback(p_Content, true, { timeout: Settings.timeout, bTimeoutSet: Settings.bTimeoutSet });
                }
            }
        },
        doEncrypt : function(p_Content, p_Settings, p_Callback)
        {
            var Settings = $.extend(true, {}, this.m_defaultSettings, p_Settings);
            var This = this;

            if (typeof String.prototype.insert == "undefined")
            {
                String.prototype.insert = function (index, string) 
                {
                    return (index <= 0) ? string + this : ((index >= this.length) ? this + string : (this.substring(0, index) + string + this.substring(index, this.length)));
                };
            }
            
            var handleEncrypt = function(p_LocalSettings, p_Content, p_Callback)
            {
                // retrieve the stored password
                var Password = p_LocalSettings.password || amplify.store("password");
                
                if (Password && Password.length > 4)
                {
                    var Tags = This.getTags(p_LocalSettings.encrypttag, p_Content);
                    var OriginalContent = "";
                    
                    while (Tags.length > 0 && OriginalContent != p_Content)
                    { 
                        var EncryptInfo = [],
                        EncryptStrings = [],
                        EncryptCheckTag = "<" + p_LocalSettings.decryptchecktag + " class='encrypted'>" + p_LocalSettings.decryptcheckcontent + "</" + p_LocalSettings.decryptchecktag + ">";
                        
                        OriginalContent = p_Content;
        
                        for (var Index = 0; Index < Tags.length; Index++)
                        {
                            EncryptInfo.push(
                            {  
                                original:       Tags[Index].full,
                                encryptsource:  Tags[Index].full, // we will include the tags in the encryption
                                encrypttarget:  ""
                            });
                            
                            // insert tag in a random location within the content
                            EncryptStrings.push(Tags[Index].full.insert(Math.floor(Math.random()*EncryptInfo[Index].encryptsource.length), EncryptCheckTag));
                        }
        
                        if (p_LocalSettings.encrypttag == p_LocalSettings.manualencrypttag)
                        {
                            p_LocalSettings.manualencryptpasswords["EncryptPass" + p_LocalSettings.pass] = 
                            {
                                password: Password,
                                salt: p_LocalSettings.salt,
                                iterations: p_LocalSettings.iterations
                            };
                        }
                        var Data = DoArrayEncryptDirect(EncryptStrings, Password, p_LocalSettings.salt, p_LocalSettings.iterations);
                        
                        if (EncryptInfo.length == Data.length)
                        {
                            for (Index = 0; Index < Data.length; Index++)
                            {
                                EncryptInfo[Index].encrypttarget = "<" + p_LocalSettings.decrypttag + " class='encrypted'>" + Data[Index] + "</" + p_LocalSettings.decrypttag + ">";
                            }
                        }   
                        
                        for (Index = 0; Index < EncryptInfo.length; Index++)
                        {
                            p_Content = p_Content.replace(EncryptInfo[Index].original, EncryptInfo[Index].encrypttarget);
                        }
                        
                        Tags = This.getTags(p_LocalSettings.encrypttag, p_Content);
                        
                        if (Tags.length && p_LocalSettings.encrypttag == p_LocalSettings.manualencrypttag)
                        {
                            This.doDialog(false, $.extend({}, Settings, 
                            {
                                pass: Settings.pass + 1
                            }), p_Content, p_Callback);
                            
                            break;
                        }
                    }            
                } 
                
                p_Callback(p_Content, true, { manualencryptpasswords: p_LocalSettings.manualencryptpasswords });
            };                    

            if (Settings.encrypttag != Settings.manualencrypttag && this.getTags(Settings.manualencrypttag, p_Content).length)
            {
                var NewPass = "EncryptPass" + (Settings.pass + 1);
                if (Settings.manualencryptpasswords[NewPass])
                {
                    this.doEncrypt(p_Content, $.extend({}, Settings, 
                    {
                        pass: Settings.pass + 1,
                        password: Settings.manualencryptpasswords[NewPass].password,
                        timeout: 0,
                        salt: Settings.manualencryptpasswords[NewPass].salt,
                        iterations: Settings.manualencryptpasswords[NewPass].iterations,
                        encrypttag : Settings.manualencrypttag,
                        decrypttag : Settings.manualdecrypttag 
                    }), function(p_Content, p_Result, p_ResultInfo)
                    {
                        if (p_Result)
                        {
                            handleEncrypt($.extend({}, Settings, p_ResultInfo), p_Content, p_Callback);
                        }
                        else
                        {
                            p_Callback(p_Content, p_Result, p_ResultInfo);
                        }
                    });
                }
                else
                {
                    this.doDialog(false, $.extend({}, Settings, 
                    {
                        pass: Settings.pass + 1,
                        encrypttag : Settings.manualencrypttag,
                        decrypttag : Settings.manualdecrypttag 
                    }), p_Content, function(p_Content, p_Result, p_ResultInfo)
                    {
                        if (p_Result)
                        {
                            handleEncrypt($.extend({}, Settings, p_ResultInfo), p_Content, p_Callback);
                        }
                        else
                        {
                            p_Callback(p_Content, p_Result, p_ResultInfo);
                        }
                    });
                }
            }
            else
            {
                handleEncrypt(Settings, p_Content, p_Callback);
            }
        },
        doDialog : function(p_Decrypt, p_Settings, p_Content, p_Callback)
        {
            var This = this;
            
            require(["jqueryplugin/jquery.i18n/jquery.i18n", "jqueryplugin/jquery.ui/js/jquery.ui"], function()
            {
                // change it so dialog titles can contain html
                $.widget("ui.dialog", $.extend({}, $.ui.dialog.prototype, 
                {
                    _title: function(title) 
                    {
                        if (!this.options.title ) 
                        {
                            title.html("&#160;");
                        } 
                        else
                        {
                            title.html(this.options.title);
                        }
                    }
                }));
            
                if (!$("link[href='/raw/shared/core/library/jquery/plugins/jquery.ui/css/vicowa/jquery-ui.css']").length)
                {
                    $("<link/>", 
                    {
                        type: "text/css",
                        rel: "stylesheet",
                        href: "/raw/shared/core/library/jquery/plugins/jquery.ui/css/vicowa/jquery-ui.css"
                    }).appendTo("head");
                }


                var Settings = $.extend(
                {
                    decrypt: true,
                    pass: 1,
                    timeout: 5,
                    salt: GetDefaultSalt(),
                    iterations: GetDefaultIterations()
                }, p_Settings);
                    
                var $DecryptDialog = $("<div/>"),
                $DivControls = $("<div/>").appendTo($DecryptDialog); // put in the encryption/decryption controls
            
                if (Settings.pass > 1)
                {
                    //// The pass count display section
                    // the DIV that wraps the "Pass:" label
                    var $DivPassContainer = $("<div/>").addClass("control_row").appendTo($DivControls);
                    var $DivPassLabel = $("<div/>").addClass("input_label").appendTo($DivPassContainer);
                    // the actual "Pass:" label
                    var $LabelPass = $("<label/>").html($.i18n._("Decrypt pass:")).appendTo($DivPassLabel);
            
                    // the DIV that wraps the pass count display
                    var $DivPassBox = $("<div/>").addClass("input_field").attr("title", $.i18n._("The number of decryption passes")).html(g_Pass).appendTo($DivPassContainer);
                }
            
                //// The password input section
                // the DIV that wraps the "Password:" label
                var $DivPasswordContainer = $("<div/>").addClass("control_row").appendTo($DivControls);
                var $DivPasswordLabel = $("<div/>").addClass("input_label").appendTo($DivPasswordContainer);
                // the actual "Password:" label
                var $LabelPassword = $("<label/>").html($.i18n._("Password:")).appendTo($DivPasswordLabel);
                // the DIV that wraps the password input box
                var $DivPasswordBox = $("<div/>").addClass("input_field").appendTo($DivPasswordContainer);
                // the actual password input field    
                var $InputPassword = $("<input/>").attr("type", "password").attr("title", $.i18n._("Password used for en/decrypting your text")).attr("value", "").appendTo($DivPasswordBox),
                $InputTimeout = $("<input type='text'></input>").attr("title", $.i18n._("Time in minutes before the page is refreshed and the content is once again encrypted. Enter 0 for no timeout")).attr("value", Settings.timeout), 
                $InputSalt = $("<input type='text'></input>").attr("title", $.i18n._("Salt used for creating the encryption key and IV value.")).attr("value", Settings.salt),
                $InputIterations = $("<input type='text'></input>").attr("title", $.i18n._("Iterations used for creating the encryption key and IV value.")).attr("value", Settings.iterations);
            
                if (p_Decrypt && Settings.bUseTimeout)
                {
                    //// The timeout input section
                    var $DivTimeoutContainer = $("<div></div>").addClass("control_row").appendTo($DivControls);
                    // the DIV that wrappes the "Timeout:" label
                    var $DivTimeoutLabel = $("<div></div>").addClass("input_label").appendTo($DivTimeoutContainer);
                    // the actual "Timeout:" label
                    var $LabelTimeout = $("<label></label>").html($.i18n._("Timeout:")).appendTo($DivTimeoutLabel);
            
                    // the DIV that wraps the timeout input box
                    var $DivTimeoutBox = $("<div></div>").addClass("input_field").appendTo($DivTimeoutContainer);
                    // the actual timeout input field    
                    //"Time in minutes before the page is refreshed and the content is once again encrypted. Enter 0 for no timeout";
                    $InputTimeout.appendTo($DivTimeoutBox); // when editing set to 0 so no time out else default to 5 minute time out
                }
                // only add the advanced controls when advanced controls was enabled
                if (HasAdvancedEncryption())
                {
                    ///// The check box to enable and disable the advanced options
                    var $DivAdvancedCheckContainer = $("<div></div>").addClass("control_row").appendTo($DivControls);
                    // The div that wraps the check box
                    var $DivAdvancedEnable = $("<div></div>").addClass("input_field advanced").appendTo($DivAdvancedCheckContainer);
                    // The actual check box
                    var $CheckAdvanced = $("<input type='checkbox'></div>").attr("title", $.i18n._("Enabling this option will allow you to enter your own salt and number of iterations")).click(ToggleAdvancedEnabled).appendTo($DivAdvancedEnable);
                    // The label for the advanced check box 
                    var LabelAdvanced = $("<label></label>").attr("for", "clientside_encryption_advanced").html($.i18n._("Use advanced options")).attr("title", $.i18n._("Enabling this option will allow you to enter your own salt and number of iterations")).appendTo($DivAdvancedEnable);
                        
                    ///// The Salt input
                    var $DivSaltContainer = $("<div></div>").addClass("control_row").appendTo($DivControls);
                    // The div that wraps the "Salt:" label
                    var $DivSaltLabel = $("<div></div>").addClass("input_label advanced").appendTo($DivSaltContainer);
                    // The actual "Salt:" label
                    var $LabelSalt = $("<label></label>").attr("for", "clientside_encryption_salt").html($.i18n._("Salt")).appendTo($DivSaltLabel);
            
                    // the div that wraps the salt input
                    var $DivSaltBox = $("<div></div>").addClass("input_field advanced").appendTo($DivSaltContainer);
                    // the salt input box
                    $InputSalt.appendTo($DivSaltBox);
            
                    ///// Iterations input
                    var $DivIterContainer = $("<div></div>").addClass("control_row").appendTo($DivControls);
                    // the div that wraps the "Iterations:" label
                    var $DivIterationsLabel = $("<div></div>").addClass("input_label advanced").appendTo($DivIterContainer);
                    // The actual "Iterations:" label
                    var $LabelIterations = $("<label></label>").attr("for", "clientside_encryption_iterations").html($.i18n._("Iterations:")).appendTo($DivIterationsLabel);
                    // the DIV that wraps the Iterations input field
                    var $DivIterationsBox = $("<div></div>").addClass("input_field advanced").appendTo($DivIterContainer);
                    // the actual Iterations input field
                    $InputIterations.appendTo($DivIterationsBox);
                }
            
                var Controls = 
                {
                    password: $InputPassword,
                    timeout: $InputTimeout,
                    salt: $InputSalt,
                    iterations: $InputIterations
                };
            
                var $Title = $("<div></div>").html($.i18n._("Encrypted content detected"));
                // add some information in about encrypted content or content to encrypt
                $("<span></span>").addClass("decryptinfo").html("?").attr("title", $.i18n._("This document contains encrypted information. Provide the correct decryption information and press 'Decrypt' to decrypt this information. Or press 'Cancel' to leave the information encrypted (refresh the page to decrypt at a later time)")).appendTo($Title);
            
                $DecryptDialog.dialog(
                {
                    title: $Title,
                    dialogClass: "autodecrypt",
                    open: function()
                    {
                        $(this).on("keyup", function(e) 
                        {
                            if (e.keyCode === 13) 
                            {
                                $('.ok-button', $(this).parent()).first().click();
                            }
                        });
                    },
                    modal: true,
                    buttons: 
                    [
                        // The action button
                        {
                            text: (p_Decrypt) ? $.i18n._("Decrypt") : $.i18n._("Encrypt"),
                            title: (p_Decrypt) ? $.i18n._("Decrypt the current page") : $.i18n._("Encrypt the current page"),
                            class: "ok-button",                
                            click: function()
                            {
                                $DecryptDialog.remove();
                                $DecryptDialog = null;
                                if (p_Decrypt)
                                {
                                    This.doDecrypt(p_Content, $.extend({}, Settings, 
                                    {
                                        pass: Settings.pass + 1,
                                        password: Controls.password.attr("value"),
                                        timeout: (Settings.bUseTimeout) ? parseInt(Controls.timeout.attr("value"), 10) : 0,
                                        bTimeoutSet: (Settings.bUseTimeout) ? parseInt(Controls.timeout.attr("value"), 10) !== 0 : false,
                                        salt: Controls.salt.attr("value"),
                                        iterations: parseInt(Controls.iterations.attr("value"), 10)
                                    }), p_Callback);
                                }
                                else
                                {
                                    This.doEncrypt(p_Content, $.extend({}, Settings, 
                                    {
                                        password: Controls.password.attr("value"),
                                        timeout: 0,
                                        salt: Controls.salt.attr("value"),
                                        iterations: parseInt(Controls.iterations.attr("value"), 10)
                                    }), p_Callback);
                                }
                            }
                        },
                        // the cancel button
                        {
                            text: $.i18n._("Cancel"),
                            title: $.i18n._("Do not decrypt the current page and leave the texts encrypted"),
                            click: function()
                            {
                                // create the cancel button, if clicked will just close the dialog and do nothing else
                                $DecryptDialog.remove();
                                $DecryptDialog = null;
                                p_Callback(p_Content, false);
                            }
                        }
                    ],
                    width: 240,
                    height: 260,
                    minWidth: 240,
                    minHeight: 260
                });
            
                ToggleAdvancedEnabled();
            });
        },
        setDefaultSettings : function(p_Settings)
        {
			this.m_defaultSettings = $.extend(true, this.m_defaultSettings, p_Settings);
        }
    };
});

//@ sourceURL="autoencrypt.js"
