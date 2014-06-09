// show a dialog that shows the difference between the first file and the second file
define([
		"jquery",
		"diffview", 
		"jquery.ui", 
		"jquery.spin",
	    "jquery.vicowa.addcss"
		], function($, diffview)
{
    var DiffContainer = null,
    $LockedScrollCheck = null,
    Defaults1 = { title: "first file", content: "" },
    Defaults2 = { title: "second file", content: "" },
    DiffPositions = [],
    CurrentDiffPosition = 0,
    diffjump = false,
    $NextButton = null,
    $PrevButton = null,
    diffViewerWindow = null;
    
    function initializeDiffer(p_Callback)
    {
        $.addcss(['third_party/jsdifflib/1.0/diffview.css', 'filediff.css']);
    }
    
    function doShowDiff(p_FirstFileInfo, p_SecondFileInfo)
    {
        p_FirstFileInfo = $.extend({}, Defaults1, (typeof p_FirstFileInfo == "object") ? p_FirstFileInfo : { content: p_FirstFileInfo });
        p_SecondFileInfo = $.extend({}, Defaults2, (typeof p_SecondFileInfo == "object") ? p_SecondFileInfo : { content: p_SecondFileInfo });
        
        diffViewerWindow = diffview(
        {
            baseTextLines: p_FirstFileInfo.content,
            newTextLines: p_SecondFileInfo.content,
            baseTextName: p_FirstFileInfo.title,
            newTextName: p_SecondFileInfo.title,
            targetHTML: DiffContainer,
            inline: false,
            fatal: -1,
            isSyncScroll: function(){ var LastDiffJump = diffjump; diffjump = false; return $LockedScrollCheck.is(":checked") || LastDiffJump; }
        });

        function TopToBottomSort(p_First, p_Second)
        { 
            return p_First.offsetTop - p_Second.offsetTop; 
        }
        
        var LeftCount = [];
        var LeftList = [];
        var RightCount = [];
        var RightList = [];
        DiffPositions = [];

        do 
        {
            LeftCount = $("#count-container-left [diff='" + (DiffPositions.length + 1) + "']");
            LeftList = $("#scroller-left [diff='" + (DiffPositions.length + 1) + "']");
            RightCount = $("#count-container-right [diff='" + (DiffPositions.length + 1) + "']");
            RightList = $("#scroller-right [diff='" + (DiffPositions.length + 1) + "']");
            
            if (LeftCount.length)
            {
                DiffPositions.push(LeftCount[0].offsetTop);
                
                LeftCount.sort(TopToBottomSort);
                LeftList.sort(TopToBottomSort);
                RightCount.sort(TopToBottomSort);
                RightList.sort(TopToBottomSort);
                
                $(LeftCount[0]).addClass("top");
                $(LeftList[0]).addClass("top");
                $(RightCount[0]).addClass("top");
                $(RightList[0]).addClass("top");

                $(LeftCount[LeftCount.length - 1]).addClass("bottom");
                $(LeftList[LeftList.length - 1]).addClass("bottom");
                $(RightCount[RightCount.length - 1]).addClass("bottom");
                $(RightList[RightList.length - 1]).addClass("bottom");
            }
        }
        while(LeftCount.length);
        
        if (DiffPositions.length > 0)
        {
            HandleFindDiffMatch(CurrentDiffPosition);
        }
        
        updateButtons(CurrentDiffPosition);
    }
    
    function updateButtons(p_CurrentDiffPosition)
    {
        if (diffViewerWindow === null || CurrentDiffPosition >= DiffPositions.length - 1)
        {
            $NextButton.attr('disabled', 'disabled');
        }
        else
        {
            $NextButton.removeAttr('disabled');
        }
        if (diffViewerWindow === null || CurrentDiffPosition === 0)
        {
            $PrevButton.attr('disabled', 'disabled');
        }
        else
        {
            $PrevButton.removeAttr('disabled');
        }
    }

    function scrollTo(p_Position)
    {
        diffjump = true;
        $("#scroller-left")[0].scrollTop = Math.max(0, p_Position - $("#scroller-left").height()/2);
    }
    
    function HandleFindDiffMatch(p_CurrentIndex)
    {
        scrollTo(DiffPositions[p_CurrentIndex]);
        $(".differ .highlighted").removeClass("highlighted");
        $(".differ [diff='" + (p_CurrentIndex + 1)  + "']").addClass("highlighted");
    }

    function createDialog()
    {
        var $DiffDialogSource = $("<div class='differ'/>"),
        $LegendBox = $('<div class="default legend"><table class="diff"><thead><tr><th colspan="3">Legend</th></tr></thead><tbody><tr><td class="insert">Inserted line</td><td class="replace">Modified line</td><td class="delete">Deleted line</td></tr></tbody></table></div>').appendTo($DiffDialogSource);
        $NextButton = $('<input id="next" type="button" value="Next difference"/>').appendTo($DiffDialogSource).click(function()
        {
            if (CurrentDiffPosition < DiffPositions.length - 1)
            {
                CurrentDiffPosition++;
                HandleFindDiffMatch(CurrentDiffPosition);
            }
            
            updateButtons(CurrentDiffPosition);
        });
        $PrevButton = $('<input id="prev" type="button" value="Previous difference"/>').attr('disabled', 'disabled').appendTo($DiffDialogSource).click(function()
        {
            if (CurrentDiffPosition > 0)
            {
                CurrentDiffPosition--;
                HandleFindDiffMatch(CurrentDiffPosition);
            }
            updateButtons(CurrentDiffPosition);
        });
        $LockedScrollCheck = $('<input id="lockedscrollchk" type="checkbox" checked="" value="lockedscroll" /><span>Sync scrollbars</span>').appendTo($DiffDialogSource);
        $DiffContainer = $('<div id="cmpArea" class="default">').appendTo($DiffDialogSource);
        
        var $DiffDialog = $DiffDialogSource.dialog(
        {
            modal: true,
            title: 'File differences',
            width: $(window).width() * 0.8,
            height: $(window).height() * 0.8,
            buttons: 
            [
                {
                    text: $.i18n._("Close"),
                    click: function()
                    {
                        $DiffDialog.remove();
                    }
                }
            ],
            resize: function(){}
        });
        
        DiffContainer = $DiffContainer[0];
        updateButtons(CurrentDiffPosition);
    }
    
    return {
        showAndWait : function()
        {
            initializeDiffer(function()
            {
                createDialog();
                $(DiffContainer).spin();
            });
            
            return function(p_FirstFileInfo, p_SecondFileInfo){ $(DiffContainer).spin(false); doShowDiff(p_FirstFileInfo, p_SecondFileInfo); };
        },
        showDirect : function(p_FirstFileInfo, p_SecondFileInfo)
        {
            initializeDiffer(function()
            {
                createDialog();
                doShowDiff(p_FirstFileInfo, p_SecondFileInfo);
            });
        }
    };
});