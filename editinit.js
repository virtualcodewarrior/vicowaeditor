// Assign the vicowa editor to the right domain
//////////////////////////////////////////////////////////////////////////////////

// if we are not nested the vicowa editor must come from the production domain else it must come from develop domain
// this is so we can edit the vicowa editor itself without breaking the production version
(function()
{
	// this will replace the production name in case we are editing the editor itself
    var DevelopHost = "http://localhost",	
    Script = document.createElement("script"),
	Path = document.location.pathname.substring(0, document.location.pathname.lastIndexOf("/") + 1);
	
    // this code will use the items that have been set to replace the items in the hostname for development
    window.ViCowaEditorBaseDomain = (parent && parent.ViCoWaEditor) ? DevelopHost : document.location.protocol + "//" + document.location.host;
    
    Script.src = ViCowaEditorBaseDomain + Path + "third_party/requirejs/require.js";
    Script.setAttribute("data-main", ViCowaEditorBaseDomain + Path + "main.js");
    
    document.getElementsByTagName("head")[0].appendChild(Script);
})();

