<?php
	define("VICOWA", "vicowa");

    $parts = explode("?", $argv[1], 2);
    
    if (count($parts) == 2)
    {
		$queryparts = explode("?", $parts[1]);
		
		foreach($queryparts as $Part)
		{
			$types = explode("|", $Part, 2);
			
			if (count($types) == 2)
			{
				switch($types[0])
				{
					case "get": parse_str($types[1], $_GET); break;
					case "post": parse_str($types[1], $_POST); break;
					case "server": parse_str($types[1], $_SERVER); break;
				}
			}
		}
	}
	
    include($parts[0]);
