define([
		"jquery", 
		"jquery.ui", 
		"jquery.vicowa.addcss",
        "jquery.vicowa.servertree",
	   ], function($)
{
	var SelectedNodeInfo = null;
	Result = { status: "cancel" };
	
	return {
		create: function create(p_Options, p_DoneCallback)
		{
			$.addCSS("jquery-ui.css");

			$("<div/>").load("/dialogs/fileopendialog.html .fileopendialog", function()
			{
				var $DialogDiv = $(this).find(".fileopen");
				$DialogDiv.dialog(
				{
					minWidth: 400,
					minHeight: 300,
					modal: true,
					close: function(event, ui) 
					{
						p_DoneCallback(Result);
						$DialogDiv.dialog("destroy");
						$DialogDiv.remove();
					}
				});
				
				$(".fileopen .servertree").servertree({}, 
				{
					onselect: function onselect(p_Tree, p_Event, p_Object, p_Data)
					{
						var $Dialog = $(p_Event.target).closest(".fileopen"),
						Selected = p_Tree.get_selected(true).filter(function(p_Item){ return !p_Item.original.folder; });
						Now = new Date();
						
						// detect double click
						if (Selected.length && SelectedNodeInfo && SelectedNodeInfo.node === p_Object && Now.getTime() - SelectedNodeInfo.clicktime.getTime() < 500)
						{
							$Dialog.find(".open").trigger("click");
						}

						SelectedNodeInfo = { node: p_Object, data: p_Data, clicktime: Now };
						$Dialog.find(".open").prop("disabled", Selected.length === 0);
					},
					ondeselect: function ondeselect(p_Tree, p_Event, p_Object, p_Data)
					{
						var $Dialog = $(p_Event.target).closest(".fileopen"),
						Selected = p_Tree.get_selected();
						
						$Dialog.find(".open").prop("disabled", Selected.length === 0);
					}
				});
				
				$(".fileopen .open").on("click", function()
				{
					var $Dialog = $(this).closest(".fileopen"),
					Selected = $Dialog.find(".servertree").jstree(true).get_selected(true);
					Result = { status: "ok", selected: Selected.map(function(p_Item){ return p_Item.data; }) };

					$DialogDiv.dialog("close");
				})
				
				$(".fileopen .cancel").on("click", function()
				{
					$DialogDiv.dialog("close");
				});
				
				$(".fileopen .all").on("click", function()
				{
					var $Dialog = $(this).closest(".fileopen"),
					Tree = $Dialog.find(".servertree").jstree(true);
					
					if (/expand/i.test($(this).val()))
					{
						Tree.open_all(null, 200);
						$(this).val("collapse all");
					}
					else
					{
						Tree.close_all(null, 200);
						$(this).val("expand all");
					}
				});
			});
		}
	};
});