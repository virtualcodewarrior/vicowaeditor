<?php

    # Protect against web entry
    if (!defined('VICOWA')) 
	{
		exit;
	}
    
    $NavigationFile = NAVIGATIONFILE;
    $DomainUrl = getDomainUrl();
    
    $Content = file_get_contents(getDomainPath($NavigationFile));
    $Content = filterContent($Content, $Content);
    
    $Data = json_decode($Content);
    
    function OutputPages($PageData)
    {
        global $DomainUrl;

        if ($PageData->href)
        {
            echo '    <url>
        <loc>' . preg_replace("/\%3A/i", ":", implode("/", array_map("rawurlencode", explode("/", $DomainUrl . $PageData->href)))) . '</loc>
    </url>
';
        }
        
        if ($PageData->pages)
        {
            foreach($PageData->pages as $PageInfo)
            {
                OutputPages($PageInfo);
            }
        }
    }
    
    header('Content-type: application/xml');
//    header('Content-type: text/plain'); // for debugging output map as plaintext
    echo '<?xml version="1.0" encoding="UTF-8"?>
    <urlset 
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
';

    OutputPages($Data);
    
    echo '</urlset>';