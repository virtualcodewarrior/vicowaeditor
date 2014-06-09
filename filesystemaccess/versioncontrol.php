<?php
	# Protect against web entry
	if (!defined('VICOWA')) 
	{
		exit;
	}
    
    require_once(dirname(__FILE__) . '/../userhandling/php/encryption.php');
    
    
    putenv('PATH=' . getenv('PATH') . PATH_SEPARATOR . GIT_PATH . '/bin');    
    putenv('LD_LIBRARY_PATH=' . getenv('LD_LIBRARY_PATH') . PATH_SEPARATOR . GIT_PATH . '/lib');
    putenv('GIT_EXEC_PATH='  . GIT_PATH . '/libexec/git-core');

    $JSONData = null;
    $IsPost = false;
    $IsHandled = false;

	if (isset($_POST['json']))
	{
		$JSONData = json_decode($_POST['json']);
        
        $IsPost = true;
        $page = (isset($_POST['page'])) ? intval($_POST['page']) : 1;
        $records_per_page = (isset($_POST['records_per_page'])) ? intval($_POST['records_per_page']) : -1;
	}
    else if (isset($_GET['json']))
    {
    	$JSONData = json_decode($_GET['json']);
        $page = (isset($_GET['page'])) ? intval($_GET['page']) : 1;
        $records_per_page = (isset($_GET['records_per_page'])) ? intval($_GET['records_per_page']) : -1;
    }

	$data = (isset($JSONData->text)) ? $JSONData->text : null;
	$action = (isset($JSONData->action)) ? trim(strtolower($JSONData->action)) : null;
    $actionid = (isset($JSONData->id)) ? $JSONData->id : -1;
	$result = array();
    
    // all actions that modify something have to be send by POST
    if ($IsPost)
    {
        switch ($action)
    	{
            case "checkin": // checkin all changes since the last checkin
            {
                $IsHandled = true;
                // shell execute here
                $output = shell_exec('cd ' . DEVELOP . '; git add . && git commit --author="Rodney Draaisma <rodneydraaisma@vicowa.com>" -a -m "test" 2>&1');
    
                $result = array("action" => $action, "id" => $actionid, "result" => $output);
                // - copy the production branch file to the archive
                // - copy the develop branch file to the production branch
            }
            break;
            case "publishall": // will publish all changes to the production branch, this will be a multi step process where each step will return a result to the client
            {
                function EncodeResults($p_Data)
                {
                    $Data = json_encode($p_Data);
        		    $Encryptor = new CEncryptDecrypt("Simple encryption key to be used with publish all", "vicowa");
                    return $Encryptor->Encrypt($Data);
                }
                
                function DecodeResults($p_Data)
                {
            		$Encryptor = new CEncryptDecrypt("Simple encryption key to be used with publish all", "vicowa");
            		$Data = $Encryptor->Decrypt($p_Data);
                    return json_decode($Data);
                }
                
                $Errors = false;
                $Summary = (isset($JSONData->description) && $JSONData->description != "") ? $JSONData->description : "Code changes"; 
                $ServerResults = (isset($JSONData->serverresult)) ? DecodeResults($JSONData->serverresult) : (object) array("step" => 1, "errors" => false);

                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $ServerResults, "serverstatus" => "error", "progresstext" => "No valid step..."); // intermediate result 1
                
                switch ($ServerResults->step)
                {
                    case 1: 
                    {
                        // first test if the production branch has any changes
                        $output = shell_exec('cd ' . PRODUCTION . '; git status --porcelain -z --untracked-files=all --ignored 2>&1');
                        $Count = ($output) ? count(array_filter(explode("\0", $output))) : 0;
    
                        if ($Count > 0)
                        {
                            $ServerResults->step = 2;
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => $Count . " changes detected in the production branch\nChecking in production branch changes ... "); // intermediate result 1
                        }
                        else
                        {
                            $ServerResults->step = 4;
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "No changes detected in the production branch.\nPull pending files into development branch ..."); // intermediate result 1
                        }
                    }
                    break;
                    case 2:
                    {
                        // checkin all changes made to the production branch (to prevent data loss in the user data)
                        $output = shell_exec('cd ' . PRODUCTION . '; git add . && git commit --author="Rodney Draaisma <rodneydraaisma@vicowa.com>" -a -m "User data changes" 2>&1');

                        if ($output)
                        {
                            $output = preg_replace('/Your name and email address[^\0]*you@example.com>\'/i', "", $output);
                            
                            if (preg_match('/\d+\s+files changed/i', $output))
                            {
                                $ServerResults->step = 3;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Production files checked in.\nPush checked in files into main depository ...");
                            }
                            else
                            {
                                $ServerResults->errors = true;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Failed to check-in production files.");
                            }
                        }
                        else
                        {
                            $ServerResults->step = 3;
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Production files checked in.\nPush checked in files into main depository ...");
                        }
                    }
                    break;
                    case 3:
                    {
                        if (!$ServerResults->errors)
                        {
                            // push production checkin to the main repository
                            $output = shell_exec('cd ' . PRODUCTION . '; git push vicowa 2>&1');
                            
                            if (!$output || !preg_match('/To.*vicowa-repository/i', $output))
                            {
                                $ServerResults->errors = true;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Failed to push files to main depository.");
                            }
                            else
                            {
                                $ServerResults->step = 4;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Production files where pushed to the main repository.\nPull pending files into development branch ...");
                            }
                        }
                        else
                        {
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Previous action failed, cannot continue.");
                        }
                    }
                    break;
                    case 4:
                    {
                        if (!$ServerResults->errors)
                        {
                            // pull any pending data into the development branch
                            $output = shell_exec('cd ' . DEVELOP . '; git pull vicowa 2>&1');
        
                            if ($output && preg_match('/\d+\s+files changed/i', $output))
                            {
                                $ServerResults->step = 5;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Pending files where pulled from the main repository.\nCheck if there are development files that need to be checked in ...");
                            }
                            else if ($output && preg_match('/Already up-to-date/i', $output))
                            {
                                $ServerResults->step = 5;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "No changed files where found on the main repository.\nCheck if there are development files that need to be checked in ...");
                            }
                            else
                            {
                                $ServerResults->errors = true;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Failed to retrieve files from the main repository.");
                            }
                        }
                        else
                        {
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Previous action failed, cannot continue.");
                        }
                    }
                    break;
                    case 5:
                    {
                        // test if the development branch has any changes
                        $output = shell_exec('cd ' . DEVELOP . '; git status --porcelain -z --untracked-files=all --ignored 2>&1');
                        $Count = ($output) ? count(array_filter(explode("\0", $output))) : 0;
    
                        if ($Count > 0)
                        {
                            $ServerResults->step = 6;
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => $Count . " changed files detected in the development branch\nChecking in development branch changes ... "); // intermediate result 1
                        }
                        else
                        {
                            $ServerResults->step = 8;
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "No changed files detected in the development branch.\nPull pending files into production branch ..."); // intermediate result 1
                        }
                    }
                    break;
                    case 6:
                    {
                        // checkin all changes made to the development branch
                        $output = shell_exec('cd ' . DEVELOP . '; git add . && git commit --author="Rodney Draaisma <rodneydraaisma@vicowa.com>" -a -m "' . $Summary . '" 2>&1');

                        if ($output)
                        {
                            $output = preg_replace('/Your name and email address[^\0]*you@example.com>\'/i', "", $output);
                            
                            if (preg_match('/\d+\s+files changed/i', $output))
                            {
                                $ServerResults->step = 7;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Development files checked in.\nPush checked in files into main depository ...");
                            }
                            else
                            {
                                $ServerResults->errors = true;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Failed to check-in development files.");
                            }
                        }
                        else
                        {
                            $ServerResults->step = 7;
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Development files checked in.\nPush checked in files into main depository ...");
                        }
                    }
                    break;
                    case 7:
                    {
                        if (!$ServerResults->errors)
                        {
                            // push development checkin to the main repository
                            $output = shell_exec('cd ' . DEVELOP . '; git push vicowa 2>&1');
                            
                            if (!$output || !preg_match('/To.*vicowa-repository/i', $output))
                            {
                                $ServerResults->errors = true;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Failed to push development files to main depository.");
                            }
                            else
                            {
                                $ServerResults->step = 8;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "continue", "progresstext" => "Development files where pushed to the main repository.\nPull pending files into production branch ...");
                            }
                        }
                        else
                        {
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Previous action failed, cannot continue.");
                        }
                    }
                    break;
                    case 8:
                    {
                        if (!$ServerResults->errors)
                        {
                            // pull any pending data into the development branch
                            $output = shell_exec('cd ' . PRODUCTION . '; git pull vicowa 2>&1');
        
                            if ($output && preg_match('/\d+\s+files changed/i', $output))
                            {
                                $ServerResults->step = 5;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "complete", "progresstext" => "Pending files where pulled from the main repository.\nPublishing completed.");
                            }
                            else if ($output && preg_match('/Already up-to-date/i', $output))
                            {
                                $ServerResults->step = 5;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "complete", "progresstext" => "No changed files were found in the main repository.\nPublishing completed.");
                            }
                            else
                            {
                                $ServerResults->errors = true;
                                $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Failed to retrieve files from the main repository.");
                            }
                        }
                        else
                        {
                            $result = array("serverresult" => EncodeResults($ServerResults), "action" => $action, "description" => $Summary, "id" => $actionid, "result" => $output, "serverstatus" => "error", "progresstext" => "Previous action failed, cannot continue.");
                        }
                    }
                    break;
                }

                $IsHandled = true;
            }
            break;
            case "revert":
            {
                $IsHandled = true;

                $Files = isset($JSONData->files) ? $JSONData->files : null;
                $Results = array();
                
                if ($Files !== null)
                {
                    foreach ($Files as $FileName) 
                    {
                        // shell execute here
                        $output = "";
//                        $output = shell_exec('cd ' . DEVELOP . '; git checkout -- ' . $FileName . ' 2>&1');
                        $Results = array_push($Results, array($FileName => $output));
                    }
                    $result = array("action" => $action, "id" => $actionid, "result" => $Results);
                }
                else
                {
                    $result = array("action" => $action, "id" => $actionid, "result" => array("error" => "no files specified"));
                }
            }
            break;
    	}
    }

    // passive actions can be send using either POST or GET
    if (!$IsHandled)
    {    
        switch ($action)
        {
            case 'status':
            {
                $IsHandled = true;
                // shell execute here
                $output = shell_exec('cd ' . DEVELOP . '; git status --porcelain -z --untracked-files=all --ignored 2>&1');
    
                $Changes = array_filter(explode("\0", $output));
                $ChangedItems = array();
                
                foreach($Changes as $Change)
                {
                    $DataRenameMatched = preg_match('/^(R)([ MDAU\?\!])\s+((?:"(?:\\["\\]|[^"])*(?:"|$)|\S)+)\s+->\s+((?:"(?:\\["\\]|[^"])*(?:"|$)|\S)+)/', $Change, $MatchDataRename);
                    $DataMatched = preg_match('/^([ MADUC\?\!])([ MADU\?\!])\s+((?:"(?:\\["\\]|[^"])*(?:"|$)|\S)+)/', $Change, $MatchData);

                    if ($DataRenameMatched || $DataMatched)
                    {
                        $Info = (Object) array ( "remote" => "unchanged", "local" => "unchanged", "path" => "", "renamedfrom" => "");

                        if ($DataRenameMatched)
                        {
                            $Info->remote = "renamed";
                            $Info->renamedfrom = $MatchDataRename['4'];
                            $MatchData = $MatchDataRename;
                        }
                        
                        $Info->path = $MatchData[3];
                        
                        switch ($MatchData[1])
                        {
                            case ' ': $Info->remote = "unchanged"; break;
                            case 'M': $Info->remote = "modified"; break;
                            case 'A': $Info->remote = "added"; break;
                            case 'D': $Info->remote = "deleted"; break;
                            case 'C': $Info->remote = "copied"; break;
                            case 'U': $Info->remote = "unmerged"; break;
                            case '?': $Info->remote = "untracked"; break;
                            case '!': $Info->remote = "ignored"; break;
                        }
                        switch ($MatchData[2])
                        {
                            case ' ': $Info->local = "unchanged"; break;
                            case 'M': $Info->local = "modified"; break;
                            case 'A': $Info->local = "added"; break;
                            case 'D': $Info->local = "deleted"; break;
                            case 'U': $Info->local = "unmerged"; break;
                            case '?': $Info->local = "untracked"; break;
                            case '!': $Info->local = "ignored"; break;
                        }
                        
                        $ChangedItems[] = $Info;
                    }
                }
    
                $result = array("action" => $action, "id" => $actionid, "result" => $ChangedItems);
            }
            break;
            case 'listcommits':
            {
                $IsHandled = true;
                
                // first retrieve the total count of commits
                $output = shell_exec('cd ' . DEVELOP . '; git rev-list HEAD --count 2>&1');
                $TotalCommits = intval($output);
                $TotalPages = 1;
                
                if ($records_per_page >= 1)
                {
                    $TotalPages = intval($TotalCommits/$records_per_page) + 1;

                    $StartIndex = ($page - 1) * $records_per_page;

                    if ($StartIndex != 0)
                    {   
                        
                        $Command = 'cd ' . DEVELOP . '; git log -n1 --pretty="format:%H%n%aN%n%ai%n%ar%n%s%n%n--end_of_commit_info--" --all --skip=' . ($StartIndex + 1) . ' --max-count=' . $records_per_page . ' 2>&1';
                    }
                    else
                    {
                        $Command = 'cd ' . DEVELOP . '; git log -n1 --pretty="format:%H%n%aN%n%ai%n%ar%n%s%n%n--end_of_commit_info--"  --all --max-count=' . $records_per_page . ' 2>&1';
                    }
                }
                else
                {
                    $page = 1;
                    // shell execute here
                    $Command = 'cd ' . DEVELOP . '; log -n1 --pretty="format:%H%n%aN%n%ai%n%ar%n%s%n%n--end_of_commit_info--"  --all 2>&1';
                }
                $output = shell_exec($Command);
                
                $CommitList = explode("\n\n--end_of_commit_info--\n", $output);
                
                $Results = array();
                
                foreach ($CommitList as $CommitItem)
                {
                    if ($CommitItem)
                    {
                        $TempItems = explode("\n", $CommitItem);
                        $ResultItems = array("hash" => $TempItems[0], "author_name_mailmap" => $TempItems[1], "author_date_ISO8601" => $TempItems[2], "author_date_relative" => $TempItems[3], "subject" => $TempItems[4]);

                        $Results[] = $ResultItems;
                    }
                }
                
                $result = array("action" => $action, "id" => $actionid, "result" => $Results, "totalcommits" => $TotalCommits, "totalpages" => $TotalPages, "page" => $page);
            }
            break;
            case 'listcommittedfiles' :
            {
                $IsHandled = true;
                
                if (isset($JSONData->hash))
                {
                    $Items = null;
                    $output = shell_exec('cd ' . DEVELOP . '; git diff-tree --no-commit-id --name-only -r ' . $JSONData->hash . ' 2>&1');
                    if ($output)
                    {
                        $Items = array_filter(explode("\n", $output));
                    }
                    
                    $Files = array();
                    foreach($Items as $File)
                    {
                        $Files[] = array("path" => $File);
                    }
                    
                    $result = array("action" => $action, "id" => $actionid, "result" => $Files, "totalfiles" => count($Files), "totalpages" => 1, "page" => 1);
                }
                else
                {
                    $result = array("error" => "missing hash: " . $action);
                }
            }
            break;
            case 'filegetrevisions':
            {
                if (isset($JSONData->path))
                {
                    // get the file revisions sha numbers for this file
                    $command = 'cd ' . DEVELOP . '; git --no-pager log --follow --no-decorate --pretty="format:%H%n%aN%n%ai%n%ar%n%s%n%n--end_of_commit_info--" "' . $JSONData->path . '" 2>&1';
                    $output = shell_exec($command);
                    
                    $RevisionsList = array_filter(explode("\n\n--end_of_commit_info--\n", $output));
                    
                    $Results = array();
                    
                    $Counter = count($RevisionsList);
                    foreach ($RevisionsList as $RevisionInfo)
                    {
                        $TempItems = explode("\n", $RevisionInfo);
                        $ResultItems = array("rev" => $Counter, "hash" => $TempItems[0], "author_name_mailmap" => $TempItems[1], "author_date_ISO8601" => $TempItems[2], "author_date_relative" => $TempItems[3], "subject" => $TempItems[4]);

                        $Results[] = $ResultItems;
                        $Counter--;
                    }
                    
                    $result = array("action" => $action, "id" => $actionid, "result" => $Results);
                }                
                else
                {
                    $result = array("error" => "missing path: " . $action);
                }
            }
            break;
            case 'filegetrevisionscontent':
            {
                if (isset($JSONData->path) && isset($JSONData->revisions))
                {
                    $Results = array();
                    $basecommand = 'cd ' . DEVELOP . '; git --no-pager show ';
                    foreach($JSONData->revisions as $Revision)
                    {
                        if ($Revision !== 0)
                        {
                            $command = $basecommand . $Revision . ':"' . $JSONData->path . '" 2>&1';    
                            $output = shell_exec($command);
                            $Results[] = array("revision" => $Revision, "content" => $output);
                        }
                        else
                        {
                            $output = file_get_contents(DEVELOP . "/" . $JSONData->path);
                            $Results[] = array("revision" => $Revision, "content" => $output);
                        }
                    }
                    
                    $result = array("action" => $action, "id" => $actionid, "result" => $Results);
                }                
                else
                {
                    $result = array("error" => "missing path or revisions: " . $action);
                }
            }
            break;
            case 'commitdetails':
            {
                $IsHandled = true;
                
                if (isset($JSONData->hash))
                {
                    $Hash = $JSONData->hash;

                    $ResultItems = array("hash" => $Hash);
                    $ResultItems["hash_abbr"]               = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%h '  . $Hash . ' 2>&1');
                    $ResultItems["treehash"]                = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%T '  . $Hash . ' 2>&1');
                    $ResultItems["treehash_abbr"]           = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%t '  . $Hash . ' 2>&1');
                    $ResultItems["parenthashes"]            = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%P '  . $Hash . ' 2>&1');
                    $ResultItems["parenthashes_abbr"]       = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%p '  . $Hash . ' 2>&1');
                    $ResultItems["author_name"]             = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%an ' . $Hash . ' 2>&1');
                    $ResultItems["author_name_mailmap"]     = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%aN ' . $Hash . ' 2>&1');
                    $ResultItems["author_email"]            = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ae ' . $Hash . ' 2>&1');
                    $ResultItems["author_email_mailmap"]    = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%aE ' . $Hash . ' 2>&1');
                    $ResultItems["author_date_RFC2822"]     = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%aD ' . $Hash . ' 2>&1');
                    $ResultItems["author_date_relative"]    = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ar ' . $Hash . ' 2>&1');
                    $ResultItems["author_date_UNIX"]        = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%at ' . $Hash . ' 2>&1');
                    $ResultItems["author_date_ISO8601"]     = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ai ' . $Hash . ' 2>&1');
                    $ResultItems["committer_name"]          = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%cn ' . $Hash . ' 2>&1');
                    $ResultItems["committer_name_mailmap"]  = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%cN ' . $Hash . ' 2>&1');
                    $ResultItems["committer_email"]         = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ce ' . $Hash . ' 2>&1');
                    $ResultItems["committer_email_mailmap"] = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%cE ' . $Hash . ' 2>&1');
                    $ResultItems["committer_date_RFC2822"]  = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%cD ' . $Hash . ' 2>&1');
                    $ResultItems["committer_date_relative"] = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%cr ' . $Hash . ' 2>&1');
                    $ResultItems["committer_date_UNIX"]     = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ct ' . $Hash . ' 2>&1');
                    $ResultItems["committer_date_ISO8601"]  = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ci ' . $Hash . ' 2>&1');
                    $ResultItems["refnames"]                = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%d '  . $Hash . ' 2>&1');
                    $ResultItems["encoding"]                = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%e '  . $Hash . ' 2>&1');
                    $ResultItems["subject"]                 = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%s '  . $Hash . ' 2>&1');
                    $ResultItems["subject_sanitized"]       = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%f '  . $Hash . ' 2>&1');
                    $ResultItems["body"]                    = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%b '  . $Hash . ' 2>&1');
                    $ResultItems["body_raw"]                = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%B '  . $Hash . ' 2>&1');
                    $ResultItems["commit_notes"]            = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%N '  . $Hash . ' 2>&1');
                    $ResultItems["reflog_selector"]         = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%gD ' . $Hash . ' 2>&1');
                    $ResultItems["reflog_selector_short"]   = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%gd ' . $Hash . ' 2>&1');
                    $ResultItems["reflog_id_name"]          = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%gn ' . $Hash . ' 2>&1');
                    $ResultItems["reflog_id_name_mailmap"]  = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%gN ' . $Hash . ' 2>&1');
                    $ResultItems["reflog_id_email"]         = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%ge ' . $Hash . ' 2>&1');
                    $ResultItems["reflog_id_email_mailmap"] = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%gE ' . $Hash . ' 2>&1');
                    $ResultItems["reflog_subject"]          = shell_exec('cd ' . DEVELOP . '; git log -n1 --pretty=format:%gs ' . $Hash . ' 2>&1');
                    
                    $result = array("action" => $action, "id" => $actionid, "result" => $ResultItems);
                }
                else
                {
                    $result = array("error" => "missing hash: " . $action);
                }
            }
            break;
            case "publishall": // fall through intentionally
            case "checkin": // this is a post command
            {
                $result = array("error" => "post command used with get: " . $action);
            }
            break;
        	default:
    		{
    			// unknown command
                $result = array("error" => ("Unknown action: " . $action));
    		}
    		break;
    	}
    }	
    echo json_encode($result);
