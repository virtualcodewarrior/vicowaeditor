// vicowagit.js - This file is part of the ViCoWa editor
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
        "filediff", 
        "jquery.jqgrid",
        "jquery.spin", 
        "jquery.ui", 
        "jquery.vicowa.servertree",
		"jquery.vicowa.addcss"
//      "library/jquery/jquery.migrate",
        ], function($, DiffDialog)
{
	"use strict";

    $.addCSS(["third_party/jqgrid/4.6.0/css/ui.jqgrid.css"]);

	var ViCowaGitBaseDomain = "";

    /// ask for a description for the commit
    /// @param p_Options : Additional options for this dialog as an object with the following elements : 
    ///     title: <string with your custom title>, defaults to: Commit selected files
    ///     okbuttontext: <string with your custom ok button text>, defaults to: Commit
    ///     callback: <function(p_Result)>, defaults to null, this should be set to something meaningful in order to work with this dialog. 
    ///        The p_Result parameter passed to this callback will contain the following : 
    ///             result: will be true when the usre pressed ok or false otherwise
    ///             summary: will be undefined when the customer canceled and will contain the customer entered summary when the customer pressed ok
    ///             description: will be undefined when the customer canceled and will contain the customer entered description when the customer pressed ok
    function commitDescriptionDialog(p_Options)
    {
        var Options = $.extend({}, 
        {
            title: $.i18n._("Commit selected files"),
            okbuttontext: $.i18n._("Commit"),
            callback: null
        }, p_Options);
        var $CommitDescriptionDialog = $("<div/>").addClass("commitdlg").appendTo($("body"));
        $("<div/>").text("Description").addClass("desctext").appendTo($CommitDescriptionDialog);
        $Description = $("<textarea/>").addClass("description").appendTo($CommitDescriptionDialog);
        
        $CommitDescriptionDialog.dialog(
        {
            modal: true,
            title: Options.title,
            height: 280,
            buttons: [
                {
                    text: Options.okbuttontext,
                    click: function()
                    {
                        var Results = { result: true, description: $Description.val() };
                        $CommitDescriptionDialog.remove();
                        if (Options.callback)
                        {
                            Options.callback(Results);
                        }
                    }
                },
                {
                    text: $.i18n._("Cancel"),
                    click: function()
                    {
                        var Results = { result: false };
                        $CommitDescriptionDialog.remove();
                        if (Options.callback)
                        {
                            Options.callback(false);
                        }
                    }
                }
            ]
        });
    }
    
    function pollingLoop(p_ServerData)
    {
        var ServerData = $.extend({ type: "POST", cache: false, handleresult: function(){ return true; }, handleerror: function(){ return false; } }, p_ServerData);

        function PollingCall(p_RequestData)
        {
            $.ajax({
                url: ServerData.url,
                data: { json: JSON.stringify(p_RequestData) },
                dataType: 'json',
                type: ServerData.type,
                cache: ServerData.cache,
                success: function(p_Data)
                {
                    if (ServerData.handleresult(p_Data))
                    {
                        // more data to retrieve ??
                        if (p_Data.serverstatus != "complete")
                        {
                            // call this again
                            PollingCall(p_Data);   
                        }
                    }
                },
                error: function(p_Request, p_ResultText, p_ExceptionText)
                {
                    if (ServerData.handleerror(p_ResultText, p_ExceptionText))
                    {
                        // retry with request data
                        PollingCall(p_RequestData);   
                    }
                }
            });
        }
        
        PollingCall(ServerData.data);
    }

    /// Will execute the following in order : 
    /// 1. First Checkin any modified changes in the production branch (e.g. changed user data)
    /// 2. Push the checked in files to the main repository
    /// 3. Pull the main repository into the development branch
    /// 4. Checking any pending changes in the development branch
    /// 5. Push the checkin results to the main repository
    /// 6. Pull the main repository into the production branch
    /// @param p_Callback : optional callback function that will be called after this function has completed either successful or unssuccessful
    function publishAll(p_Callback)
    {
        // request a description
        commitDescriptionDialog({ title: $.i18n._("Publish all"), okbuttontext: $.i18n._("Publish"), callback : function(p_Result)
        {
            if (p_Result.result)
            {
                // create a progress dialog
                var $ProgressDialog = $("<div/>").addClass("progressdialog").appendTo($("body"));
                $("<div/>").text("Currently: ").addClass("progresstext").appendTo($ProgressDialog);
                var $ProgressText = $("<div/>").text("Checking for changes in the production branch ...").addClass("progresstext").appendTo($ProgressDialog),
                $SpinContainer = $("<div/>").addClass("progressspinnercontainer").appendTo($ProgressDialog);

                Abort = false;
                
                $ProgressDialog.dialog(
                {
                    modal: true,
                    title: $.i18n._("Publishing progress"),
                    height: 280,
                    buttons: [
                        {
                            text: $.i18n._("Abort"),
                            click: function()
                            {
                                Abort = true;
                                $ProgressText.text($.i18n._("Waiting for the current step to complete ..."));
                            }
                        }
                    ],
                    open: function()
                    {
                        $SpinContainer.spin();
                    }
                });
                
                // this can take a while and we would like to have some progress reports along the way
                pollingLoop(
                {
                    url: ViCowaGitBaseDomain + '/versioncontrol',
                    data: 
                    {
                            action: 'publishall',
                            description: p_Result.description
                    },
                    type: 'POST',
                    cache: false,
                    handleresult: function(p_Data) 
                    {
                        $ProgressText.html(p_Data.progresstext.replace("\n", "<br />"));
                        
                        if (p_Data.serverstatus == "complete")
                        {
                            $SpinContainer.spin(false);
                            $ProgressDialog.remove();

                            if (p_Callback)
                            {
                                p_Callback(true);        
                            }
                        }
                        else if (p_Data.serverstatus == "error" || !p_Data.serverstatus)
                        {
                            Abort = true;
                        }
                        
                        if (Abort)
                        {
                            $SpinContainer.spin(false);
                            $ProgressDialog.remove();
                        }
                        
                        return !Abort;
                    },
                    handleerror: function(p_ErrorStatus, p_ErrorException) 
                    {
                        alert($.i18n._("Error: ") + p_ErrorStatus + " " + p_ErrorException);
                        // we had an error, call the callback with false
                        if (p_Callback)
                        {
                            p_Callback(false);        
                        }
                        
                        return false;
                    }
                });
            }
        }});
    }

    var $PendingTable = null,
    $SubmittedTable = null;

    var MainDialog = function(p_ViCowaGitBaseDomain)
    {
        ViCowaGitBaseDomain = p_ViCowaGitBaseDomain || "";
//        require(["jquery.tree", "jquery.cookie"], function()
        {
			$.addCSS([ "vicowagit.css", "third_party/jquery-ui/1.10.4/themes/cupertino/jquery-ui.css"]);
/*			$.addCSS();
            if (!$("link[href='" + ViCowaGitBaseDomain + "/raw/shared/core/library/jquery/plugins/jquery.tree/jqtree.css']").length)
            {
                $("<link/>", 
                {
                    type: "text/css",
                    rel: "stylesheet",
                    href: ViCowaGitBaseDomain + "/raw/shared/core/library/jquery/plugins/jquery.tree/jqtree.css"
                }).appendTo("head");
            }*/
            
            var $DialogSource = $("<div/>"),
            $DivContent = $("<div/>").addClass("sourcecontrol").addClass("table").appendTo($DialogSource),
            $DivContentRow = $("<div/>").addClass("row").appendTo($DivContent),
            $WorkspaceTree = $("<div/>").addClass("workspacetree").addClass("cell").appendTo($DivContentRow),
            $DataViewTabs = $("<div/>").addClass("tabs").appendTo($("<div/>").addClass("cell").appendTo($DivContentRow)),
            $TabsList = $("<ul/>").appendTo($DataViewTabs);
            $("<span/>").text("pending").appendTo  ($("<a/>", { href: "#pending-tab"}).appendTo($("<li/>").appendTo($TabsList)));
            $("<span/>").text("submitted").appendTo($("<a/>", { href: "#submitted-tab"}).appendTo($("<li/>").appendTo($TabsList)));
            $("<span/>").text("history").appendTo  ($("<a/>", { href: "#history-tab"}).appendTo($("<li/>").appendTo($TabsList)));
            buildPendingTabPage($DataViewTabs);
            buildCommittedTabPage($DataViewTabs);
            var $HistoryGrid = buildHistoryTabPage($DataViewTabs);

            $("<div/>").addClass("ui-widget ui-widget-content ui-corner-all").servertree(
			{
				
			},
			{
				onselect : function(p_Object, p_MetaData)
				{
					$HistoryGrid.clearGridData();
					$('#load_history-table').show();
					if (p_MetaData && p_MetaData.gitpath)
					{
						// show history for the given path
						getFileRevisionsInfo(p_MetaData.gitpath, function(p_RevisionInfo)
						{
							$('#load_history-table').hide();
							$HistoryGrid.setGridParam({'data': p_RevisionInfo.result, 'userData' : { gitpath: p_MetaData.gitpath }}).trigger('reloadGrid');
						});
					}
				},
			}).appendTo($("<div/>").addClass("container ui-widget ui-widget-content ui-corner-all").appendTo($WorkspaceTree));

            $DataViewTabs.tabs();
            
            var $MainDialog = $DialogSource.dialog(
            {
                modal: true,
                title: 'ViCoWa Git Interface',
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                buttons: 
                [
                    {
                        text: $.i18n._("Auto publish all"),
                        click: function()
                        {
                            publishAll(function(p_Result)
                            {
                                if (p_Result)
                                {
                                    // reload the pending and the committed lists
                                    if ($PendingTable)
                                    {
                                        $PendingTable.trigger("reloadGrid");
                                    }
                                    if ($SubmittedTable)
                                    {
                                        $SubmittedTable.trigger("reloadGrid");
                                    }
                                }
                            });
                        }
                    },
                    {
                        text: $.i18n._("Close"),
                        click: function()
                        {
                            $MainDialog.remove();
                        }
                    }
                ],
                resize: function(){}
            });
        }//);
    };
    
    function getFileRevisionsInfo(p_Path, p_Callback)
    {
        $.ajax(
        {
            url: ViCowaGitBaseDomain + "/versioncontrol",
            data: 
            {
                json: JSON.stringify(
                {
                    action: 'filegetrevisions',
                    path: p_Path,
                })
            },
            dataType: 'json',
            type: 'GET',
            cache: false,
            success: p_Callback,
            error: function() 
            {
                alert($.i18n._("Error: "));
                // we had an error, call the callback with false
                if (p_Callback)
                {
                    p_Callback(false);        
                }
            }
        });
        
    }
    
    function buildPendingTabPage($DataViewTabs)
    {
        var $PendingTab = $("<div/>", { id: "pending-tab"}).appendTo($DataViewTabs),
        $PendingContent = $("<div/>").addClass("pendingcontent").appendTo($PendingTab),
        $PendingMenuBar = $("<div/>").appendTo($PendingContent),
        $TableContainer = $("<div/>").addClass("table-container").appendTo($PendingContent);
        
        $PendingTable = $("<table/>").attr("id", "pending").appendTo($TableContainer);
        
        var $CommitButton = $("<button/>").text("commit").appendTo($PendingMenuBar).click(function()
        {
            var Selected = getSelectedFiles();
            
            // do checkin here
            commitDescriptionDialog({ callback: function(p_Result){} });
        }).button(
        {
            disabled: true
        });
        var $RevertButton = $("<button/>").text("revert").appendTo($PendingMenuBar).click(function()
        {
            var Selected = getSelectedFiles();

            // do revert here
            revertSelected(Selected);
        }).button(
        {
            disabled: true
        });
        
        function getSelectedFiles()
        {
            var Selected = $('#pending').jqGrid('getGridParam', 'selarrrow');
            var Files = [];
            
            if (Selected)
            {
                $.each(Selected, function(p_Index, p_Value)
                {
                    var Selected = $('#pending').jqGrid('getCell', p_Value, "path");
    
                    Files.push(Selected);
                });
            }
            
            return Files;
        }

        function statusFormatter(p_Cellvalue, p_Options, p_rowObject)
        { 
            return "<div title='remote " + p_rowObject.remote + "' class='remote " + p_rowObject.remote + "'></div><div title='local " + p_rowObject.local + "' class='local " + p_rowObject.local + "'></div>";
        }
        
        function fileCommandsFormatter(p_Cellvalue, p_Options, p_rowObject)
        { 
            return "<span class='command-menu' title='Menu'>M</span><span class='command-diff-against-previous' path='" + p_rowObject.path + "' title='Show differences with current revision'>D</span>";
        }
        
        $PendingTable.jqGrid(
        {
            url: ViCowaGitBaseDomain + "/versioncontrol",
            datatype: "json",
            mtype: "GET",
            prmNames:
            {
                page: "page",
                rows: "records_per_page",
                sort: null,
                order: null,
                search: null,
                nd: null,
                id: null                
            },
            postData: 
            {
                json: JSON.stringify(
                {
                    action: 'status'
                })
            },
            colNames: ["Status", "Actions", "Files"],
            colModel: [
                { name: 'local', index: 'local', formatter: statusFormatter, width: 60 },
                { name:"commands", index: "commands", width: 50, formatter: fileCommandsFormatter, sortable: false },
                { name: 'path', index: 'path', width: 600 }
            ],
            jsonReader: 
            {
                repeatitems: true,
                id: function(p_Obj){},
                page: function(p_Obj){ return 1; },
                total: function(p_Obj){ return 1; },
                records: function(p_Obj){ return p_Obj.result.length; },
                root: function(p_Obj){ return p_Obj.result; },
            },
            caption: 'Pending changes',
            altRows: true,
            ignoreCase: true,
            rowNum: 2000000000,
            multiselect: true,
            onSelectRow: function(p_RowID, p_Status, p_Event)
            {
                updateButtons();
            },
            onSelectAll: function(p_RowIDs, p_Status)
            {
                updateButtons();
            },
            gridComplete: function()
            {
                $("#pending .command-menu").off("click");
                $("#pending .command-diff-against-previous").off("click");
                $("#pending .command-menu").on("click", function(p_Event){ p_Event.preventDefault(); alert("menu"); return false; });
                $("#pending .command-diff-against-previous").on("click", function(p_Event)
                { 
                    p_Event.preventDefault();
                    var FilePath = $(this).attr("path");
                    
                    var showDiff = DiffDialog.showAndWait();
                    
                    getFileRevisionsInfo(FilePath, function(p_RevisionsData)
                    {
                        if (p_RevisionsData.result && p_RevisionsData.result.length > 0)
                        {
                            $.ajax(
                            {
                                url: ViCowaGitBaseDomain + "/versioncontrol",
                                data: 
                                {
                                    json: JSON.stringify(
                                    {
                                        action: 'filegetrevisionscontent',
                                        path: FilePath,
                                        revisions: [p_RevisionsData.result[0].hash, 0], // get the current revision and the current disk version, revision numbers count backward from the last commit, so 1 in this case means 1 before the last commit, the special notation -1 means get current version from workspace
                                    })
                                },
                                dataType: 'json',
                                type: 'GET',
                                cache: false,
                                success: function(p_Data) 
                                {
                                    // show a dialog with the difference between the current workspace version aand the HEAD revision for the given file
                                    if (p_Data.result && p_Data.result.length == 2)
                                    {
                                        showDiff(
                                        {
                                            title: FilePath + ":" + p_Data.result[0].revision, 
                                            content: p_Data.result[0].content
                                        }, 
                                        {
                                            title: FilePath + ":current", 
                                            content: p_Data.result[1].content
                                        });
        /*                                  if (p_AutoEncrypt)
                                        {
                                            p_AutoEncrypt.doDecrypt(p_Data.content, { bUseTimeout: false }, function(p_Data)
                                            {
                                                p_Callback({ content : p_Data})
                                            });
                                        }*/
                                    }
                                },
                                error: function() 
                                {
                                    alert($.i18n._("Error: "));
                                    // we had an error, call the callback with false
                                    if (p_Callback)
                                    {
                                        p_Callback(false);        
                                    }
                                }
                            });
                        }
                    });
                    
                    return false; 
                });
                
                $(".ui-jqgrid").css("width", '');
                $(".ui-jqgrid-view").css("width", '');
                $(".ui-jqgrid-hdiv").css("width", '');
                $(".ui-jqgrid-bdiv").css("width", '').css("height", '');
            }
        });
        $(".ui-jqgrid").css("width", '');
        $(".ui-jqgrid-view").css("width", '');
        $(".ui-jqgrid-hdiv").css("width", '');
        $(".ui-jqgrid-bdiv").css("width", '').css("height", '');
        $PendingTable.addClass("contained-table");
        
        updateButtons();

        function updateButtons()
        {
            $CommitButton.button({ disabled: getSelectedFiles().length === 0 });
            $RevertButton.button({ disabled: getSelectedFiles().length === 0 });
        }
    }
    
    function doDiff(p_FilePath, p_Hash1, p_Hash2, p_ShowDiff)
    {
        var Revisions = (p_Hash2) ? [p_Hash1, p_Hash2] : [p_Hash1];
        
        $.ajax(
        {
            url: ViCowaGitBaseDomain + "/versioncontrol",
            data: 
            {
                json: JSON.stringify(
                {
                    action: 'filegetrevisionscontent',
                    path: p_FilePath,
                    revisions: Revisions, // get the current and previous revision, revision numbers count backward from the last commit, so 1 in this case means 1 before the last commit
                })
            },
            dataType: 'json',
            type: 'GET',
            cache: false,
            success: function(p_Data) 
            {
                // show a dialog with the difference between the last and the before last revision
                if (p_Data.result && p_Data.result.length == 2)
                {
                    p_ShowDiff(
                    {
                        title: p_FilePath + ":" + p_Data.result[0].revision, 
                        content: p_Data.result[0].content
                    }, 
                    {
                        title: p_FilePath + ":" + p_Data.result[1].revision, 
                        content: p_Data.result[1].content
                    });
                }
                else if (p_Data.result && p_Data.result.length == 1)
                {
                    p_ShowDiff(
                    {
                        title: p_FilePath + ":" + "No previous revision exists", 
                        content: "<An older revision does not exist>"
                    }, 
                    {
                        title: p_FilePath + ":" + p_Data.result[0].revision, 
                        content: p_Data.result[0].content
                    });
                }
            },
            error: function() 
            {
                alert($.i18n._("Error: "));
                // we had an error, call the callback with false
                if (p_Callback)
                {
                    p_Callback(false);        
                }
            }
        });
    }
    
    function doDiffPrevious(p_FilePath, p_GitHash)
    {
        var showDiff = DiffDialog.showAndWait();

        getFileRevisionsInfo(p_FilePath, function(p_RevisionsData)
        {
            if (p_RevisionsData.result && p_RevisionsData.result.length > 0)
            {
                var StartHashIndex = 0;
                for (; StartHashIndex < p_RevisionsData.result.length; StartHashIndex++)
                {
                    if (p_RevisionsData.result[StartHashIndex].hash == p_GitHash)
                    {
                        break;
                    }
                }
                
                if (StartHashIndex < p_RevisionsData.result.length)
                {
                    if (StartHashIndex + 1 < p_RevisionsData.result.length)
                    {
                        doDiff(p_FilePath, p_RevisionsData.result[StartHashIndex + 1].hash, p_RevisionsData.result[StartHashIndex].hash, showDiff);
                    }
                    else
                    {
                        doDiff(p_FilePath, p_RevisionsData.result[StartHashIndex].hash, null, showDiff);
                    }
                }
            }                                
        });
    }
    
    function buildCommittedTabPage($DataViewTabs)
    {
        var $SubmittedTab = $("<div/>", { id: "submitted-tab"}).appendTo($DataViewTabs),
        $SubmittedContent = $("<div/>").addClass("submittedcontent").appendTo($SubmittedTab),
        $TableContainer = $("<div/>").addClass("table-container").appendTo($SubmittedContent);
        $SubmittedTable = $("<table/>").attr("id", "committed-table").appendTo($TableContainer);

        $SubmittedTable.jqGrid(
        {
            url: ViCowaGitBaseDomain + "/versioncontrol",
            datatype: "json",
            mtype: "GET",
            prmNames:
            {
                page: "page",
                rows: "records_per_page",
                sort: null,
                order: null,
                search: null,
                nd: null,
                id: null                
            },
            postData: 
            {
                json: JSON.stringify(
                {
                    action: 'listcommits'
                })
            },
            jsonReader: 
            {
                repeatitems: true,
                id: function(p_Obj){},
                page: function(p_Obj){ return p_Obj.page; },
                total: function(p_Obj){ return p_Obj.totalpages; },
                records: function(p_Obj){ return p_Obj.totalcommits; },
                root: function(p_Obj){ return p_Obj.result; },
            },
            colNames: ["Author", "Date", "Relative Date", "Description", "Hash"],
            colModel: [
                { name: 'author_name_mailmap', index: 'author_name_mailmap', width: 110},
                { name: 'author_date_ISO8601', index: 'author_date_ISO8601', width: 130, align: 'right', sorttype: 'date', datefmt: 'Y-m-d H:i:s', formatter: 'date', formatoptions: { srcformat: 'Y-m-d H:i:s', newformat: 'Y-m-d H:i:s'}, },
                { name: 'author_date_relative', index: 'author_date_relative', width: 100, align: 'right', sorttype: function(p_Data)
                    { 
                        var Matches = p_Data.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i),
                        val = 0;
                        
                        if (Matches.length > 2)
                        {
                            val = parseInt(Matches[1], 10);
                            switch (Matches[2].toLowerCase())
                            {
                                case "year":    val *= 356; 
                                /*falls through*/
                                case "month":   val *= 30;  
                                /*falls through*/
                                case "week":    val *= 7;
                                /*falls through*/
                                case "day":     val *= 24;
                                /*falls through*/
                                case "hour":    val *= 60;
                                /*falls through*/
                                case "minute":  val *= 60;
                                /*falls through*/
                                case "second":  break;
                            }
                        }
                        
                        return val;
                    }
                },
                { name: 'subject', index: 'subject', width: 300 },
                { name: 'hash', index: 'hash', width: 300 },
            ],
            caption: 'Committed changes',
            altRows: true,
            ignoreCase: true,
            rownumbers: true,
            rowNum: 2000000000, 
            subGrid: true,
            subGridOptions: 
            { 
                "plusicon" : "ui-icon-triangle-1-e",
                "minusicon" :"ui-icon-triangle-1-s",
                "openicon" : "ui-icon-arrowreturn-1-e",
                "reloadOnExpand" : false,
                "selectOnExpand" : true 
            },
            subGridRowExpanded: function(p_subgridid, p_rowid) 
            {
                var Hash = $("#committed-table").jqGrid("getCell", p_rowid, "hash");
                
                function fileCommandsFormatter(p_Cellvalue, p_Options, p_rowObject)
                { 
                    return "<span class='command-menu' title='menu' hash='" + Hash + "'>M</span><span class='command-diff-against-previous' hash='" + Hash + "' path='" + p_rowObject.path + "' title='Show differences with previous revision'>D</span>";
                }
                
                var subGridTableID = p_subgridid + "_t";
                $("#" + p_subgridid).html("<table id='" + subGridTableID + "'></table>");
                $("#" + subGridTableID).jqGrid(
                {
                    url: ViCowaGitBaseDomain + "/versioncontrol",
                    datatype: "json",
                    mtype: "GET",
                    colNames: ['Actions', 'Files'],
                    prmNames:
                    {
                        page: "page",
                        rows: "records_per_page",
                        sort: null,
                        order: null,
                        search: null,
                        nd: null,
                        id: null                
                    },
                    postData: 
                    {
                        json: JSON.stringify(
                        {
                            action: 'listcommittedfiles',
                            hash: Hash
                        })
                    },
                    colModel: [ 
                        { name:"commands", index: "commands", width: 50, formatter: fileCommandsFormatter, sortable: false },
                        { name:"path", index: "path", width: 500 },
                    ], 
                    jsonReader: 
                    {
                        repeatitems: true,
                        id: function(p_Obj){},
                        page: function(p_Obj){ return p_Obj.page; },
                        total: function(p_Obj){ return p_Obj.totalpages; },
                        records: function(p_Obj){ return p_Obj.totalfiles; },
                        root: function(p_Obj){ return p_Obj.result; },
                    },
                    rowNum: 2000000000,
                    height: '100%',
                    gridComplete: function()
                    {
                        $("#committed-table .command-menu").off("click");
                        $("#committed-table .command-diff-against-previous").off("click");
                        $("#committed-table .command-menu").on("click", function(p_Event){ p_Event.preventDefault(); alert("menu"); return false; });
                        $("#committed-table .command-diff-against-previous").on("click", function(p_Event)
                        { 
                            p_Event.preventDefault();
                            doDiffPrevious($(this).attr("path"), $(this).attr("hash"));

                            return false;
                        });
                    }
                });
            },
            gridComplete: function()
            {
                $(".ui-jqgrid").css("width", '');
                $(".ui-jqgrid-view").css("width", '');
                $(".ui-jqgrid-hdiv").css("width", '');
                $(".ui-jqgrid-bdiv").css("width", '').css("height", '');
            }
        });
        $(".ui-jqgrid").css("width", '');
        $(".ui-jqgrid-view").css("width", '');
        $(".ui-jqgrid-hdiv").css("width", '');
        $(".ui-jqgrid-bdiv").css("width", '').css("height", '');
    }
    
    function buildHistoryTabPage($DataViewTabs)
    {
        var $HistoryTab = $("<div/>", { id: "history-tab"}).appendTo($DataViewTabs),
        $HistoryContent = $("<div/>").addClass("historycontent").appendTo($HistoryTab),
        $TableContainer = $("<div/>").addClass("table-container").appendTo($HistoryContent),
        $HistoryTable = $("<table/>").attr("id", "history-table").appendTo($TableContainer);

        function fileCommandsFormatter(p_Cellvalue, p_Options, p_rowObject)
        { 
            return "<span class='command-menu' title='menu' hash='" + p_rowObject.hash + "'>M</span><span class='command-diff-against-previous' hash='" + p_rowObject.hash + "' path='" + p_rowObject.path + "' title='Show differences with previous revision'>D</span>";
        }
        
        var $Grid = $HistoryTable.jqGrid(
        {
            datatype: "local",
            data: [],
            prmNames:
            {
                page: "page",
                rows: "records_per_page",
                sort: null,
                order: null,
                search: null,
                nd: null,
                id: null                
            },
            postData: 
            {
                json: JSON.stringify(
                {
                    action: 'filegetrevisions'
                })
            },
            jsonReader: 
            {
                repeatitems: true,
                id: function(p_Obj){},
                page: function(p_Obj){ return p_Obj.page; },
                total: function(p_Obj){ return p_Obj.totalpages; },
                records: function(p_Obj){ return p_Obj.totalcommits; },
                root: function(p_Obj){ return p_Obj.result; },
            },
            colNames: ["Revision", "Actions", "Author", "Date", "Relative Date", "Description", "Hash"],
            colModel: [
                { name: 'rev', index: 'rev', width: 30},
                { name:"commands", index: "commands", width: 50, formatter: fileCommandsFormatter, sortable: false },
                { name: 'author_name_mailmap', index: 'author_name_mailmap', width: 110},
                { name: 'author_date_ISO8601', index: 'author_date_ISO8601', width: 130, align: 'right', sorttype: 'date', datefmt: 'Y-m-d H:i:s', formatter: 'date', formatoptions: { srcformat: 'Y-m-d H:i:s', newformat: 'Y-m-d H:i:s'}, },
                { name: 'author_date_relative', index: 'author_date_relative', width: 100, align: 'right', sorttype: function(p_Data)
                    { 
                        var Matches = p_Data.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i),
                        val = 0;
                        
                        if (Matches.length > 2)
                        {
                            val = parseInt(Matches[1], 10);
                            switch (Matches[2].toLowerCase())
                            {
                                case "year":    val *= 356; 
                                /*falls through*/
                                case "month":   val *= 30;  
                                /*falls through*/
                                case "week":    val *= 7;
                                /*falls through*/
                                case "day":     val *= 24;
                                /*falls through*/
                                case "hour":    val *= 60;
                                /*falls through*/
                                case "minute":  val *= 60;
                                /*falls through*/
                                case "second":  break;
                            }
                        }
                        
                        return val;
                    }
                },
                { name: 'subject', index: 'subject', width: 300 },
                { name: 'hash', index: 'hash', width: 300 },
            ],
            caption: 'File history',
            altRows: true,
            ignoreCase: true,
            rowNum: 2000000000, 
            subGrid: false,
            gridComplete: function()
            {
                $(".ui-jqgrid").css("width", '');
                $(".ui-jqgrid-view").css("width", '');
                $(".ui-jqgrid-hdiv").css("width", '');
                $(".ui-jqgrid-bdiv").css("width", '').css("height", '');
                
                $("#history-table .command-menu").off("click");
                $("#history-table .command-diff-against-previous").off("click");
                $("#history-table .command-menu").on("click", function(p_Event){ p_Event.preventDefault(); alert("menu"); return false; });
                $("#history-table .command-diff-against-previous").on("click", function(p_Event)
                {
                    p_Event.preventDefault();
                    var Data = $("#history-table").getGridParam('userData');
                    doDiffPrevious(Data.gitpath, $(this).attr("hash"));
                    
                    return false;
                });
            }
        });
        $(".ui-jqgrid").css("width", '');
        $(".ui-jqgrid-view").css("width", '');
        $(".ui-jqgrid-hdiv").css("width", '');
        $(".ui-jqgrid-bdiv").css("width", '').css("height", '');
        
        return $Grid;
    }

    function revertSelected(p_Selected, p_Callback)
    {
        // popup a warning that we are going to revert the given list of files
        var $RevertWarningDialog = $("<div/>").addClass("revertdlg").appendTo($("body"));
        $("<div/>").text("The following files will be reverted and all changes to those files will be lost").addClass("reverttext").appendTo($RevertWarningDialog);
        $RevertList = $("<tbody/>").appendTo($("<table/>").addClass("revertlist").appendTo($RevertWarningDialog));
        
        $.each(p_Selected, function(p_Index, p_File)
        {
            $("<td/>").text(p_File).appendTo($("<tr/>").appendTo($RevertList));
        });
        
        $RevertWarningDialog.dialog(
        {
            modal: true,
            title: "revert files",
            height: 280,
            buttons: [
                {
                    text: $.i18n._("Revert"),
                    click: function()
                    {
                        $RevertWarningDialog.remove();
                        // do revert here
                        
                        // Do a revert of the specified files
                        $.ajax({
                            url: ViCowaGitBaseDomain + '/versioncontrol',
                            data: 
                            {
                                json: JSON.stringify(
                                {
                                    action: 'revert',
                                    files: p_Selected
                                })
                            },
                            dataType: 'json',
                            type: 'POST',
                            cache: false,
                            success: function(p_Data) 
                            {
                                if (p_Data && p_Data.result && !p_Data.result.error) 
                                {
                                    // call the callback if it was set
                                    if (p_Callback !== null)
                                    {
                                        p_Callback(true);        
                                    }
                                } 
                                else if (p_Data && p_Data.result.error) 
                                {
                                    alert($.i18n._("Error: API returned error: %1$s", [p_Data.result.error]));
                                    // we had an error, call the callback with false
                                    if (p_Callback !== null)
                                    {
                                        p_Callback(false);        
                                    }
                                } 
                                else 
                                {
                                    alert($.i18n._("Error: Unknown result from API."));
                                    // we had an error, call the callback with false
                                    if (p_Callback !== null)
                                    {
                                        p_Callback(false);        
                                    }
                                }
                            },
                            error: function() 
                            {
                                alert($.i18n._("Error: Request failed."));
                                // we had an error, call the callback with false
                                if (p_Callback !== null)
                                {
                                    p_Callback(false);        
                                }
                            }
                        });
                        
                    }
                },
                {
                    text: $.i18n._("Cancel"),
                    click: function()
                    {
                        $RevertWarningDialog.remove();
                    }
                }
            ]
        });
    }
    
    /// Checkin all modified, added and deleted items this does a "git add . && git commit -a -m" on the server
    /// @param p_TargetPage : The target page for the save operation
    /// @param p_Content : The data that must be saved
    function doCheckin(p_Callback, p_CheckinDescription) 
    {
        // Do a checkin of all modified, added and deleted items
        $.ajax({
            url: ViCowaGitBaseDomain + '/versioncontrol',
            data: 
            {
                json: JSON.stringify(
                {
                    text: p_Content,
                    action: 'checkin',
                    path: p_TargetPage,
                    summary: p_CheckinDescription
                })
            },
            dataType: 'json',
            type: 'POST',
            cache: false,
            success: function(p_Data) 
            {
                if (p_Data && p_Data.checkin && p_Data.checkin.result === 'Success') 
                {
                    // show popup box for checkin
//					m_SavedNotifyTooltip.innerHTML = $.i18n._("%1$s was successfully saved", [p_TargetPage]);
//					m_SavedNotifyTooltip.className = "saved-notify-popup show";
                    setTimeout(function()
                    {
//						m_SavedNotifyTooltip.className = "saved-notify-popup";
                    }, 500);

                    // call the callback if it was set
                    if (p_Callback !== null)
                    {
                        p_Callback(true);        
                    }
                } 
                else if (p_Data && p_Data.error) 
                {
                    alert($.i18n._("Error: API returned error: %1$s", [p_Data.error]));
                    // we had an error, call the callback with false
                    if (p_Callback !== null)
                    {
                        p_Callback(false);        
                    }
                } 
                else 
                {
                    alert($.i18n._("Error: Unknown result from API."));
                    // we had an error, call the callback with false
                    if (p_Callback !== null)
                    {
                        p_Callback(false);        
                    }
                }
            },
            error: function() 
            {
                alert($.i18n._("Error: Request failed."));
                // we had an error, call the callback with false
                if (p_Callback !== null)
                {
                    p_Callback(false);        
                }
            }
        });
    }
    
    return { 
        startDialog : MainDialog
    };
});

