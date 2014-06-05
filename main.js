// Entry point for require
///////////////////////////////////////////////////////////

require.config(
{
    paths:
    {
        library : ViCowaEditorBaseDomain + "/raw/shared/core/library",
        apps : ViCowaEditorBaseDomain + "/raw/shared/apps",
        core : ViCowaEditorBaseDomain + "/raw/shared/core",
        jquery: ViCowaEditorBaseDomain + "/raw/shared/core/library/jquery/jquery",
        jqueryplugin: ViCowaEditorBaseDomain + "/raw/shared/core/library/jquery/plugins",
        ace: "ace/lib/ace"
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
        'jqueryplugin/jquery.rloader/jquery.rloader' : ['jquery'],
        'jqueryplugin/jquery.svg/jquery.svg' : ['jquery'],
        'jqueryplugin/jquery.tablesorter/jquery.tablesorter' : ['jquery'],
        'jqueryplugin/jquery.tree/jquery.tree' : ['jquery'],
        'jqueryplugin/jquery.url/jquery.url' : ['jquery'],
        'jqueryplugin/jquery.noty/jquery.noty' : ['jquery'],
        'jqueryplugin/jquery.noty/layouts/bottom' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/bottomCenter' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/bottomLeft' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/bottomRight' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/center' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/centerLeft' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/centerRight' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/inline' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/top' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/topCenter' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/topLeft' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/layouts/topRight' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.noty/themes/default' : ['jqueryplugin/jquery.noty/jquery.noty'],
        'jqueryplugin/jquery.ui/js/jquery.ui' : ['jquery'],
        'jqueryplugin/jquery.ui.touch-punch/jquery.ui.touch-punch' : ['jqueryplugin/jquery.ui/js/jquery.ui'],
        'jqueryplugin/jquery.jqgrid/js/jquery.jqGrid' : ['jquery', 'jqueryplugin/jquery.jqgrid/js/i18n/grid.locale-en'],
        'library/amplify/amplify' : ['jquery'],
    },
    waitSeconds: 30
});

require(["ViCoWaEditor"], function(ViCoWa)
{
    $("<link>", 
    {
        type: "text/css",
        rel: "stylesheet",
        href: ViCowaEditorBaseDomain + "/raw/shared/core/library/jquery/plugins/jquery.jqgrid/css/ui.jqgrid.css"
    }).appendTo($("head"));

});
