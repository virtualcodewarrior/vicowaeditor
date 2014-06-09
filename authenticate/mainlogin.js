// main.js
/////////////////////////////////////////////////////////////

require.config(
{
    paths:
    {
        library : "/raw/shared/core/library",
        apps : "/raw/shared/apps",
        core : "/raw/shared/core",
        jquery: "/raw/shared/core/library/jquery/jquery",
        jqueryplugin: "/raw/shared/core/library/jquery/plugins"
    },
    shim:
    {
        'library/jquery/jquery.migrate' : ['jquery'],
        'jqueryplugin/jquery.address/jquery.address' : ['jquery'],
        'jqueryplugin/jquery.ba-bbq/jquery.ba-bbq' : ['jquery'],
        'jqueryplugin/jquery.columnizer/jquery.columnizer' : ['jquery'],
        'jqueryplugin/jquery.cookie/jquery.cookie' : ['jquery'],
        'jqueryplugin/jquery.fixedheadertable/jquery.fixedheadertable' : ['jquery'],
        'jqueryplugin/jquery.i18n/jquery.i18n' : ['jquery'],
        'jqueryplugin/jquery.layout/jquery.layout' : ['jquery'],
        'jqueryplugin/jquery.mousewheel/jquery.mousewheel' : ['jquery'],
        'jqueryplugin/jquery.pirobox/jquery.pirobox' : ['jquery'],
        'jqueryplugin/jquery.printelement/jquery.printelement' : ['jquery'],
        'jqueryplugin/jquery.rloader/jquery.rloader' : ['jquery'],
        'jqueryplugin/jquery.svg/jquery.svg' : ['jquery'],
        'jqueryplugin/jquery.tablesorter/jquery.tablesorter' : ['jquery'],
        'jqueryplugin/jquery.tree/jquery.tree' : ['jquery'],
        'jqueryplugin/jquery.url/jquery.url' : ['jquery'],
        'jqueryplugin/jquery.ui/js/jquery.ui' : ['jquery'],
        'jqueryplugin/jquery.ui.touch-punch/jquery.ui.touch-punch' : ['jqueryplugin/jquery.ui/js/jquery.ui'],
        'library/amplify/amplify' : ['jquery'],
        'library/history/scripts/bundled/html4html5/jquery.history' : ['jquery']
    }
});

require(
    [
        'login'
    ], function(ViCoWaLogin)
{
    $("<link>", { type: "text/css", rel: "stylesheet", href: "/raw/shared/core/vicowa.css" }).appendTo($("head"));
//    $("<link>", { type: "text/css", rel: "stylesheet", href: "/remote-vicowa/raw/vicowacom.css" }).appendTo($("head"));
    
    $(document).ready(function()
    {
        ViCoWaLogin.isLoggedIn(function(p_Data)
        {
            if (p_Data.authorized)
            {
                $('#usernamecontainer').html(p_Data.username);
                var $passwordcontainer = $('#passwordcontainer');
                $passwordcontainer.empty();
                $("<div/>").addClass("cell").text("Logged in since").appendTo($passwordcontainer);
                $("<div/>").addClass("cell").text(p_Data.logintime).appendTo($passwordcontainer);
                var $timeoutcontainer = $('#timeoutcontainer');
                $timeoutcontainer.empty();
                $("<div/>").addClass("cell").text("Last activity").appendTo($timeoutcontainer);
                $("<div/>").addClass("cell").text(p_Data.lastactive).appendTo($timeoutcontainer);
                var $buttoncontainer = $('#buttoncontainer');
                $buttoncontainer.empty();
                $('<input id="logout" type="button" value="logout"/>').appendTo($buttoncontainer).click(function()
                {
                    ViCoWaLogin.logout(function()
                    {
                        location.reload();
                    });
                });
				$('<div/>').text("This page will go back to the previous page in 10 seconds.").appendTo($('body'));
				setTimeout(function()
				{
					history.back();
				}, 10000);
            }
            else
            {
                ViCoWaLogin.ensureLoggedIn(function()
                {
					history.back();
                },
                null,
                null,
                null,
                2592000);
            }
        });
    });
});
