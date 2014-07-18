<?php

require_once 'core/app/initialize.php';

$url = $_GET['url'];

// Get the content for this URL
$page = $Cosmo->contentRead($url);
$blocks = $Cosmo->blockFetchAll($page['type'], $url);
$menus = $Cosmo->menuRead();
$index = file_get_contents('index.php');
// $theme = $Cosmo->settingsRead()['theme']; // Pulls from initialize.php
$template = file_get_contents('themes/' . $theme . '/' . $page['type']);

// Insert the template into the index file
$output = preg_replace('/ng-view(.*?)>/', '>' . $template, $index);
$output = str_replace(" ng-bind-template='{{title}}'>", '>'. $page['title'], $output);
$output = str_replace('{{content}}', $page['description'], $output);
// $output = str_replace('<script src="', '<script src="'. $minifyScripts, $output);
$output = str_replace('<link rel="stylesheet" href="', '<link rel="stylesheet" href="/'. $minifyCSS, $output);
$output = preg_replace('/<\?(.*?)\?>/', '', $output); // Remove PHP code

// Match all 'ng-include' directives with the content
preg_match_all('/ng-include=[\'"][\'"](.*?)[\'"][\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    $output = preg_replace('/ng-include=[\'"][\'"]'. str_replace('/', '\/', $match) .'[\'"][\'"](.*?)>/', '>' . file_get_contents($match), $output);
}

// Match all 'cosmo' directives with the content
preg_match_all('/cosmo=[\'"](.*?)[\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    if($page[$match])
        $output = preg_replace('/cosmo=[\'"]'. $match .'[\'"](.*?)>/', '>' . $page[$match], $output);
    else if($page['extras'][$match])
        $output = preg_replace('/cosmo=[\'"]'. $match .'[\'"](.*?)>/', '>' . $page['extras'][$match], $output);
}

// Match all 'block' directives with the content
preg_match_all('/block=[\'"](.*?)[\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    $blockHTML = '';
    foreach($blocks as $block)
    {
        if($block['area'] == $match)
            $blockHTML .= $block['block'];
    }

    $output = preg_replace('/block=[\'"]'. $match .'[\'"](.*?)>/', '>' . $blockHTML, $output);
}

// Match all 'menu' directives with the content
preg_match_all('/menu=[\'"](.*?)[\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    $menuHTML = '<ul>';
    foreach($menus as $menu)
    {
        if($menu['area'] == $match){
            $menuJSON = json_decode($menu['menu'], true);
            
            foreach($menuJSON as $menu2){
                $menuHTML .= '<li><a href="'. $menu2['url'] .'">'. $menu2['title'];
                foreach($menu2['items'] as $menu3){
                    $menuHTML .= '<li><a href="'. $menu3['url'] .'">'. $menu3['title'];
                    foreach($menu3['items'] as $menu4){
                        $menuHTML .= '<li><a href="'. $menu4['url'] .'">'. $menu4['title']. '</a></li>';
                    }
                    $menuHTML .= "</a></li>";
                }
                $menuHTML .= "</a></li>";
            }
        }
    }
    $menuHTML .= '</ul>';
    
    $output = preg_replace('/menu=[\'"]'. $match .'[\'"](.*?)>/', '>' . $menuHTML, $output);
}

// Match all 'bgimage' directives with the content
preg_match_all('/bgimage=[\'"](.*?)[\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    if($page['extras'][$match])
        $output = preg_replace('/bgimage=[\'"]'. $match .'[\'"](.*?)>/', 'style=\'background:url(' . $page['extras'][$match] .') center no-repeat\'', $output);
}

/*
// Match all 'gallery' directives with the content
preg_match_all('/gallery=[\'"](.*?)[\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    if($page['extras'][$match])
    {
        $imageIDs = explode(',', $page['extras'][$match]);
        $imageHTML = '';
        foreach($imageIDs as $id)
        {
            $imageURL = $Cosmo->fileReadRecord($id)['url'];
            $imageHTML .= '<img src="'. $imageURL .'">';
        }

        $output = preg_replace('/gallery=[\'"]'. $match .'[\'"](.*?)>/', $imageHTML, $output);
    }

}
*/

// Match all 'image' directives with the images
preg_match_all('/image=[\'"](.*?)[\'"]/', $output, $matches);
foreach($matches[1] as $match)
{
    if($page['extras'][$match])
        $output = preg_replace('/image=[\'"]'. $match .'[\'"](.*?)>/', 'src="' . $page['extras'][$match] .'">', $output);
}

// todo: match other directives.

echo $output;

?>