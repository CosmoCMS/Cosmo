<?php

$host = 'localhost';
$dbName = 'jddunn9_knowledge'; # Database name
$username = 'JDDunn9';
$password = 'panther8e';
$prefix = ''; // e.g. cosmo_
$salt = 'j38fjJ*#jg2';
$developerMode = false; // Switching this to true prevents minification/combination of JS/CSS files for better error reporting

//$pdo = new PDO("mysql:host=$host;dbname=$dbName;charset=utf8", $username, $password);
$pdo = new PDO('mysql:host=localhost;dbname=kauaiher_cosmo;charset=utf8', 'kauaiher_admin', 'xD.Q?e5~t4*c');
$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

?>