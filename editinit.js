// Assign the vicowa editor to the right domain
//////////////////////////////////////////////////////////////////////////////////

// if we are not nested the vicowa editor must come from vicowa.com else it must come from develop.vicowa.com
// this is so we can edit the vicowa editor itself without breaking the production version
(function()
{
    var Matches = /[^\.]*\.(.*)/.exec(document.location.host);
    var DomainName = "vicowa.com";
    if (Matches && Matches.length > 1)
    {
        DomainName = Matches[1];
    }
    
    window.ViCowaEditorBaseDomain = (parent && parent.ViCoWaEditor) ? "http://develop." + DomainName : "http://" + DomainName,
    Script = document.createElement("script");
    
    Script.src = ViCowaEditorBaseDomain + "/raw/shared/core/library/require/require.js";
    Script.setAttribute("data-main", ViCowaEditorBaseDomain + "/raw/shared/apps/ViCoWaEditor/main.js");
    
    document.getElementsByTagName("head")[0].appendChild(Script);
})();

