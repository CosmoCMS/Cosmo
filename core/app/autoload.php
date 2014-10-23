<?php

    $host = 'localhost';
    $dbName = 'KAC'; # Database name
    $username = 'JDDunn9';
    $password = 'panther8e';
    $prefix = 'cosmo_'; // e.g. cosmo_
    define('FOLDER', 'KAC/');
    $salt = 'j38fjJ*#jg2';
    $developerMode = false; // Switching this to true prevents minification/combination of JS/CSS files for better error reporting

    $pdo = new PDO("mysql:host=$host;dbname=$dbName;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $username = null;
?>