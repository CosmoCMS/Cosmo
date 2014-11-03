<?php

/**
 * Create a sitemap for search engines
 */

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

$pages = $Cosmo->contentRead();

echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach($pages as $page){
    if($page['published'] === 'Y')
        echo "\t<url>\n\t\t<loc>http://www.". $_SERVER['HTTP_HOST'] . '/' . $page['url'] ."</loc>\n\t</url>\n";
}
echo '</urlset>';

?>